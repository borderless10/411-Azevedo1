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
import { getStartOfDay, getEndOfDay, addDays, formatDateToString, formatDateForDisplay } from "../../utils/dateUtils";
import { Income } from "../../types/income";
import { normalizeExpenseTitleKey } from "../../utils/expenseScopeUtils";

type DaySummary = {
  date: Date;
  total: number;
};

type CycleDailyIncome = {
  dateKey: string;
  day: number;
  amount: number;
};

export const TrackedIncomeScreen = () => {
  const { user } = useAuth();
  const { currentScreen, navigate, params } = useNavigation() as any;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const trackedTitle = String(params?.trackedTitle || "").trim();
  const clientId = String(params?.clientId || "");
  const isSpectator =
    !!clientId &&
    (user?.role === "consultor" || user?.role === "admin" || !!user?.isAdmin);
  const ownerId = isSpectator ? clientId : user?.id || "";

  const [plannedMonthlyIncome, setPlannedMonthlyIncome] = useState<number>(0);
  const [dailyIncomes, setDailyIncomes] = useState<CycleDailyIncome[]>([]);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
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
  const [zeroConfirmedDateKeys, setZeroConfirmedDateKeys] = useState<string[]>([]);

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

    return Number(item?.amount) || 0;
  };

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
  const countedDays = days.filter((daySummary) => {
    const hasIncome = daySummary.total > 0;
    const isZeroConfirmed = zeroConfirmedDateKeys.includes(
      formatDateToString(daySummary.date),
    );
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
    if (currentScreen === "TrackedIncome" && ownerId) {
      loadIncomeData();
    }
  }, [currentScreen, ownerId, trackedTitle]);

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
    if (!ownerId || !trackedTitle) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const planning = await planningServices.getPlanning(ownerId);
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
        .reduce((sum, item) => sum + getPlannedAmount(item), 0);

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

      const incomes = await incomeServices.getIncomes(ownerId, {
        startDate: start,
        endDate: end,
      });

      const filteredIncomes = incomes.filter(
        (income) =>
          Boolean(income.dailyTracking) &&
          normalizeTitle(income.description) === trackedKey,
      );

      setIncomeHistory(
        [...filteredIncomes].sort(
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

      filteredIncomes.forEach((income) => {
        const dateKey = formatDateToString(new Date(income.date));
        if (!dayMap.has(dateKey)) return;
        const prev = dayMap.get(dateKey) ?? 0;
        const amount =
          typeof income.value === "number"
            ? income.value
            : parseFloat(String(income.value)) || 0;
        dayMap.set(dateKey, prev + amount);
      });

      const list: DaySummary[] = Array.from(dayMap.entries()).map(
        ([dateKey, total]) => ({
          date: new Date(`${dateKey}T12:00:00`),
          total,
        }),
      );

      setDays(list);

      const merged: CycleDailyIncome[] = [];
      dayMap.forEach((amount, dateKey) => {
        merged.push({
          dateKey,
          day: Number(dateKey.slice(-2)),
          amount,
        });
      });
      merged.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      setDailyIncomes(merged);
      setZeroConfirmedDateKeys((previous) =>
        previous.filter((dateKey) => (dayMap.get(dateKey) ?? 0) <= 0),
      );
    } catch (error) {
      console.error("❌ Erro ao carregar renda acompanhada:", error);
      Alert.alert("Erro", "Não foi possível carregar a renda acompanhada");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNoRecordActions = (date: Date) => {
    if (isSpectator) return;
    const label = formatDayMonthLabel(date);
    setChoiceModalDayLabel(label);
    setChoiceModalDate(date);
    setChoiceModalVisible(true);
  };

  const handleChooseRegister = () => {
    if (isSpectator || !choiceModalDate) return;
    setChoiceModalVisible(false);
    navigate("AddIncome", {
      prefillDate: choiceModalDate.toISOString(),
      trackedMode: true,
      prefillDescription: trackedTitle,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  const handleChooseMarkZero = () => {
    if (isSpectator || !choiceModalDate) return;
    setChoiceModalVisible(false);
    const dateKey = formatDateToString(choiceModalDate);
    setZeroConfirmedDateKeys((previous) =>
      Array.from(new Set([...previous, dateKey])),
    );
  };

  const getIncomesForDate = (date: Date) => {
    const dateKey = formatDateToString(date);
    return incomeHistory.filter(
      (income) => formatDateToString(new Date(income.date)) === dateKey,
    );
  };

  const openIncomeEditor = (incomeId: string) => {
    if (isSpectator) return;
    navigate("EditIncome", {
      id: incomeId,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  const handleAddTrackedIncome = () => {
    if (isSpectator) return;
    navigate("AddIncome", {
      trackedMode: true,
      prefillDescription: trackedTitle,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  if (loading) {
    return (
      <Layout
        title={trackedTitle || "Renda"}
        showBackButton={isSpectator}
        showSidebar={!isSpectator}
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
      showBackButton={isSpectator}
      showSidebar={!isSpectator}
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
              Acompanhe as rendas diarias desse titulo personalizado
            </Text>
            {isSpectator ? (
              <Text style={styles.spectatorHint}>
                Visualização do cliente (somente leitura)
              </Text>
            ) : null}
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
            <Text style={styles.cardTitle}>💰 Quanto falta no ciclo</Text>
            <View style={styles.inputContainerReadOnly}>
              <Text style={styles.readOnlyBudgetValue}>
                {formatCurrency(remainingToReceive)}
              </Text>
            </View>
            {overExpectedAmount > 0 ? (
              <Text style={styles.overExpectedText}>
                Você passou {formatCurrency(overExpectedAmount)} do planejado.
              </Text>
            ) : null}
            <Text style={styles.helperText}>
              Cálculo: renda esperada do ciclo menos total recebido até agora.
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
                  {zeroConfirmedDateKeys.length}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.daysCard}>
            <View style={styles.daysHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>📅 Rendas por dia</Text>
                <Text style={styles.cardSubtitle}>
                  Detalhamento das rendas deste acompanhamento no ciclo atual
                </Text>
              </View>
            </View>

            <View style={styles.daysList}>
              {days.map((daySummary) => {
                const dateKey = formatDateToString(daySummary.date);
                const isZeroConfirmed =
                  daySummary.total <= 0 &&
                  zeroConfirmedDateKeys.includes(dateKey);
                const isEditing = editingDateKey === dateKey;
                const dayItems = getIncomesForDate(daySummary.date);

                return (
                  <View
                    key={dateKey}
                    style={[
                      styles.dayRow,
                      isZeroConfirmed && styles.dayRowZeroConfirmed,
                      isEditing && styles.dayRowEditing,
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
                      {!isEditing && daySummary.total > 0 ? (
                        <Text style={styles.dayExpense}>
                          {formatCurrency(daySummary.total)}
                        </Text>
                      ) : !isEditing && !isZeroConfirmed ? (
                        <Text style={styles.dayEmpty}>
                          Sem renda registrada
                        </Text>
                      ) : !isEditing ? (
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
                      ) : null}
                    </View>

                    {!isSpectator &&
                      (isEditing ? (
                        <View style={styles.editItemsWrap}>
                          {dayItems.map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.editItemRow}
                              onPress={() => openIncomeEditor(item.id)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editItemTitle}>
                                  {item.description || trackedTitle}
                                </Text>
                                {item.category ? (
                                  <Text style={styles.editItemMeta}>
                                    {item.category}
                                  </Text>
                                ) : null}
                              </View>
                              <Text style={styles.editItemAmount}>
                                {formatCurrency(item.value)}
                              </Text>
                              <Ionicons
                                name="pencil"
                                size={16}
                                color="#8c52ff"
                              />
                            </TouchableOpacity>
                          ))}
                          <TouchableOpacity
                            style={styles.addItemButton}
                            onPress={() => {
                              navigate("AddIncome", {
                                prefillDate: daySummary.date.toISOString(),
                                trackedMode: true,
                                prefillDescription: trackedTitle,
                                returnTo: "TrackedIncome",
                                returnParams: {
                                  trackedTitle,
                                  clientId: clientId || undefined,
                                },
                              });
                            }}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.addItemButtonText}>
                              Adicionar lançamento
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelEditButton}
                            onPress={() => setEditingDateKey(null)}
                          >
                            <Ionicons name="close" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : daySummary.total === 0 && !isZeroConfirmed ? (
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
                        <TouchableOpacity
                          style={styles.editIconButton}
                          onPress={() => setEditingDateKey(dateKey)}
                        >
                          <Ionicons name="pencil" size={18} color="#8c52ff" />
                        </TouchableOpacity>
                      ))}
                  </View>
                );
              })}
            </View>

            {!days.length ? (
              <Text style={styles.emptyText}>
                Nenhuma renda encontrada para este acompanhamento no ciclo atual.
              </Text>
            ) : null}
          </View>

          <View style={styles.historyCard}>
            <View style={styles.daysHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Histórico de lançamentos</Text>
                <Text style={styles.cardSubtitle}>
                  Rendas registradas em {trackedTitle} neste ciclo
                </Text>
              </View>
              {!isSpectator ? (
                <TouchableOpacity
                  style={styles.addIncomeButton}
                  onPress={handleAddTrackedIncome}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.addIncomeButtonText}>Adicionar</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {incomeHistory.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum lançamento registrado ainda para {trackedTitle}.
              </Text>
            ) : (
              incomeHistory.map((income) => (
                <View key={income.id} style={styles.historyRow}>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyDate}>
                      {formatDateForDisplay(income.date)}
                    </Text>
                    {income.category ? (
                      <Text style={styles.historyMeta}>{income.category}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.historyAmount}>
                    {formatCurrency(income.value)}
                  </Text>
                </View>
              ))
            )}
          </View>

          {budgetValue === 0 ? (
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
          ) : null}
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
  overExpectedText: {
    marginTop: 10,
    color: "#8c52ff",
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
  dayRowEditing: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  editItemsWrap: {
    width: "100%",
    marginTop: 8,
  },
  editItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  editItemTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  editItemMeta: {
    color: "#999",
    fontSize: 11,
    marginTop: 2,
  },
  editItemAmount: {
    color: "#8c52ff",
    fontWeight: "700",
    marginRight: 8,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8c52ff",
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 6,
  },
  addItemButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
    fontSize: 13,
  },
  cancelEditButton: {
    alignSelf: "flex-end",
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 8,
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
  historyCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  addIncomeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8c52ff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addIncomeButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
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
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  historyAmount: {
    color: "#8c52ff",
    fontSize: 15,
    fontWeight: "700",
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
