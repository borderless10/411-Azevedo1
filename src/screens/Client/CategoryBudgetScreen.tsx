/**
 * Tela de orçamento por categoria acompanhada pelo cliente
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
import { ConsumptionCategoryRelease } from "../../types/planning";
import { toExpenseCategoryLookupKey } from "../../types/category";
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
  const categoryName = String(params?.categoryName || "").trim();
  const [loading, setLoading] = useState(true);
  const [release, setRelease] = useState<ConsumptionCategoryRelease | null>(
    null,
  );
  const [days, setDays] = useState<DaySummary[]>([]);
  const [cycleLabel, setCycleLabel] = useState<string>("");
  const [zeroConfirmedDays, setZeroConfirmedDays] = useState<number[]>([]);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [confirmingZero, setConfirmingZero] = useState(false);

  const isCreditCardExpense = (exp: any) => {
    return (
      exp.paymentMethod === "credit_card" ||
      (exp.cardId && exp.cardId.length > 0)
    );
  };

  const loadData = async () => {
    if (!user?.id || !categoryName) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const planning = await planningServices.getPlanning(user.id);
      const activeRelease = Object.values(planning?.categoryReleases || {})
        .filter((item) => item.status === "active")
        .find(
          (item) =>
            toExpenseCategoryLookupKey(item.categoryName) ===
            toExpenseCategoryLookupKey(categoryName),
        );

      setRelease(activeRelease || null);
      setCycleLabel(getPlanningCycleLabel(planning) || "");

      const cycleStartDate = planning?.consumoModeradoCycleStartedAt
        ? getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt))
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

      const start = cycleStartDate || getStartOfDay(today);
      const end = cycleEndDate || getEndOfDay(today);

      const expenses = await expenseServices.getExpenses(user.id, {
        startDate: start,
        endDate: end,
      });

      const targetLookupKey = toExpenseCategoryLookupKey(
        activeRelease?.categoryName || categoryName,
      );
      const filteredExpenses = expenses.filter((exp) => {
        if (isCreditCardExpense(exp)) return false;
        return toExpenseCategoryLookupKey(exp.category) === targetLookupKey;
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
      Alert.alert("Erro", "Não foi possível carregar a categoria agora.");
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
  }, [user?.id, categoryName]);

  const budgetValue = release?.monthlyLimit || 0;
  const daysInCycle = days.length > 0 ? days.length : 1;
  const idealDailyAverage = release?.dailyLimit || budgetValue / daysInCycle;
  const totalSpent = useMemo(
    () => days.reduce((sum, item) => sum + item.total, 0),
    [days],
  );
  const actualDailyAverage = days.length > 0 ? totalSpent / days.length : 0;
  const isOverBudget =
    actualDailyAverage > idealDailyAverage && budgetValue > 0;

  const performanceIndicator = (() => {
    if (budgetValue <= 0) {
      return {
        label: "Sem categoria liberada",
        detail:
          "Peça ao consultor para liberar esta categoria no planejamento.",
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
      detail: "Seu gasto diário está alinhado com a meta definida.",
      color: "#c084fc",
      icon: "checkmark-circle" as const,
    };
  })();

  const handleOpenNoRecordActions = (date: Date) => {
    const label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    Alert.alert("Dia sem registro", `Dia ${label} sem gastos registrados.`, [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Registrar gasto",
        onPress: () => {
          navigate("AddExpense", {
            prefillDate: date.toISOString(),
            prefillCategory: categoryName,
            returnTo: "CategoryBudget",
            returnParams: { categoryName },
          });
        },
      },
      {
        text: "Marcar zero na planilha",
        onPress: () => {
          setZeroConfirmDayLabel(label);
          setZeroConfirmDate(date);
          setZeroConfirmVisible(true);
        },
      },
    ]);
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

  if (loading) {
    return (
      <Layout title="Categoria" showBackButton={false} showSidebar={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando categoria...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title={release?.categoryName || categoryName || "Categoria"}
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
            <Text style={styles.title}>
              {release?.categoryName || categoryName}
            </Text>
            <Text style={styles.subtitle}>
              Acompanhe os gastos diários desta categoria
            </Text>
            {cycleLabel ? (
              <Text style={styles.cycleLabel}>{cycleLabel}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Meta mensal da categoria</Text>
            <View style={styles.inputContainerReadOnly}>
              <Text style={styles.readOnlyBudgetValue}>
                {formatCurrency(budgetValue)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              {release
                ? "Valor liberado pelo consultor para esta categoria."
                : "Esta categoria ainda não foi liberada pelo consultor."}
            </Text>
            {budgetValue > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Média diária ideal:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(idealDailyAverage)}
                </Text>
              </View>
            )}
          </View>

          {budgetValue > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={24} color="#8c52ff" />
                <Text style={styles.statLabel}>Dias do ciclo</Text>
                <Text style={styles.statValue}>{daysInCycle}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color="#8c52ff" />
                <Text style={styles.statLabel}>Total gasto</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(totalSpent)}
                </Text>
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
          )}

          {budgetValue > 0 && (
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
            </View>
          )}

          <View style={styles.daysCard}>
            <View style={styles.daysHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>📅 Gastos por dia</Text>
                <Text style={styles.cardSubtitle}>
                  Detalhamento dos gastos desta categoria no ciclo atual
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
                Nenhum gasto encontrado para esta categoria no ciclo atual.
              </Text>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>
      <ZeroPlanilhaConfirmModal
        visible={zeroConfirmVisible}
        dayLabel={zeroConfirmDayLabel}
        loading={confirmingZero}
        onConfirm={handleConfirmZero}
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
