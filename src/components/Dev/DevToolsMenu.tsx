import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { budgetServices, getMonthYearFromDate } from "../../services/budgetServices";
import { isExpoWebDevToolsEnabled } from "../../utils/devToolsAccess";
import {
  clearZeroPromptSessionCache,
  clearZeroPromptSessionKey,
  getZeroPromptSessionKey,
} from "../../utils/zeroPromptSessionCache";
import {
  formatDateForDisplay,
  getStartOfDay,
  subtractDays,
} from "../../utils/dateUtils";

/**
 * Menu de desenvolvimento (somente Expo web + UID autorizado).
 * Atalho: Ctrl+D
 *
 * "Resetar hoje" = primeira entrada do dia no app:
 * limpa ontem (dia do popup) + hoje, sem mexer em configs.
 */
export const DevToolsMenu = () => {
  const { user, activeCoupleMember } = useAuth();
  const enabled = isExpoWebDevToolsEnabled(user?.id);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!enabled || Platform.OS !== "web") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const key = String(event.key || "").toLowerCase();
      if (!(event.ctrlKey || event.metaKey) || key !== "d") return;
      event.preventDefault();
      setVisible((open) => !open);
      setStatus("");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);

  const resetAsFirstOpenToday = useCallback(async () => {
    if (!user?.id) return;

    const today = getStartOfDay(new Date());
    const yesterday = getStartOfDay(subtractDays(new Date(), 1));

    try {
      setBusy(true);
      setStatus("Resetando como primeira entrada do dia…");

      // Popup da Home pergunta sobre ontem: precisa limpar ontem.
      const yesterdayResult = await budgetServices.resetCalendarDayForDev(
        user.id,
        yesterday,
        activeCoupleMember,
      );
      // Também limpa registros com data de hoje, se houver.
      const todayResult = await budgetServices.resetCalendarDayForDev(
        user.id,
        today,
        activeCoupleMember,
      );

      clearZeroPromptSessionKey(getZeroPromptSessionKey(user.id, yesterday));
      clearZeroPromptSessionKey(getZeroPromptSessionKey(user.id, today));
      clearZeroPromptSessionCache();

      const deleted =
        yesterdayResult.deletedExpenses + todayResult.deletedExpenses;
      setStatus(
        `OK: como se fosse a 1ª vez hoje. Limpou ${formatDateForDisplay(yesterday)} e ${formatDateForDisplay(today)}. ${deleted} gasto(s) apagado(s). Dê F5.`,
      );
    } catch (error: any) {
      console.error("[DEV TOOLS] reset primeira entrada falhou", error);
      setStatus(error?.message || "Falha ao resetar o dia.");
    } finally {
      setBusy(false);
    }
  }, [user?.id, activeCoupleMember]);

  if (!enabled) return null;

  const today = getStartOfDay(new Date());
  const yesterday = getStartOfDay(subtractDays(new Date(), 1));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Dev Tools</Text>
          <Text style={styles.meta}>
            Só o seu usuário · Expo web · Ctrl+D
          </Text>
          <Text style={styles.meta}>
            Configs (notificação, zero auto) permanecem.
          </Text>
          <Text style={styles.meta}>
            Mês {getMonthYearFromDate(today)}
          </Text>

          <TouchableOpacity
            style={styles.actionPrimary}
            disabled={busy}
            onPress={() => void resetAsFirstOpenToday()}
          >
            <Text style={styles.actionTitle}>Resetar hoje</Text>
            <Text style={styles.actionHint}>
              Como se fosse a primeira vez entrando no app hoje. Limpa ontem
              ({formatDateForDisplay(yesterday)}, dia do popup) e hoje
              ({formatDateForDisplay(today)}). Depois dê F5.
            </Text>
          </TouchableOpacity>

          {busy ? (
            <ActivityIndicator color="#B900FF" style={{ marginTop: 8 }} />
          ) : null}
          {status ? <Text style={styles.status}>{status}</Text> : null}

          <TouchableOpacity
            style={styles.close}
            onPress={() => setVisible(false)}
            disabled={busy}
          >
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#171321",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3a2f55",
    padding: 18,
    gap: 10,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
  meta: {
    color: "#9b92b3",
    fontSize: 12,
  },
  actionPrimary: {
    backgroundColor: "#2a1848",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B900FF",
    padding: 12,
    marginTop: 8,
  },
  actionTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  actionHint: {
    color: "#a89bc4",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  status: {
    color: "#c4b5fd",
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  close: {
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#21172D",
  },
  closeText: {
    color: "#fff",
    fontWeight: "600",
  },
});
