import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Detector de saída anormal.
 *
 * Sem coletor externo de crash, o app não deixa rastro quando o sistema o
 * mata (memória, tempo aberto). Este serviço guarda um marcador local com
 * tela atual e batimento a cada 15s. Na abertura seguinte, se o marcador
 * anterior existir e a sessão durou 30s ou mais, grava um relatório em
 * sessionReports: tela aberta, tempo de uso e aparelho. Não guarda texto,
 * token nem dado pessoal além do próprio userId.
 */

const MARKER_KEY = "@visao/session-marker";
const HEARTBEAT_MS = 15_000;
const MIN_REPORT_SECONDS = 30;

type SessionMarker = {
  sessionId: string;
  startedAt: number;
  lastHeartbeatAt: number;
  lastScreen: string;
  userId: string | null;
};

let marker: SessionMarker | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let pendingReport: Omit<SessionMarker, "sessionId"> | null = null;
let started = false;

const persist = async () => {
  if (!marker) return;
  try {
    await AsyncStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch {
    // marcador é diagnóstico; falhar aqui nunca pode travar o app
  }
};

const flushPendingReport = async () => {
  if (!pendingReport || !pendingReport.userId) return;
  const report = pendingReport;
  pendingReport = null;
  try {
    const extra = (Constants.expoConfig?.extra || {}) as Record<string, unknown>;
    void extra;
    await addDoc(collection(db, "sessionReports"), {
      userId: report.userId,
      kind: "unclean-exit",
      startedAt: new Date(report.startedAt),
      lastHeartbeatAt: new Date(report.lastHeartbeatAt),
      approxDurationSec: Math.round(
        (report.lastHeartbeatAt - report.startedAt) / 1000,
      ),
      lastScreen: report.lastScreen || "unknown",
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || "unknown",
      buildNumber:
        Platform.OS === "ios"
          ? Constants.expoConfig?.ios?.buildNumber || "unknown"
          : String(Constants.expoConfig?.android?.versionCode || "unknown"),
      reportedAt: serverTimestamp(),
    });
  } catch (error) {
    if (__DEV__) console.log("[watchdog] relatório não gravado", error);
  }
};

export const startSessionWatchdog = async (): Promise<void> => {
  if (started) return;
  started = true;
  try {
    const raw = await AsyncStorage.getItem(MARKER_KEY);
    if (raw) {
      const previous = JSON.parse(raw) as SessionMarker;
      const durationSec =
        (previous.lastHeartbeatAt - previous.startedAt) / 1000;
      if (durationSec >= MIN_REPORT_SECONDS) {
        pendingReport = previous;
      }
    }
  } catch {
    // primeiro uso ou marcador corrompido: segue sem relatório
  }

  marker = {
    sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    lastScreen: "Login",
    userId: null,
  };
  await persist();
  void flushPendingReport();

  heartbeatTimer = setInterval(() => {
    if (!marker) return;
    marker.lastHeartbeatAt = Date.now();
    void persist();
  }, HEARTBEAT_MS);

  AppState.addEventListener("change", (state) => {
    if (!marker) return;
    marker.lastHeartbeatAt = Date.now();
    if (state === "active") marker.lastScreen = marker.lastScreen || "unknown";
    void persist();
  });
};

export const setWatchdogScreen = (screen: string): void => {
  if (!marker || marker.lastScreen === screen) return;
  marker.lastScreen = screen;
  marker.lastHeartbeatAt = Date.now();
  void persist();
};

export const setWatchdogUser = (userId: string | null): void => {
  if (marker) marker.userId = userId;
  if (pendingReport && userId && !pendingReport.userId) {
    pendingReport.userId = userId;
  }
  void persist();
  void flushPendingReport();
};

export const stopSessionWatchdog = (): void => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};
