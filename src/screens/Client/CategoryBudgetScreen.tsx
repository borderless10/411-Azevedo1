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
import budgetServices, {
  normalizeTrackedTitleKey,
} from "../../services/budgetServices";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  filterTrackedExpensesForTitle,
  normalizeExpenseTitleKey,
} from "../../utils/expenseScopeUtils";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import {
  getStartOfDay,
  getEndOfDay,
  addDays,
  formatDateForDisplay,
} from "../../utils/dateUtils";
import { useNavigation } from "../../routes/NavigationContext";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";
import ConfettiCelebration from "../../components/ui/ConfettiCelebration";
import { Expense } from "../../types/expense";

type DaySummary = {
  date: Date;
  total: number;
};

export const CategoryBudgetScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { user } = useAuth();
  const { navigate, params, currentScreen } = useNavigation() as any;
  const trackedTitle = String(
    params?.trackedTitle || params?.categoryName || "",
  ).trim();
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<Expense[]>([]);
  const [plannedAmount, setPlannedAmount] = useState<number>(0);
  const [cycleLabel, setCycleLabel] = useState<string>("");
  const [zeroConfirmedDays, setZeroConfirmedDays] = useState<number[]>([]);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [confirmingZero, setConfirmingZero] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [plannedCycleDurationDays, setPlannedCycleDurationDays] =
    useState<number>(0);
  const [cycleDateStart, setCycleDateStart] = useState<Date | null>(null);
  const [cycleDateEnd, setCycleDateEnd] = useState<Date | null>(null);

  const normalizeTitle = normalizeExpenseTitleKey;

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
      setPlannedCycleDurationDays(
        Number(planning?.consumoModeradoCycleDurationDays || 0),
      );

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

      setCycleDateStart(start);
      setCycleDateEnd(end);

      const expenses = await expenseServices.getExpenses(user.id, {
        startDate: start,
        endDate: end,
      });

      const filteredExpenses = filterTrackedExpensesForTitle(
        expenses,
        trackedTitle,
      );

      setExpenseHistory(
        [...filteredExpenses].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );

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
      const titleKey = normalizeTrackedTitleKey(trackedTitle);
      setZeroConfirmedDays(
        (budget?.trackedZeroConfirmedDays?.[titleKey] || [])
          .map((day) => Number(day))
          .filter((day) => Number.isFinite(day))
          .sort((a, b) => a - b),
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
    if (currentScreen !== "CategoryBudget") return;
    loadData();
  }, [currentScreen, user?.id, trackedTitle]);

  const handleAddTrackedExpense = () => {
    navigate("AddExpense", {
      prefillExpenseType: "tracked",
      prefillTrackedTitle: trackedTitle,
      returnTo: "CategoryBudget",
      returnParams: { trackedTitle },
    });
  };

  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  const calculateDaysInCycle = (): number => {
    if (!cycleDateStart || !cycleDateEnd) return daysInMonth;
    const start = getStartOfDay(cycleDateStart);
    const end = getStartOfDay(cycleDateEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const daysInCycle = calculateDaysInCycle();
  const daysForIdealTarget =
    plannedCycleDurationDays > 0 ? plannedCycleDurationDays : daysInCycle;
  const budgetValue = plannedAmount || 0;
  const idealDailyAverage =
    budgetValue > 0 && daysForIdealTarget > 0
      ? budgetValue / daysForIdealTarget
      : 0;

  const totalSpent = useMemo(
    () => days.reduce((sum, item) => sum + item.total, 0),
    [days],
  );
  const remainingToSpend = Math.max(0, budgetValue - totalSpent);
  const overPlannedAmount = Math.max(0, totalSpent - budgetValue);

  const countedDays = days.filter((daySummary) => {
    const day = daySummary.date.getDate();
    const hasExpense = daySummary.total > 0;
    const isZeroConfirmed = zeroConfirmedDays.includes(day);
    return hasExpense || isZeroConfirmed;
  }).length;

  const actualDailyAverage = countedDays > 0 ? totalSpent / countedDays : 0;
  const isOverBudget =
    actualDailyAverage > idealDailyAverage && budgetValue > 0;

  const getPerformanceIndicator = () => {
    if (budgetValue <= 0) {
      return {
        label: "Sem planejamento definido",
        detail:
          "Peça ao consultor para preencher o planejamento com gastos esperados.",
        color: "#999",
        icon: "information-circle-outline" as const,
      };
    }

    const difference = actualDailyAverage - idealDailyAverage;
    const tolerance = 0.01;

    if (difference > tolerance) {
      return {
        label: "Acima da meta",
        detail: `${formatCurrency(Math.abs(difference))} acima da meta diária.`,
        color: "#ff4d6d",
        icon: "trending-up" as const,
      };
    }

    if (difference < -tolerance) {
      return {
        label: "Abaixo da meta",
        detail: `${formatCurrency(Math.abs(difference))} abaixo da meta diária.`,
        color: "#8c52ff",
        icon: "trending-down" as const,
      };
    }

    return {
      label: "Dentro da meta",
      detail: "Sua média diária está alinhada com a meta definida.",
      color: "#c084fc",
      icon: "checkmark-circle" as const,
    };
  };

  const performanceIndicator = getPerformanceIndicator();

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
      await budgetServices.confirmZeroExpenseDayForTracked(
        user.id,
        zeroConfirmDate,
        trackedTitle,
      );

      const day = zeroConfirmDate.getDate();
      setZeroConfirmedDays((previous) =>
        Array.from(new Set([...previous, day])).sort((a, b) => a - b),
      );
      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      setShowConfetti(true);
      Alert.alert("Parabéns! 🎉", "Zero registrado com sucesso.");
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
        isTrackedDaily: true,
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
            {budgetValue > 0 ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Média diária ideal:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(idealDailyAverage)}
                </Text>
              </View>
            ) : null}
          </View>

          {budgetValue > 0 ? (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={24} color="#8c52ff" />
                <Text style={styles.statLabel}>Dias no ciclo</Text>
                <Text style={styles.statValue}>{daysInCycle}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color="#8c52ff" />
                <Text style={styles.statLabel}>Total gasto</Text>
                <Text style={styles.statValue}>{formatCurrency(totalSpent)}</Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  isOverBudget && styles.statCardWarning,
                ]}
              >
                <Ionicons
                  name={isOverBudget ? "trending-up" : "trending-down"}
                  size={24}
                  color={isOverBudget ? "#ff4d6d" : "#8c52ff"}
                />
                <Text style={styles.statLabel}>Média real/dia</Text>
                <Text
                  style={[
                    styles.statValue,
                    isOverBudget && styles.statValueWarning,
                  ]}
                >
                  {formatCurrency(actualDailyAverage)}
                </Text>
              </View>
            </View>
          ) : null}

          {budgetValue > 0 ? (
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
              <View style={styles.performanceMetaRow}>
                <Text style={styles.performanceMetaLabel}>Meta diária</Text>
                <Text style={styles.performanceMetaValue}>
                  {formatCurrency(idealDailyAverage)}
                </Text>
              </View>
              <View style={styles.performanceMetaRow}>
                <Text style={styles.performanceMetaLabel}>
                  Zeros confirmados
                </Text>
                <Text style={styles.performanceMetaValue}>
                  {zeroConfirmedDays.length}
                </Text>
              </View>
            </View>
          ) : null}

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

          <View style={styles.historyCard}>
            <View style={styles.daysHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Histórico de lançamentos</Text>
                <Text style={styles.cardSubtitle}>
                  Gastos registrados em {trackedTitle} neste ciclo
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addExpenseButton}
                onPress={handleAddTrackedExpense}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.addExpenseButtonText}>Adicionar</Text>
              </TouchableOpacity>
            </View>

            {expenseHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum lançamento registrado ainda para {trackedTitle}.
              </Text>
            ) : (
              expenseHistory.map((expense) => (
                <View key={expense.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {formatDateForDisplay(expense.date)}
                    </Text>
                    {expense.paymentMethod ? (
                      <Text style={styles.historyMeta}>
                        {expense.paymentMethod.replace("_", " ")}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(expense.value)}
                  </Text>
                </View>
              ))
            )}
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
      <ConfettiCelebration
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
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
  historyCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  addExpenseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8c52ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addExpenseButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  historyInfo: {
    flex: 1,
    marginRight: 12,
  },
  historyDate: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  historyMeta: {
    color: "#888",
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  historyAmount: {
    color: "#ff4d6d",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default CategoryBudgetScreen;
