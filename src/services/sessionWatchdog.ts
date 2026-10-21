import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform, type AppStateStatus, type NativeEventSubscription } from "react-native";
import Constants from "expo-constants";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  attachReportUser,
  classifyPreviousSession,
  pushBreadcrumb,
  reportReadyToSend,
  sameReport,
  sanitizeDiagnosticText,
  type AppPresence,
  type PendingSessionReport,
} from "../utils/sessionDiagnostics";

/**
 * Detector de saída anormal.
 *
 * O marcador local sobrevive ao encerramento do processo. O relatório anterior
 * permanece pendente até o Firestore confirmar a gravação autenticada.
 */

const MARKER_KEY = "@visao/session-marker";
const PENDING_KEY = "@visao/session-pending-report";
const HEARTBEAT_MS = 5_000;
const MIN_REPORT_SECONDS = 30;

type SessionMarker = PendingSessionReport & { sessionId: string };

type ErrorUtilsHost = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
};

let marker: SessionMarker | null = null;
let pendingReport: PendingSessionReport | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let started = false;
let flushing = false;
let globalHandlerInstalled = false;

const asPresence = (state: AppStateStatus | null | undefined): AppPresence =>
  state === "active" || state === "background" || state === "inactive"
    ? state
    : "unknown";

const persistMarker = async () => {
  if (!marker) return;
  try {
    await AsyncStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch {
    // diagnóstico nunca pode derrubar o app
  }
};

const persistPending = async () => {
  try {
    if (!pendingReport) {
      await AsyncStorage.removeItem(PENDING_KEY);
      return;
    }
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pendingReport));
  } catch {
    // mantém a cópia em memória para a próxima tentativa
  }
};

const remember = (operation: string, screen = marker?.lastScreen || "unknown") => {
  if (!marker) return;
  marker.breadcrumbs = pushBreadcrumb(marker.breadcrumbs, {
    at: Date.now(),
    screen,
    appState: marker.appState,
    operation,
  });
};

const flushPendingReport = async () => {
  if (flushing || !reportReadyToSend(pendingReport)) return;
  flushing = true;
  const report = pendingReport;
  try {
    await addDoc(collection(db, "sessionReports"), {
      userId: report.userId,
      kind: classifyPreviousSession(report),
      startedAt: new Date(report.startedAt),
      lastHeartbeatAt: new Date(report.lastHeartbeatAt),
      approxDurationSec: Math.max(
        0,
        Math.round((report.lastHeartbeatAt - report.startedAt) / 1000),
      ),
      lastScreen: report.lastScreen || "unknown",
      appState: report.appState,
      maxLagMs: report.maxLagMs || 0,
      lagEvents: report.lagEvents || 0,
      breadcrumbs: report.breadcrumbs.slice(-20),
      errorMessage: sanitizeDiagnosticText(report.renderError || report.jsError || ""),
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version || "unknown",
      buildNumber:
        Platform.OS === "ios"
          ? Constants.expoConfig?.ios?.buildNumber || "unknown"
          : String(Constants.expoConfig?.android?.versionCode || "unknown"),
      reportedAt: serverTimestamp(),
    });
    if (sameReport(pendingReport, report)) {
      pendingReport = null;
      await persistPending();
    }
  } catch (error) {
    const code = String((error as { code?: string })?.code || "");
    if (code.includes("permission-denied")) {
      // Relatório de outra conta neste aparelho: nunca será aceito.
      // Descarta para não bloquear os relatórios seguintes.
      pendingReport = null;
      await persistPending();
    }
  } finally {
    flushing = false;
  }
};

const queuePreviousSession = (previous: SessionMarker) => {
  const durationSec = (previous.lastHeartbeatAt - previous.startedAt) / 1000;
  const hasError = Boolean(previous.jsError || previous.renderError);
  if (durationSec < MIN_REPORT_SECONDS && !hasError) return;
  if (pendingReport && pendingReport.startedAt >= previous.startedAt) return;
  const { sessionId: _sessionId, ...report } = previous;
  pendingReport = {
    ...report,
    jsError: sanitizeDiagnosticText(report.jsError || "") || null,
    renderError: sanitizeDiagnosticText(report.renderError || "") || null,
    breadcrumbs: Array.isArray(report.breadcrumbs) ? report.breadcrumbs.slice(-20) : [],
  };
};

export const installGlobalErrorHandler = (): void => {
  if (globalHandlerInstalled) return;
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsHost }).ErrorUtils;
  if (!utils?.setGlobalHandler) return;
  globalHandlerInstalled = true;
  const previous = utils.getGlobalHandler?.();
  utils.setGlobalHandler((error, isFatal) => {
    recordJsError(error);
    previous?.(error, isFatal);
  });
};

export const recordJsError = (error: unknown): void => {
  const message = sanitizeDiagnosticText(
    error instanceof Error ? error.message : error,
  );
  if (!message || !marker) return;
  marker.jsError = message;
  marker.lastHeartbeatAt = Date.now();
  remember("js-error");
  void persistMarker();
};

export const recordRenderError = (error: unknown): void => {
  const message = sanitizeDiagnosticText(
    error instanceof Error ? error.message : error,
  );
  if (!message || !marker) return;
  marker.renderError = message;
  marker.lastHeartbeatAt = Date.now();
  remember("render-error");
  void persistMarker();
};

export const startSessionWatchdog = async (): Promise<void> => {
  installGlobalErrorHandler();
  if (started) return;
  started = true;
  try {
    const storedPending = await AsyncStorage.getItem(PENDING_KEY);
    if (storedPending) pendingReport = JSON.parse(storedPending) as PendingSessionReport;
    const raw = await AsyncStorage.getItem(MARKER_KEY);
    if (raw) queuePreviousSession(JSON.parse(raw) as SessionMarker);
    await persistPending();
  } catch {
    pendingReport = null;
  }

  marker = {
    sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
    lastHeartbeatAt: Date.now(),
    lastScreen: "Login",
    userId: null,
    appState: asPresence(AppState.currentState),
    breadcrumbs: [],
    jsError: null,
    renderError: null,
    maxLagMs: 0,
    lagEvents: 0,
  };
  remember("start");
  await persistMarker();

  let lastTickAt = Date.now();
  heartbeatTimer = setInterval(() => {
    if (!marker) return;
    const now = Date.now();
    const lag = now - lastTickAt - HEARTBEAT_MS;
    lastTickAt = now;
    if (lag > 1000) {
      marker.maxLagMs = Math.max(marker.maxLagMs || 0, lag);
      marker.lagEvents = (marker.lagEvents || 0) + 1;
      remember(`lag:${Math.round(lag / 1000)}s`);
    }
    marker.lastHeartbeatAt = now;
    void persistMarker();
  }, HEARTBEAT_MS);

  appStateSubscription = AppState.addEventListener("change", (state) => {
    if (!marker) return;
    marker.appState = asPresence(state);
    marker.lastHeartbeatAt = Date.now();
    remember("appstate");
    void persistMarker();
  });
};

export const recordWatchdogEvent = (operation: string): void => {
  if (!marker) return;
  marker.lastHeartbeatAt = Date.now();
  remember(operation);
  void persistMarker();
};

export const setWatchdogScreen = (screen: string): void => {
  if (!marker || marker.lastScreen === screen) return;
  marker.lastScreen = screen;
  marker.lastHeartbeatAt = Date.now();
  remember("nav", screen);
  void persistMarker();
};

export const setWatchdogUser = (userId: string | null): void => {
  if (marker) {
    marker.userId = userId;
    remember(userId ? "auth" : "signout");
    void persistMarker();
  }
  const nextPending = attachReportUser(pendingReport, userId);
  if (nextPending !== pendingReport) {
    pendingReport = nextPending;
    void persistPending();
  }
  void flushPendingReport();
};

export const stopSessionWatchdog = (): void => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
  started = false;
};
