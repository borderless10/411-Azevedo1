/**
 * Tela de Renda Acompanhada (clonada da tela de Consumo Moderado/Budget)
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { formatCurrency } from "../../utils/currencyUtils";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import incomeServices from "../../services/incomeServices";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { getStartOfDay, getEndOfDay, addDays } from "../../utils/dateUtils";

type DailyIncome = {
  day: number;
  amount: number;
};

export const TrackedIncomeScreen = () => {
  const { user } = useAuth();
  const { currentScreen, navigate, params } = useNavigation() as any;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const trackedTitle = String(params?.trackedTitle || "").trim();

  const [plannedMonthlyIncome, setPlannedMonthlyIncome] = useState<number>(0);
  const [dailyIncomes, setDailyIncomes] = useState<DailyIncome[]>([]);
  const [dailyIncomeDates, setDailyIncomeDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [choiceModalDayLabel, setChoiceModalDayLabel] = useState("");
  const [choiceModalDate, setChoiceModalDate] = useState<Date | null>(null);
  const [planningLoaded, setPlanningLoaded] = useState<boolean>(false);
  const [planningCycleLabel, setPlanningCycleLabel] = useState<string>("");
  const [cycleDateStart, setCycleDateStart] = useState<Date | null>(null);
  const [cycleDateEnd, setCycleDateEnd] = useState<Date | null>(null);
  const [plannedCycleDurationDays, setPlannedCycleDurationDays] =
    useState<number>(0);
  const [zeroConfirmedDays, setZeroConfirmedDays] = useState<number[]>([]);

  const normalizeTitle = (value?: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");

  const calculateDaysInCycle = (): number => {
    if (!cycleDateStart || !cycleDateEnd) return 30;
    const start = getStartOfDay(cycleDateStart);
    const end = getStartOfDay(cycleDateEnd);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays);
  };

  const daysInCycle = calculateDaysInCycle();
  const daysForIdealTarget =
    plannedCycleDurationDays > 0 ? plannedCycleDurationDays : daysInCycle;

  const budgetValue = plannedMonthlyIncome || 0;
  const idealDailyAverage =
    daysForIdealTarget > 0 ? budgetValue / daysForIdealTarget : 0;

  const totalReceived = dailyIncomes.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const remainingToReceive = Math.max(0, budgetValue - totalReceived);
  const overExpectedAmount = Math.max(0, totalReceived - budgetValue);
  const countedDays = dailyIncomeDates.filter((date) => {
    const day = date.getDate();
    const hasIncome = dailyIncomes.some((d) => d.day === day && d.amount > 0);
    const isZeroConfirmed = zeroConfirmedDays.includes(day);
    return hasIncome || isZeroConfirmed;
  }).length;
  const actualDailyAverage = countedDays > 0 ? totalReceived / countedDays : 0;

  const isOverBudget =
    actualDailyAverage > idealDailyAverage && budgetValue > 0;

  const getPerformanceIndicator = () => {
    if (budgetValue <= 0) {
      return {
        label: "Sem planejamento definido",
        detail:
          "Peça ao consultor para preencher rendas acompanhadas no planejamento.",
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
        color: "#8c52ff",
        icon: "trending-up" as const,
      };
    }

    if (difference < -tolerance) {
      return {
        label: "Abaixo da meta",
        detail: `${formatCurrency(Math.abs(difference))} abaixo da meta diária.`,
        color: "#ff4d6d",
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

  const formatDayMonthLabel = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  useEffect(() => {
    if (currentScreen === "TrackedIncome" && user) {
      loadIncomeData();
    }
  }, [currentScreen, user, trackedTitle]);

  useEffect(() => {
    if (!loading) {
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
    }
  }, [loading]);

  const loadIncomeData = async () => {
    if (!user?.id || !trackedTitle) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const planning = await planningServices.getPlanning(user.id);
      setPlanningCycleLabel(getPlanningCycleLabel(planning) || "");
      setPlannedCycleDurationDays(
        Number(planning?.consumoModeradoCycleDurationDays || 0),
      );

      const trackedKey = normalizeTitle(trackedTitle);

      const totalTrackedExpectedIncome = (planning?.expectedIncomes || [])
        .filter(
          (item) =>
            item.dailyTracking && normalizeTitle(item.source) === trackedKey,
        )
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      setPlannedMonthlyIncome(totalTrackedExpectedIncome);
      setPlanningLoaded(totalTrackedExpectedIncome > 0);

      const today = new Date();
      const cycleStartDate = planning?.consumoModeradoCycleStartedAt
        ? getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt))
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

      const start = cycleStartDate || getStartOfDay(today);
      const end = cycleEndDate || getEndOfDay(today);

      setCycleDateStart(start);
      setCycleDateEnd(end);

      const cycleDates: Date[] = [];
      let dateCursor = getStartOfDay(start);
      const lastDate = getStartOfDay(end);
      while (dateCursor <= lastDate) {
        cycleDates.push(new Date(dateCursor));
        dateCursor = addDays(dateCursor, 1);
      }
      setDailyIncomeDates(cycleDates);

      const incomes = await incomeServices.getIncomes(user.id, {
        startDate: start,
        endDate: end,
      });

      const filteredIncomes = incomes.filter(
        (income) =>
          Boolean(income.dailyTracking) &&
          normalizeTitle(income.description) === trackedKey,
      );

      const dayMap = new Map<number, number>();
      cycleDates.forEach((date) => dayMap.set(date.getDate(), 0));

      filteredIncomes.forEach((income) => {
        const day = new Date(income.date).getDate();
        const current = dayMap.get(day) ?? 0;
        const amount =
          typeof income.value === "number"
            ? income.value
            : parseFloat(String(income.value)) || 0;
        dayMap.set(day, current + amount);
      });

      const computed: DailyIncome[] = [];
      Array.from(dayMap.entries()).forEach(([day, amount]) => {
        computed.push({ day, amount });
      });
      computed.sort((a, b) => a.day - b.day);

      setDailyIncomes(computed);
      setZeroConfirmedDays([]);
    } catch (error) {
      console.error("❌ Erro ao carregar renda acompanhada:", error);
      Alert.alert("Erro", "Não foi possível carregar a renda acompanhada");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNoRecordActions = (date: Date) => {
    const label = formatDayMonthLabel(date);
    setChoiceModalDayLabel(label);
    setChoiceModalDate(date);
    setChoiceModalVisible(true);
  };

  const handleChooseRegister = () => {
    if (!choiceModalDate) return;
    setChoiceModalVisible(false);
    navigate("AddIncome", {
      prefillDate: choiceModalDate.toISOString(),
      trackedMode: true,
      prefillDescription: trackedTitle,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle },
    });
  };

  const handleChooseMarkZero = () => {
    if (!choiceModalDate) return;
    setChoiceModalVisible(false);
    const day = choiceModalDate.getDate();
    setZeroConfirmedDays((prev) =>
      Array.from(new Set([...prev, day])).sort((a, b) => a - b),
    );
  };

  const getDayIncome = (day: number): number => {
    const income = dailyIncomes.find((item) => item.day === day);
    return income ? income.amount : 0;
  };

  if (loading) {
    return (
      <Layout
        title={trackedTitle || "Renda"}
        showBackButton={false}
        showSidebar={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando renda...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title={trackedTitle || "Renda"}
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
            <Text style={styles.title}>{trackedTitle || "Renda"}</Text>
            <Text style={styles.subtitle}>
              Controle quanto você está recebendo por dia
            </Text>
            {planningCycleLabel ? (
              <Text style={styles.cycleLabel}>{planningCycleLabel}</Text>
            ) : null}
            {saving && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color="#8c52ff" />
                <Text style={styles.savingText}>Salvando...</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>💰 Total já recebido</Text>
            <View style={styles.inputContainerReadOnly}>
              <Text style={styles.readOnlyBudgetValue}>
                {formatCurrency(totalReceived)}
              </Text>
            </View>
            <Text style={styles.helperText}>
              {planningLoaded
                ? overExpectedAmount > 0
                  ? `Você já recebeu ${formatCurrency(overExpectedAmount)} acima do previsto.`
                  : `Ainda previsto para receber: ${formatCurrency(remainingToReceive)}.`
                : "Nenhum valor planejado foi definido para esta renda."}
            </Text>
            <View style={styles.infoContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#999"
              />
              <Text style={styles.infoText}>
                Esse campo não é editável pelo cliente.
              </Text>
            </View>
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
            <View>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <Ionicons name="calendar-outline" size={24} color="#8c52ff" />
                  <Text style={styles.statLabel}>Dias no ciclo</Text>
                  <Text style={styles.statValue}>{daysInCycle}</Text>
                </View>

                <View style={styles.statCard}>
                  <Ionicons name="cash-outline" size={24} color="#8c52ff" />
                  <Text style={styles.statLabel}>Total recebido</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(totalReceived)}
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
                    color={isOverBudget ? "#8c52ff" : "#ff4d6d"}
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
              <View style={styles.performanceMetaRow}>
                <Text style={styles.performanceMetaLabel}>
                  Zeros confirmados
                </Text>
                <Text style={styles.performanceMetaValue}>
                  {zeroConfirmedDays.length}
                </Text>
              </View>
            </View>
          )}

          {budgetValue > 0 && (
            <View style={styles.daysCard}>
              <Text style={styles.cardTitle}>📅 Rendas Diárias</Text>
              <Text style={styles.cardSubtitle}>
                Registre quanto recebeu em cada dia
              </Text>

              <View style={styles.daysList}>
                {dailyIncomeDates.map((date) => {
                  const day = date.getDate();
                  const income = getDayIncome(day);
                  const isZeroConfirmed = zeroConfirmedDays.includes(day);

                  return (
                    <View
                      key={date.toISOString()}
                      style={[
                        styles.dayRow,
                        isZeroConfirmed && styles.dayRowZeroConfirmed,
                      ]}
                    >
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayNumber}>
                          {formatDayMonthLabel(date)}
                        </Text>
                        {income > 0 && (
                          <Text style={styles.dayExpense}>
                            {formatCurrency(income)}
                          </Text>
                        )}
                        {income === 0 && !isZeroConfirmed && (
                          <Text style={styles.dayEmpty}>Sem registro</Text>
                        )}
                        {isZeroConfirmed && (
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

                      {income === 0 && !isZeroConfirmed ? (
                        <TouchableOpacity
                          style={styles.alertIconButton}
                          onPress={() => handleOpenNoRecordActions(date)}
                        >
                          <Ionicons
                            name="alert-circle"
                            size={24}
                            color="#ff4d6d"
                          />
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.editIconButton}
                          onPress={() =>
                            navigate("AddIncome", {
                              prefillDate: date.toISOString(),
                              prefillDescription: trackedTitle,
                              trackedMode: true,
                              returnTo: "TrackedIncome",
                              returnParams: { trackedTitle },
                            })
                          }
                        >
                          <Ionicons name="pencil" size={18} color="#8c52ff" />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {budgetValue === 0 && (
            <View style={styles.emptyState}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color="#666"
              />
              <Text style={styles.emptyText}>
                Aguarde o consultor definir valor planejado para esta renda.
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal transparent visible={choiceModalVisible} animationType="fade">
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Dia sem registro</Text>
            <Text style={modalStyles.message}>{choiceModalDayLabel}</Text>
            <View style={modalStyles.actionsRow}>
              <TouchableOpacity
                style={modalStyles.buttonPurple}
                onPress={handleChooseMarkZero}
              >
                <Text style={modalStyles.buttonWhiteLabel}>Marcar zero</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.buttonPink}
                onPress={handleChooseRegister}
              >
                <Text style={modalStyles.buttonWhiteLabel}>
                  Registrar renda
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  savingText: {
    fontSize: 12,
    color: "#8c52ff",
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
    marginBottom: 16,
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
    fontSize: 14,
    color: "#999",
    marginTop: 10,
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
  editIconButton: {
    padding: 8,
  },
  alertIconButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
  },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#0e0c14",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#2a2040",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  message: {
    color: "#a89fc0",
    fontSize: 14,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  buttonPurple: {
    flex: 1,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPink: {
    flex: 1,
    backgroundColor: "#ff4d6d",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonWhiteLabel: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default TrackedIncomeScreen;
