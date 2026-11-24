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
import { ActingForClientBanner } from "../../components/Staff/ActingForClientBanner";
import { useDesktopWeb } from "../../utils/desktopWeb";
import { DesktopPageCanvas } from "../../components/Layout/DesktopPage";
import {
  DesktopDayQuickEntry,
  DesktopDayQuickEntryPayload,
} from "../../components/Desktop/DesktopDayQuickEntry";
import {
  DesktopDayLedgerItem,
  DesktopDayDragPayload,
  desktopDayDropHandlers,
  subscribeDayDragStart,
  subscribeDayDragEnd,
} from "../../components/Desktop/DesktopDayLedgerItem";

type DaySummary = {
  date: Date;
  total: number;
};

type CycleDailyIncome = {
  dateKey: string;
  day: number;
  amount: number;
};

/** Quantos lançamentos mostrar no preview do dia (antes de editar). */
const DAY_PREVIEW_LIMIT = 3;

export const TrackedIncomeScreen = () => {

  const desktopWeb = useDesktopWeb();
  const { user } = useAuth();
  const { currentScreen, navigate, params } = useNavigation() as any;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const trackedTitle = String(params?.trackedTitle || "").trim();
  const clientId = String(params?.clientId || "");
  const isSpectator =
    !!clientId &&
    (user?.role === "consultor" ||
      user?.role === "supervisor" ||
      user?.role === "admin" ||
      !!user?.isAdmin);
  const ownerId = isSpectator ? clientId : user?.id || "";

  const [plannedMonthlyIncome, setPlannedMonthlyIncome] = useState<number>(0);
  const [dailyIncomes, setDailyIncomes] = useState<CycleDailyIncome[]>([]);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<Income[]>([]);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [dragSourceDateKey, setDragSourceDateKey] = useState<string | null>(
    null,
  );
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineDraftActive, setInlineDraftActive] = useState(false);
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
    if (!desktopWeb) return;
    const unsubStart = subscribeDayDragStart((payload) => {
      setDragSourceDateKey(payload.fromDateKey);
    });
    const unsubEnd = subscribeDayDragEnd(() => {
      setDragOverDateKey(null);
      setDragSourceDateKey(null);
    });
    return () => {
      unsubStart();
      unsubEnd();
    };
  }, [desktopWeb]);

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

  const loadIncomeData = async (options?: { silent?: boolean }) => {
    if (!ownerId || !trackedTitle) {
      setLoading(false);
      return;
    }

    try {
      if (!options?.silent) setLoading(true);

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
      const cycleStartedAtRaw = planning?.consumoModeradoCycleStartedAt
        ? new Date(planning.consumoModeradoCycleStartedAt)
        : null;
      const cycleStartDate = cycleStartedAtRaw
        ? getStartOfDay(cycleStartedAtRaw)
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
        createdAtFrom: cycleStartedAtRaw || undefined,
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

      const list: DaySummary[] = Array.from(dayMap.entries())
        .map(([dateKey, total]) => ({
          date: new Date(`${dateKey}T12:00:00`),
          total,
        }))
        .sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
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
      merged.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      setDailyIncomes(merged);
      const recordedKeys = new Set(
        filteredIncomes.map((income) =>
          formatDateToString(new Date(income.date)),
        ),
      );
      setZeroConfirmedDateKeys(
        Array.from(dayMap.entries())
          .filter(([dateKey, amount]) => recordedKeys.has(dateKey) && amount <= 0)
          .map(([dateKey]) => dateKey),
      );
    } catch (error) {
      console.error("❌ Erro ao carregar renda acompanhada:", error);
      Alert.alert("Erro", "Não foi possível carregar a renda acompanhada");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNoRecordActions = (date: Date) => {
    if (desktopWeb) {
      setEditingDateKey(formatDateToString(date));
      setInlineDraftActive(false);
      return;
    }
    const label = formatDayMonthLabel(date);
    setChoiceModalDayLabel(label);
    setChoiceModalDate(date);
    setChoiceModalVisible(true);
  };

  const toNoon = (date: Date) => {
    const noon = new Date(date);
    noon.setHours(12, 0, 0, 0);
    return noon;
  };

  const bumpDayTotal = (dateKey: string, delta: number) => {
    setDays((prev) =>
      prev.map((d) =>
        formatDateToString(d.date) === dateKey
          ? { ...d, total: Math.max(0, d.total + delta) }
          : d,
      ),
    );
  };

  const applyLocalTrackedIncomeAdd = (income: Income) => {
    const dateKey = formatDateToString(new Date(income.date));
    const value = Number(income.value) || 0;
    setIncomeHistory((prev) => [income, ...prev]);
    bumpDayTotal(dateKey, value);
    setZeroConfirmedDateKeys((prev) => prev.filter((k) => k !== dateKey));
  };

  const replaceLocalTrackedIncomeId = (tempId: string, real: Income) => {
    setIncomeHistory((prev) =>
      prev.map((i) => (i.id === tempId ? real : i)),
    );
  };

  const applyLocalTrackedIncomeRemove = (income: Income) => {
    const dateKey = formatDateToString(new Date(income.date));
    const value = Number(income.value) || 0;
    setIncomeHistory((prev) => prev.filter((i) => i.id !== income.id));
    bumpDayTotal(dateKey, -value);
  };

  const applyLocalTrackedIncomeMove = (income: Income, toDateKey: string) => {
    const fromKey = formatDateToString(new Date(income.date));
    if (fromKey === toDateKey) return;
    const [y, m, d] = toDateKey.split("-").map(Number);
    const value = Number(income.value) || 0;
    const moved: Income = {
      ...income,
      date: toNoon(new Date(y, m - 1, d)),
      updatedAt: new Date(),
    };
    setIncomeHistory((prev) =>
      prev.map((i) => (i.id === income.id ? moved : i)),
    );
    bumpDayTotal(fromKey, -value);
    bumpDayTotal(toDateKey, value);
    setZeroConfirmedDateKeys((prev) => prev.filter((k) => k !== toDateKey));
  };

  const refreshIncomeInBackground = () => {
    void loadIncomeData({ silent: true }).catch((err) =>
      console.warn("⚠️ [TrackedIncome] Refresh falhou:", err),
    );
  };

  const submitInlineTrackedIncome = async (
    date: Date,
    payload: DesktopDayQuickEntryPayload,
  ) => {
    if (!ownerId || !trackedTitle) return;
    try {
      setInlineSaving(true);
      const created = await incomeServices.createIncome(ownerId, {
        value: payload.value,
        description: trackedTitle,
        date: toNoon(date),
        category: "Acompanhamento Diário",
        dailyTracking: true,
      });
      applyLocalTrackedIncomeAdd(created);
      setInlineDraftActive(false);
      setInlineSaving(false);
      refreshIncomeInBackground();
    } catch (error: any) {
      setInlineSaving(false);
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível salvar o lançamento.",
      );
    }
  };

  const duplicateTrackedIncome = (income: Income) => {
    if (!ownerId) return;
    const noon = toNoon(new Date(income.date));
    const tempId = `temp-dup-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const optimistic: Income = {
      ...income,
      id: tempId,
      date: noon,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    applyLocalTrackedIncomeAdd(optimistic);

    void (async () => {
      try {
        const created = await incomeServices.createIncome(ownerId, {
          value: income.value,
          description: income.description || trackedTitle,
          date: noon,
          category: income.category || "Acompanhamento Diário",
          dailyTracking: true,
          ...(income.origin ? { origin: income.origin } : {}),
        });
        replaceLocalTrackedIncomeId(tempId, created);
        refreshIncomeInBackground();
      } catch (error: any) {
        applyLocalTrackedIncomeRemove(optimistic);
        Alert.alert(
          "Erro",
          error?.message || "Não foi possível duplicar o lançamento.",
        );
      }
    })();
  };

  const moveTrackedIncomeToDay = async (
    payload: DesktopDayDragPayload,
    toDateKey: string,
  ) => {
    if (!ownerId || payload.kind !== "income") return;
    if (payload.fromDateKey === toDateKey) return;
    const local = incomeHistory.find((i) => i.id === payload.entryId) || null;
    if (!local) return;
    try {
      setInlineSaving(true);
      const [y, m, d] = toDateKey.split("-").map(Number);
      applyLocalTrackedIncomeMove(local, toDateKey);
      setEditingDateKey(toDateKey);
      setInlineSaving(false);
      void (async () => {
        try {
          await incomeServices.updateIncome(payload.entryId, {
            date: toNoon(new Date(y, m - 1, d)),
          });
        } catch (error: any) {
          Alert.alert(
            "Erro",
            error?.message || "Não foi possível mover o lançamento.",
          );
        } finally {
          refreshIncomeInBackground();
        }
      })();
    } catch (error: any) {
      setInlineSaving(false);
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível mover o lançamento.",
      );
    }
  };

  const toggleEntrySelected = (entryId: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId],
    );
  };

  const toggleSelectAllDay = (items: Income[]) => {
    const ids = items.map((item) => item.id);
    if (!ids.length) return;
    const allSelected = ids.every((id) => selectedEntryIds.includes(id));
    setSelectedEntryIds(allSelected ? [] : ids);
  };

  const closeDayEditor = () => {
    setEditingDateKey(null);
    setInlineDraftActive(false);
    setSelectedEntryIds([]);
  };

  const deleteTrackedIncome = (income: Income) => {
    if (!ownerId) return;
    const label = income.origin?.trim()
      ? income.origin.trim()
      : income.description || trackedTitle;
    Alert.alert(
      "Excluir lançamento",
      `Remover "${label}" de ${formatCurrency(income.value)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            applyLocalTrackedIncomeRemove(income);
            setSelectedEntryIds((prev) =>
              prev.filter((id) => id !== income.id),
            );
            void (async () => {
              try {
                await incomeServices.deleteIncome(income.id);
              } catch (error: any) {
                applyLocalTrackedIncomeAdd(income);
                Alert.alert(
                  "Erro",
                  error?.message || "Não foi possível excluir o lançamento.",
                );
              } finally {
                refreshIncomeInBackground();
              }
            })();
          },
        },
      ],
    );
  };

  const deleteSelectedTrackedIncomes = (items: Income[]) => {
    if (!ownerId) return;
    const selected = items.filter((item) =>
      selectedEntryIds.includes(item.id),
    );
    if (!selected.length) return;
    Alert.alert(
      "Excluir selecionados",
      `Remover ${selected.length} lançamento(s) deste dia?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            selected.forEach((item) => applyLocalTrackedIncomeRemove(item));
            setSelectedEntryIds([]);
            void (async () => {
              const failed: Income[] = [];
              await Promise.all(
                selected.map(async (item) => {
                  try {
                    await incomeServices.deleteIncome(item.id);
                  } catch {
                    failed.push(item);
                  }
                }),
              );
              if (failed.length) {
                failed.forEach((item) => applyLocalTrackedIncomeAdd(item));
                Alert.alert(
                  "Erro",
                  `Não foi possível excluir ${failed.length} lançamento(s).`,
                );
              }
              refreshIncomeInBackground();
            })();
          },
        },
      ],
    );
  };

  const handleConfirmZeroFromInline = async (date: Date) => {
    if (!ownerId || !trackedTitle) return;
    try {
      setSaving(true);
      await incomeServices.createIncome(ownerId, {
        value: 0,
        description: trackedTitle,
        date: toNoon(date),
        category: "Acompanhamento Diário",
        dailyTracking: true,
      });
      setEditingDateKey(null);
      setInlineDraftActive(false);
      await loadIncomeData();
    } catch (error) {
      console.error("Erro ao registrar renda zero:", error);
      Alert.alert("Erro", "Não foi possível registrar o zero");
    } finally {
      setSaving(false);
    }
  };

  const handleChooseRegister = () => {
    if (!choiceModalDate) return;
    setChoiceModalVisible(false);
    navigate("AddIncome", {
      prefillDate: choiceModalDate.toISOString(),
      trackedMode: true,
      prefillDescription: trackedTitle,
      clientId: clientId || undefined,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  const handleChooseMarkZero = async () => {
    if (!choiceModalDate || !ownerId || !trackedTitle) return;
    const date = choiceModalDate;
    setChoiceModalVisible(false);
    try {
      setSaving(true);
      await incomeServices.createIncome(ownerId, {
        value: 0,
        description: trackedTitle,
        date,
        category: "Acompanhamento Diário",
        dailyTracking: true,
      });
      await loadIncomeData();
    } catch (error) {
      console.error("Erro ao registrar renda zero:", error);
      Alert.alert("Erro", "Não foi possível registrar o zero");
    } finally {
      setSaving(false);
    }
  };

  const getIncomesForDate = (date: Date) => {
    const dateKey = formatDateToString(date);
    return incomeHistory.filter(
      (income) => formatDateToString(new Date(income.date)) === dateKey,
    );
  };

  const openIncomeEditor = (incomeId: string) => {
    navigate("EditIncome", {
      id: incomeId,
      clientId: clientId || undefined,
      returnTo: "TrackedIncome",
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  const handleAddTrackedIncome = () => {
    navigate("AddIncome", {
      trackedMode: true,
      prefillDescription: trackedTitle,
      clientId: clientId || undefined,
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
          <ActivityIndicator size="large" color="#B900FF" />
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
      <DesktopPageCanvas>
      <ScrollView style={styles.container} scrollEnabled={!desktopWeb}>
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
            <Text style={styles.title}>{trackedTitle || "Renda"}</Text>
            <Text style={styles.subtitle}>
              Acompanhe as rendas diarias desse titulo personalizado
            </Text>
            <ActingForClientBanner clientId={clientId} />
            {planningCycleLabel ? (
              <Text style={styles.cycleLabel}>{planningCycleLabel}</Text>
            ) : null}
            {saving && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color="#B900FF" />
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
                style={[
                  styles.statCard,
                  isOverBudget && styles.statCardWarning,
                ]}
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
                const isEditing =
                  editingDateKey === dateKey ||
                  dragOverDateKey === dateKey ||
                  dragSourceDateKey === dateKey;
                const dayItems = getIncomesForDate(daySummary.date);

                const dayHeader = (
                  <View style={styles.dayInfo}>
                    <Text style={styles.dayNumber}>
                      {daySummary.date.toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Text>
                    {!isEditing &&
                    (daySummary.total > 0 || isZeroConfirmed) ? (
                      <Text style={styles.dayExpense}>
                        {formatCurrency(daySummary.total)}
                      </Text>
                    ) : !isEditing && !isZeroConfirmed ? (
                      <Text style={styles.dayEmpty}>Sem renda registrada</Text>
                    ) : !isEditing ? (
                      <View style={styles.zeroConfirmedBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color="#B900FF"
                        />
                        <Text style={styles.zeroConfirmedText}>
                          Zero confirmado
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );

                return (
                  <View
                    key={dateKey}
                    style={[
                      styles.dayRow,
                      isZeroConfirmed && styles.dayRowZeroConfirmed,
                      isEditing && styles.dayRowEditing,
                      !isEditing && styles.dayRowCollapsed,
                      desktopWeb && !isEditing && { padding: 0 },
                      desktopWeb &&
                        dragOverDateKey === dateKey &&
                        styles.dayRowDropTarget,
                    ]}
                    {...(desktopWeb
                      ? desktopDayDropHandlers(
                          dateKey,
                          moveTrackedIncomeToDay,
                          {
                            onHoverDay: (key) => {
                              setDragOverDateKey(key);
                              if (editingDateKey !== key) {
                                setEditingDateKey(key);
                                setInlineDraftActive(false);
                                setSelectedEntryIds([]);
                              }
                            },
                            onDragLeaveDay: (key) => {
                              setDragOverDateKey((prev) =>
                                prev === key ? null : prev,
                              );
                            },
                          },
                        )
                      : {})}
                  >
                    {isEditing ? (
                      <>
                        {desktopWeb ? (
                          <View style={styles.dayEditHeaderDesktop}>
                            {dayHeader}
                            <View style={styles.dayEditHeaderActions}>
                              {dayItems.length > 0 ? (
                                <TouchableOpacity
                                  style={styles.selectAllChip}
                                  onPress={() => toggleSelectAllDay(dayItems)}
                                >
                                  <Ionicons
                                    name={
                                      dayItems.every((item) =>
                                        selectedEntryIds.includes(item.id),
                                      )
                                        ? "checkbox"
                                        : "square-outline"
                                    }
                                    size={16}
                                    color="#B900FF"
                                  />
                                  <Text style={styles.selectAllChipText}>
                                    Selecionar tudo
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                              {selectedEntryIds.some((id) =>
                                dayItems.some((item) => item.id === id),
                              ) ? (
                                <TouchableOpacity
                                  style={styles.deleteSelectedBtn}
                                  onPress={() =>
                                    deleteSelectedTrackedIncomes(dayItems)
                                  }
                                >
                                  <Ionicons
                                    name="trash-outline"
                                    size={16}
                                    color="#fff"
                                  />
                                  <Text style={styles.deleteSelectedBtnText}>
                                    Apagar (
                                    {
                                      dayItems.filter((item) =>
                                        selectedEntryIds.includes(item.id),
                                      ).length
                                    }
                                    )
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                              <TouchableOpacity
                                style={styles.cancelEditButton}
                                onPress={closeDayEditor}
                              >
                                <Ionicons name="close" size={18} color="#fff" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          dayHeader
                        )}
                        <View style={styles.editItemsWrap}>
                          {dayItems.map((item) =>
                            desktopWeb ? (
                              <DesktopDayLedgerItem
                                key={item.id}
                                entryId={item.id}
                                dateKey={dateKey}
                                kind="income"
                                title={
                                  item.origin?.trim()
                                    ? item.origin.trim()
                                    : item.description || trackedTitle
                                }
                                meta={item.category || undefined}
                                value={item.value}
                                selected={selectedEntryIds.includes(item.id)}
                                onToggleSelect={() =>
                                  toggleEntrySelected(item.id)
                                }
                                onEdit={() => openIncomeEditor(item.id)}
                                onDuplicate={() =>
                                  duplicateTrackedIncome(item)
                                }
                                onDelete={() => deleteTrackedIncome(item)}
                              />
                            ) : (
                              <TouchableOpacity
                                key={item.id}
                                style={styles.editItemRow}
                                onPress={() => openIncomeEditor(item.id)}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.editItemTitle}>
                                    {item.origin?.trim()
                                      ? item.origin.trim()
                                      : item.description || trackedTitle}
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
                                  color="#B900FF"
                                />
                              </TouchableOpacity>
                            ),
                          )}
                          {desktopWeb ? (
                            <>
                              <DesktopDayQuickEntry
                                key={`tracked-inc-quick-${dateKey}`}
                                lockedDescription={trackedTitle}
                                showPayment={false}
                                saving={inlineSaving}
                                onDraftChange={setInlineDraftActive}
                                onSubmit={(payload) =>
                                  submitInlineTrackedIncome(
                                    daySummary.date,
                                    payload,
                                  )
                                }
                              />
                              {!isZeroConfirmed && dayItems.length === 0 ? (
                                <TouchableOpacity
                                  style={[
                                    styles.addItemButton,
                                    {
                                      backgroundColor: "transparent",
                                      borderWidth: 1,
                                      borderColor: inlineDraftActive
                                        ? "#555"
                                        : "#B900FF",
                                      opacity: inlineDraftActive ? 0.4 : 1,
                                    },
                                  ]}
                                  disabled={inlineDraftActive || saving}
                                  onPress={() =>
                                    handleConfirmZeroFromInline(
                                      daySummary.date,
                                    )
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.addItemButtonText,
                                      {
                                        color: inlineDraftActive
                                          ? "#777"
                                          : "#B900FF",
                                        marginLeft: 0,
                                      },
                                    ]}
                                  >
                                    Marcar zero no app
                                  </Text>
                                </TouchableOpacity>
                              ) : null}
                            </>
                          ) : (
                            <>
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
                                onPress={closeDayEditor}
                              >
                                <Ionicons name="close" size={18} color="#fff" />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.dayCollapsedPressable,
                          desktopWeb && styles.dayCollapsedPressableDesktop,
                        ]}
                        onPress={() => {
                          setSelectedEntryIds([]);
                          if (daySummary.total === 0 && !isZeroConfirmed) {
                            handleOpenNoRecordActions(daySummary.date);
                          } else {
                            setEditingDateKey(dateKey);
                          }
                        }}
                        activeOpacity={0.85}
                      >
                        <View style={styles.dayCollapsedTop}>
                          {dayHeader}
                          {daySummary.total === 0 && !isZeroConfirmed ? (
                            <View style={styles.alertIconButton}>
                              <Ionicons
                                name="alert-circle"
                                size={24}
                                color="#FF008A"
                              />
                            </View>
                          ) : (
                            <View style={styles.editIconButton}>
                              <Ionicons
                                name="pencil"
                                size={18}
                                color="#B900FF"
                              />
                            </View>
                          )}
                        </View>
                        {dayItems.length > 0 ? (
                          <View style={styles.dayPreviewList}>
                            {dayItems
                              .slice(0, DAY_PREVIEW_LIMIT)
                              .map((item) => {
                                const title = item.origin?.trim()
                                  ? item.origin.trim()
                                  : item.description || trackedTitle;
                                return (
                                  <View
                                    key={item.id}
                                    style={styles.dayPreviewRow}
                                  >
                                    <Text
                                      style={styles.dayPreviewTitle}
                                      numberOfLines={1}
                                    >
                                      {title}
                                    </Text>
                                    <Text style={styles.dayPreviewAmount}>
                                      {formatCurrency(item.value)}
                                    </Text>
                                  </View>
                                );
                              })}
                            {dayItems.length > DAY_PREVIEW_LIMIT ? (
                              <Text style={styles.dayPreviewMore}>
                                +{dayItems.length - DAY_PREVIEW_LIMIT} mais
                              </Text>
                            ) : null}
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    )}
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
              <TouchableOpacity
                  style={styles.addIncomeButton}
                  onPress={handleAddTrackedIncome}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.addIncomeButtonText}>Adicionar</Text>
                </TouchableOpacity>
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
          </DesktopPageCanvas>
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
    color: "#B900FF",
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
    borderColor: "#FF008A",
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
    color: "#FF008A",
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
    backgroundColor: "#07050D",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  dayRowEditing: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  dayRowCollapsed: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  dayRowDropTarget: {
    borderColor: "#B900FF",
    borderWidth: 2,
    backgroundColor: "rgba(185, 0, 255, 0.12)",
  },
  dayCollapsedPressable: {
    flex: 1,
    width: "100%",
  },
  dayCollapsedPressableDesktop: {
    padding: 12,
    // @ts-ignore web cursor
    cursor: "pointer",
  },
  dayCollapsedTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dayPreviewList: {
    marginTop: 8,
    gap: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#333",
  },
  dayPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dayPreviewTitle: {
    flex: 1,
    color: "#ccc",
    fontSize: 12,
  },
  dayPreviewAmount: {
    color: "#B900FF",
    fontSize: 12,
    fontWeight: "700",
  },
  dayPreviewMore: {
    color: "#888",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
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
    color: "#B900FF",
    fontWeight: "700",
    marginRight: 8,
  },
  addItemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B900FF",
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
    backgroundColor: "#FF008A",
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  dayEditHeaderDesktop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  dayEditHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  selectAllChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(185,0,255,0.45)",
    backgroundColor: "rgba(185,0,255,0.10)",
  },
  selectAllChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteSelectedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FF008A",
  },
  deleteSelectedBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
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
    color: "#B900FF",
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
    backgroundColor: "#171321",
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
    backgroundColor: "#171321",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  addIncomeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#B900FF",
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
    color: "#999",
    fontSize: 12,
    marginTop: 2,
  },
  historyAmount: {
    color: "#B900FF",
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
    borderColor: "#21172D",
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
    backgroundColor: "#B900FF",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPink: {
    flex: 1,
    backgroundColor: "#FF008A",
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
