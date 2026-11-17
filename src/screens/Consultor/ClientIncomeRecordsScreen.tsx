import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import { profileDisplayName } from "../../utils/chatDisplayNames";
import { incomeServices } from "../../services/incomeServices";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { Income } from "../../types/income";
import { ExpectedItem } from "../../types/planning";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  addDays,
  formatDateForDisplay,
  formatDateToString,
  getEndOfDay,
  getStartOfDay,
} from "../../utils/dateUtils";
import { normalizeExpenseTitleKey } from "../../utils/expenseScopeUtils";

type DaySummary = {
  date: Date;
  dateKey: string;
  total: number;
};

/** all | tracked | general | título específico de renda acompanhada */
type IncomeViewFilter = "all" | "tracked" | "general" | string;

const getPlannedAmount = (item: ExpectedItem) => {
  const amountCard = Number(item?.amountCard);
  const amountCash = Number(item?.amountCash);
  const hasSplit = Number.isFinite(amountCard) || Number.isFinite(amountCash);
  if (hasSplit) {
    return (
      (Number.isFinite(amountCard) ? amountCard : 0) +
      (Number.isFinite(amountCash) ? amountCash : 0)
    );
  }
  return Number(item?.amount) || 0;
};

const incomeMatchesViewFilter = (
  income: Income,
  viewFilter: IncomeViewFilter,
): boolean => {
  const isTracked = Boolean(income.dailyTracking);
  if (viewFilter === "all") return true;
  if (viewFilter === "tracked") return isTracked;
  if (viewFilter === "general") return !isTracked;
  return (
    isTracked &&
    normalizeExpenseTitleKey(income.description) ===
      normalizeExpenseTitleKey(viewFilter)
  );
};

export const ClientIncomeRecordsScreen: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const clientId: string = params?.clientId || "";

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [viewFilter, setViewFilter] = useState<IncomeViewFilter>("all");
  const [trackedTitles, setTrackedTitles] = useState<string[]>([]);
  const [plannedAmount, setPlannedAmount] = useState(0);
  const [cycleLabel, setCycleLabel] = useState("");
  const [plannedCycleDurationDays, setPlannedCycleDurationDays] = useState(0);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);

  const loadData = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const client = await userService.getUserById(clientId);
      if (
        user?.role === "consultor" &&
        client &&
        (client as any).consultantId !== user.id
      ) {
        navigate("ConsultorHome");
        return;
      }
      setClientName(profileDisplayName(client, "Cliente"));

      const today = new Date();
      const planning = await planningServices.getPlanning(clientId);
      setCycleLabel(getPlanningCycleLabel(planning) || "");
      setPlannedCycleDurationDays(
        Number(planning?.consumoModeradoCycleDurationDays || 0),
      );

      const titles = Array.from(
        new Set(
          (planning?.expectedIncomes || [])
            .filter((item) => item.dailyTracking)
            .map((item) => String(item.source || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "pt-BR"));
      setTrackedTitles(titles);

      const isKnownFilter =
        viewFilter === "all" ||
        viewFilter === "tracked" ||
        viewFilter === "general" ||
        titles.includes(viewFilter);
      const activeFilter: IncomeViewFilter = isKnownFilter ? viewFilter : "all";
      if (!isKnownFilter && viewFilter !== "all") {
        setViewFilter("all");
      }

      const plannedScopeTitle =
        activeFilter !== "all" &&
        activeFilter !== "tracked" &&
        activeFilter !== "general"
          ? activeFilter
          : "";

      const plannedItems = (planning?.expectedIncomes || []).filter((item) => {
        if (!item.dailyTracking) return false;
        if (!plannedScopeTitle) return true;
        return (
          normalizeExpenseTitleKey(item.source) ===
          normalizeExpenseTitleKey(plannedScopeTitle)
        );
      });
      setPlannedAmount(
        plannedItems.reduce((sum, item) => sum + getPlannedAmount(item), 0),
      );

      const cycleStartedAtRaw = planning?.consumoModeradoCycleStartedAt
        ? new Date(planning.consumoModeradoCycleStartedAt)
        : null;
      const cycleStartDate = cycleStartedAtRaw
        ? getStartOfDay(cycleStartedAtRaw)
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

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

      const incomes = await incomeServices.getIncomes(clientId, {
        startDate: start,
        endDate: end,
        createdAtFrom: cycleStartedAtRaw || undefined,
      });

      const filtered = incomes.filter((income) =>
        incomeMatchesViewFilter(income, activeFilter),
      );

      setIncomeHistory(
        [...filtered].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );

      const dayMap = new Map<string, number>();
      let cursor = getStartOfDay(start);
      const lastDay = getStartOfDay(end);
      while (cursor <= lastDay) {
        dayMap.set(formatDateToString(cursor), 0);
        cursor = addDays(cursor, 1);
      }

      filtered.forEach((income) => {
        const dateKey = formatDateToString(new Date(income.date));
        const prev = dayMap.get(dateKey) ?? 0;
        const value =
          typeof income.value === "number"
            ? income.value
            : parseFloat(String(income.value)) || 0;
        dayMap.set(dateKey, prev + value);
      });

      const list: DaySummary[] = Array.from(dayMap.entries()).map(
        ([dateKey, total]) => ({
          date: new Date(`${dateKey}T12:00:00`),
          dateKey,
          total,
        }),
      );
      setDays(list);
    } catch (error) {
      console.warn("Erro ao carregar rendas do cliente", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, navigate, viewFilter, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (loading) return;
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
  }, [fadeAnim, loading, slideAnim]);

  const daysInCycle = Math.max(1, days.length);
  const daysForIdealTarget =
    plannedCycleDurationDays > 0 ? plannedCycleDurationDays : daysInCycle;
  const budgetValue = plannedAmount || 0;
  const idealDailyAverage =
    budgetValue > 0 && daysForIdealTarget > 0
      ? budgetValue / daysForIdealTarget
      : 0;
  const totalReceived = days.reduce((sum, item) => sum + item.total, 0);
  const remainingToReceive = Math.max(0, budgetValue - totalReceived);
  const overExpectedAmount = Math.max(0, totalReceived - budgetValue);
  const countedDays = days.filter((item) => item.total > 0).length;
  const actualDailyAverage = countedDays > 0 ? totalReceived / countedDays : 0;
  const isOverBudget =
    actualDailyAverage > idealDailyAverage && budgetValue > 0;

  const getPerformanceIndicator = () => {
    if (budgetValue <= 0) {
      return {
        label: "Sem planejamento definido",
        detail: "Não há renda acompanhada planejada para este cliente.",
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
        color: "#B900FF",
        icon: "trending-up" as const,
      };
    }

    if (difference < -tolerance) {
      return {
        label: "Abaixo da meta",
        detail: `${formatCurrency(Math.abs(difference))} abaixo da meta diária.`,
        color: "#FF008A",
        icon: "trending-down" as const,
      };
    }

    return {
      label: "Dentro da meta",
      detail: "A média diária está alinhada com a meta definida.",
      color: "#c084fc",
      icon: "checkmark-circle" as const,
    };
  };

  const showTrackedBudget = viewFilter !== "general";
  const performanceIndicator = getPerformanceIndicator();
  const screenTitle =
    viewFilter === "general"
      ? "Rendas gerais"
      : viewFilter === "tracked"
        ? "Rendas acompanhadas"
        : viewFilter === "all"
          ? "Rendas"
          : viewFilter;

  const formatDayMonthLabel = (date: Date) =>
    date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

  const filterChips: { id: IncomeViewFilter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "tracked", label: "Acompanhadas" },
    { id: "general", label: "Gerais / salário" },
    ...trackedTitles.map((title) => ({ id: title, label: title })),
  ];

  if (loading) {
    return (
      <Layout title="Rendas" showBackButton showSidebar={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B900FF" />
          <Text style={styles.loadingText}>Carregando renda...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title={screenTitle} showBackButton showSidebar={false}>
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
            <Ionicons name="wallet-outline" size={64} color="#B900FF" />
            <Text style={styles.title}>{screenTitle}</Text>
            <Text style={styles.subtitle}>
              Acompanhe quanto {clientName || "o cliente"} está recebendo
            </Text>
            <Text style={styles.spectatorHint}>
              Visualização do cliente (somente leitura)
            </Text>
            {cycleLabel ? (
              <Text style={styles.cycleLabel}>{cycleLabel}</Text>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {filterChips.map((chip) => {
              const active = viewFilter === chip.id;
              return (
                <TouchableOpacity
                  key={chip.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setViewFilter(chip.id)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {showTrackedBudget ? (
          <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Quanto falta no ciclo</Text>
            <View style={styles.inputContainerReadOnly}>
              <Text style={styles.readOnlyBudgetValue}>
                {formatCurrency(remainingToReceive)}
              </Text>
            </View>
            {overExpectedAmount > 0 ? (
              <Text style={styles.overExpectedText}>
                Já recebeu {formatCurrency(overExpectedAmount)} acima do
                previsto.
              </Text>
            ) : null}
            <Text style={styles.helperText}>
              {budgetValue > 0
                ? "Cálculo: renda esperada do ciclo menos total recebido até agora."
                : "Não há renda acompanhada planejada para este cliente."}
            </Text>
            <View style={styles.infoContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#999"
              />
              <Text style={styles.infoText}>
                Quando ultrapassar o previsto, o valor exibido fica em R$ 0,00.
              </Text>
            </View>
            {budgetValue > 0 ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Média diária ideal:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(idealDailyAverage)}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="calendar-outline" size={24} color="#B900FF" />
              <Text style={styles.statLabel}>Dias no ciclo</Text>
              <Text style={styles.statValue}>{daysInCycle}</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash-outline" size={24} color="#B900FF" />
              <Text style={styles.statLabel}>Total recebido</Text>
              <Text style={styles.statValue}>
                {formatCurrency(totalReceived)}
              </Text>
            </View>
            <View
              style={[styles.statCard, isOverBudget && styles.statCardWarning]}
            >
              <Ionicons
                name={isOverBudget ? "trending-up" : "trending-down"}
                size={24}
                color={isOverBudget ? "#B900FF" : "#FF008A"}
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
                {idealDailyAverage > 0
                  ? formatCurrency(idealDailyAverage)
                  : "—"}
              </Text>
            </View>
            <View style={styles.performanceMetaRow}>
              <Text style={styles.performanceMetaLabel}>Dias preenchidos</Text>
              <Text style={styles.performanceMetaValue}>{countedDays}</Text>
            </View>
          </View>
          </>
          ) : null}

          <View style={styles.daysCard}>
            <Text style={styles.cardTitle}>📅 Rendas Diárias</Text>
            <Text style={styles.cardSubtitle}>
              Quanto o cliente recebeu em cada dia do ciclo
            </Text>

            <View style={styles.daysList}>
              {days.map((daySummary) => {
                const hasIncome = daySummary.total > 0;

                return (
                  <View key={daySummary.dateKey} style={styles.dayRow}>
                    <View style={styles.dayInfo}>
                      <Text style={styles.dayNumber}>
                        {formatDayMonthLabel(daySummary.date)}
                      </Text>
                      {hasIncome ? (
                        <Text style={styles.dayExpense}>
                          {formatCurrency(daySummary.total)}
                        </Text>
                      ) : (
                        <Text style={styles.dayEmpty}>Sem registro</Text>
                      )}
                    </View>
                    {!hasIncome ? (
                      <Ionicons
                        name="alert-circle"
                        size={22}
                        color="#FF008A"
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.historyCard}>
            <Text style={styles.cardTitle}>Histórico de lançamentos</Text>
            <Text style={styles.cardSubtitle}>
              Rendas registradas neste ciclo
              {viewFilter !== "all" &&
              viewFilter !== "tracked" &&
              viewFilter !== "general"
                ? ` em ${viewFilter}`
                : ""}
            </Text>
            {incomeHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum lançamento registrado ainda.
              </Text>
            ) : (
              incomeHistory.map((income) => (
                <View key={income.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {income.description || "Renda"}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {formatDateForDisplay(income.date)}
                      {" · "}
                      {income.dailyTracking ? "Acompanhada" : "Geral / salário"}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(income.value)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
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
  spectatorHint: {
    marginTop: 8,
    color: "#b89aff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  cycleLabel: {
    marginTop: 10,
    color: "#b89aff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#171321",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: "#B900FF",
    backgroundColor: "#B900FF",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  chipTextActive: {
    color: "#fff",
  },
  card: {
    backgroundColor: "#171321",
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
    marginBottom: 16,
  },
  inputContainerReadOnly: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#07050D",
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
    fontSize: 14,
    color: "#999",
    marginTop: 10,
    lineHeight: 20,
  },
  overExpectedText: {
    marginTop: 10,
    color: "#B900FF",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  infoText: {
    fontSize: 12,
    color: "#999",
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
    color: "#B900FF",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#171321",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
  },
  statCardWarning: {
    borderColor: "#B900FF",
    backgroundColor: "#1a1428",
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
  },
  statValueWarning: {
    color: "#B900FF",
  },
  performanceCard: {
    backgroundColor: "#171321",
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
    backgroundColor: "#171321",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  daysList: {
    gap: 8,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#07050D",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
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
    color: "#B900FF",
    marginTop: 2,
  },
  dayEmpty: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  historyCard: {
    backgroundColor: "#171321",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#21172D",
  },
  historyInfo: {
    flex: 1,
    paddingRight: 12,
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
  },
  historyAmount: {
    color: "#B900FF",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
