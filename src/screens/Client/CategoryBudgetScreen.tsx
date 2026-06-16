/**
 * Tela de acompanhamento diario por titulo personalizado
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import expenseServices from "../../services/expenseServices";
import budgetServices from "../../services/budgetServices";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { getStartOfDay, getEndOfDay, addDays } from "../../utils/dateUtils";
import { useNavigation } from "../../routes/NavigationContext";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";

type DaySummary = {
  date: Date;
  total: number;
};

export const CategoryBudgetScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { user } = useAuth();
  const { navigate, params } = useNavigation() as any;
  const trackedTitle = String(
    params?.trackedTitle || params?.categoryName || "",
  ).trim();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [plannedAmount, setPlannedAmount] = useState<number>(0);
  const [cycleLabel, setCycleLabel] = useState<string>("");
  const [zeroConfirmedDays, setZeroConfirmedDays] = useState<number[]>([]);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [confirmingZero, setConfirmingZero] = useState(false);

  const normalizeTitle = (value?: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");

  const isTrackedDailyCategory = (category?: string) => {
    const normalizedCategory = String(category || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return (
      normalizedCategory === "acompanhamento diario" ||
      normalizedCategory === "gasto acompanhado"
    );
  };

  const getPlannedAmount = (item: any) => {
    const amountCard = Number(item?.amountCard);
    const amountCash = Number(item?.amountCash);
    const hasSplitValues =
      Number.isFinite(amountCard) || Number.isFinite(amountCash);

    if (hasSplitValues) {
      return (
        (Number.isFinite(amountCard) ? amountCard : 0) +
        (Number.isFinite(amountCash) ? amountCash : 0)
      );
    }

    const amount = Number(item?.amount);
    return Number.isFinite(amount) ? amount : 0;
  };

  const loadData = async () => {
    if (!user?.id || !trackedTitle) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const planning = await planningServices.getPlanning(user.id);
      setCycleLabel(getPlanningCycleLabel(planning) || "");

      const targetTitleKey = normalizeTitle(trackedTitle);
      const plannedFromBills = (planning?.bills || [])
        .filter(
          (bill: any) =>
            Boolean(bill?.dailyTracking) &&
            normalizeTitle(bill?.name) === targetTitleKey,
        )
        .reduce((sum: number, bill: any) => {
          return sum + getPlannedAmount(bill);
        }, 0);

      const plannedFromExpectedExpenses = (planning?.expectedExpenses || [])
        .filter(
          (item: any) =>
            Boolean(item?.dailyTracking) &&
            normalizeTitle(item?.source) === targetTitleKey,
        )
        .reduce((sum: number, item: any) => {
          return sum + getPlannedAmount(item);
        }, 0);

      setPlannedAmount(plannedFromBills + plannedFromExpectedExpenses);

      const cycleStartDate = planning?.consumoModeradoCycleStartedAt
        ? getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt))
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

      // Sem ciclo definido no planejamento, a janela só era "hoje" e gastos passados
      // (ou em cartão) pareciam não contar; usa o mês civil corrente como fallback.
      let start: Date;
      let end: Date;
      if (!cycleStartDate && !cycleEndDate) {
        start = getStartOfDay(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        end = getEndOfDay(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
      } else {
        start = cycleStartDate || getStartOfDay(today);
        end = cycleEndDate || getEndOfDay(today);
      }

      const expenses = await expenseServices.getExpenses(user.id, {
        startDate: start,
        endDate: end,
      });

      const filteredExpenses = expenses.filter((exp) => {
        if (!isTrackedDailyCategory((exp as any)?.category)) return false;
        return normalizeTitle(exp.description) === targetTitleKey;
      });

      const dayMap = new Map<string, number>();
      let cursor = getStartOfDay(start);
      const lastDay = getStartOfDay(end);
      while (cursor <= lastDay) {
        dayMap.set(cursor.toDateString(), 0);
        cursor = addDays(cursor, 1);
      }

      filteredExpenses.forEach((exp) => {
        const expDate = new Date(exp.date);
        const key = getStartOfDay(expDate).toDateString();
        const prev = dayMap.get(key) ?? 0;
        const value =
          typeof exp.value === "number"
            ? exp.value
            : parseFloat(String(exp.value)) || 0;
        dayMap.set(key, prev + value);
      });

      const list: DaySummary[] = Array.from(dayMap.entries()).map(
        ([key, value]) => ({ date: new Date(key), total: value }),
      );

      setDays(list);

      const budget = await budgetServices.getCurrentBudget(user.id);
      const normalZeroDays = (budget?.zeroConfirmedDays || []).map((day) =>
        Number(day),
      );
      const noRankingZeroDays = (budget?.zeroConfirmedDaysNoRanking || []).map(
        (day) => Number(day),
      );
      setZeroConfirmedDays(
        Array.from(new Set([...normalZeroDays, ...noRankingZeroDays])).sort(
          (a, b) => a - b,
        ),
      );
    } catch (error) {
      console.error("❌ [CATEGORY BUDGET] Erro ao carregar dados:", error);
      Alert.alert("Erro", "Não foi possível carregar o acompanhamento agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    loadData();
  }, [user?.id, trackedTitle]);

  const daysInCycle = days.length > 0 ? days.length : 1;
  const totalSpent = useMemo(
    () => days.reduce((sum, item) => sum + item.total, 0),
    [days],
  );
  const remainingToSpend = Math.max(0, plannedAmount - totalSpent);
  const overPlannedAmount = Math.max(0, totalSpent - plannedAmount);
  const actualDailyAverage = days.length > 0 ? totalSpent / days.length : 0;
  const hasData = days.some((item) => item.total > 0);

  const performanceIndicator = (() => {
    if (!hasData) {
      return {
        label: "Sem lancamentos",
        detail: "Ainda nao existem gastos lancados para este acompanhamento.",
        color: "#999",
        icon: "information-circle-outline" as const,
      };
    }

    return {
      label: "Em acompanhamento",
      detail: "Continue registrando para acompanhar sua media diaria.",
      color: "#c084fc",
      icon: "analytics" as const,
    };
  })();

  const handleOpenNoRecordActions = (date: Date) => {
    const label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    setZeroConfirmDayLabel(label);
    setZeroConfirmDate(date);
    setZeroConfirmVisible(true);
  };

  const handleConfirmZero = async () => {
    if (!user?.id || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await budgetServices.confirmZeroExpenseDayNoRanking(
        user.id,
        zeroConfirmDate,
      );

      const day = zeroConfirmDate.getDate();
      setZeroConfirmedDays((previous) =>
        Array.from(new Set([...previous, day])).sort((a, b) => a - b),
      );
      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
    } catch (error) {
      console.error("❌ [CATEGORY BUDGET] Erro ao confirmar zero:", error);
      Alert.alert("Erro", "Não foi possível confirmar o zero agora.");
    } finally {
      setConfirmingZero(false);
    }
  };

  const handleConfirmExpense = async (amount: number) => {
    if (!user?.id || !zeroConfirmDate || !trackedTitle) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await expenseServices.createExpense(user.id, {
        value: amount,
        description: trackedTitle,
        date: zeroConfirmDate,
        category: "Acompanhamento Diário",
        paymentMethod: "other",
      });

      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      await loadData();
      Alert.alert("Sucesso", "Gasto registrado com sucesso.");
    } catch (error) {
      console.error("❌ [CATEGORY BUDGET] Erro ao registrar gasto:", error);
      Alert.alert("Erro", "Não foi possível registrar o gasto agora.");
    } finally {
      setConfirmingZero(false);
    }
  };

  if (loading) {
    return (
      <Layout
        title="Acompanhamento Diario"
        showBackButton={false}
        showSidebar={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando acompanhamento...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title={trackedTitle || "Acompanhamento"}
      showBackButton={false}
      showSidebar={true}
    >
      <ScrollView style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Ionicons name="wallet-outline" size={64} color="#8c52ff" />
            <Text style={styles.title}>{trackedTitle}</Text>
            <Text style={styles.subtitle}>
              Acompanhe os gastos diarios desse titulo personalizado
            </Text>
            {cycleLabel ? (
              <Text style={styles.cycleLabel}>{cycleLabel}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Quanto falta no ciclo</Text>
            <View style={styles.inputContainerReadOnly}>
              <Text style={styles.readOnlyBudgetValue}>
                {formatCurrency(remainingToSpend)}
              </Text>
            </View>
            {overPlannedAmount > 0 && (
              <Text style={styles.overPlannedText}>
                Você passou {formatCurrency(overPlannedAmount)} do planejado.
              </Text>
            )}
            <Text style={styles.helperText}>
              Cálculo: gasto esperado do ciclo menos total gasto até agora.
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Media diaria:</Text>
              <Text style={styles.infoValue}>
                {formatCurrency(actualDailyAverage)}
              </Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#8c52ff" />
              <Text style={styles.statLabel}>Dias do ciclo</Text>
              <Text style={styles.statValue}>{daysInCycle}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#8c52ff" />
              <Text style={styles.statLabel}>Total gasto</Text>
              <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="analytics" size={24} color="#8c52ff" />
              <Text style={styles.statLabel}>Media real/dia</Text>
              <Text style={styles.statValue}>
                {formatCurrency(actualDailyAverage)}
              </Text>
            </View>
          </View>

          <View style={styles.performanceCard}>
            <View style={styles.performanceHeader}>
              <Ionicons
                name={performanceIndicator.icon}
                size={22}
                color={performanceIndicator.color}
              />
              <Text
                style={[
                  styles.performanceTitle,
                  { color: performanceIndicator.color },
                ]}
              >
                {performanceIndicator.label}
              </Text>
            </View>
            <Text style={styles.performanceDetail}>
              {performanceIndicator.detail}
            </Text>
          </View>

          <View style={styles.daysCard}>
            <View style={styles.daysHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>📅 Gastos por dia</Text>
                <Text style={styles.cardSubtitle}>
                  Detalhamento dos gastos deste acompanhamento no ciclo atual
                </Text>
              </View>
            </View>

            <View style={styles.daysList}>
              {days.map((daySummary) => {
                const day = daySummary.date.getDate();
                const isZeroConfirmed = zeroConfirmedDays.includes(day);

                return (
                  <View
                    key={daySummary.date.toISOString()}
                    style={[
                      styles.dayRow,
                      isZeroConfirmed && styles.dayRowZeroConfirmed,
                    ]}
                  >
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayNumber}>
                        {daySummary.date.toLocaleDateString("pt-BR", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </Text>
                      {daySummary.total > 0 ? (
                        <Text style={styles.dayExpense}>
                          {formatCurrency(daySummary.total)}
                        </Text>
                      ) : !isZeroConfirmed ? (
                        <Text style={styles.dayEmpty}>
                          Sem gasto registrado
                        </Text>
                      ) : (
                        <View style={styles.zeroConfirmedBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#8c52ff"
                          />
                          <Text style={styles.zeroConfirmedText}>
                            Zero confirmado
                          </Text>
                        </View>
                      )}
                    </View>

                    {daySummary.total === 0 && !isZeroConfirmed ? (
                      <TouchableOpacity
                        style={styles.alertIconButton}
                        onPress={() =>
                          handleOpenNoRecordActions(daySummary.date)
                        }
                      >
                        <Ionicons
                          name="alert-circle"
                          size={24}
                          color="#ff4d6d"
                        />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.dayAmount}>
                        {formatCurrency(daySummary.total)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>

            {!days.length ? (
              <Text style={styles.emptyText}>
                Nenhum gasto encontrado para este acompanhamento no ciclo atual.
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
      <ZeroPlanilhaConfirmModal
        visible={zeroConfirmVisible}
        dayLabel={zeroConfirmDayLabel}
        loading={confirmingZero}
        onConfirmZero={handleConfirmZero}
        onConfirmExpense={handleConfirmExpense}
        onCancel={() => {
          if (confirmingZero) return;
          setZeroConfirmVisible(false);
          setZeroConfirmDate(null);
        }}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
  content: {
    padding: 16,
    gap: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 4,
  },
  cycleLabel: {
    marginTop: 10,
    color: "#b89aff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#999",
    marginBottom: 0,
  },
  inputContainerReadOnly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  readOnlyBudgetValue: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
  },
  helperText: {
    fontSize: 12,
    color: "#999",
    marginTop: 10,
    lineHeight: 18,
  },
  overPlannedText: {
    marginTop: 10,
    color: "#ff4d6d",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  infoLabel: {
    fontSize: 14,
    color: "#999",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8c52ff",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  statCardWarning: {
    borderColor: "#ff4d6d",
    backgroundColor: "#2a1a1a",
  },
  statLabel: {
    fontSize: 10,
    color: "#999",
    marginTop: 4,
    textAlign: "center",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 4,
    textAlign: "center",
  },
  statValueWarning: {
    color: "#ff4d6d",
  },
  performanceCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    gap: 8,
  },
  performanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  performanceTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  performanceDetail: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
  },
  performanceMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  performanceMetaLabel: {
    color: "#aaa",
    fontSize: 13,
  },
  performanceMetaValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  daysCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  daysHeaderRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  dayRowZeroConfirmed: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderColor: "rgba(76, 175, 80, 0.45)",
  },
  dayInfo: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  dayExpense: {
    fontSize: 12,
    color: "#8c52ff",
    marginTop: 2,
  },
  dayEmpty: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  dayAmount: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "700",
  },
  zeroConfirmedBadge: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76, 175, 80, 0.18)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zeroConfirmedText: {
    fontSize: 11,
    color: "#8CF397",
    fontWeight: "700",
  },
  alertIconButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
});

export default CategoryBudgetScreen;
