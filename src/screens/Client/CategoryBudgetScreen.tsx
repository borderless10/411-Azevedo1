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
  getMonthYearFromDate,
  listMonthYearsInRange,
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
  formatDateToString,
} from "../../utils/dateUtils";
import { useNavigation } from "../../routes/NavigationContext";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";
import { OpeningExpenseEntry } from "../../types/openingExpense";
import { registerOpeningExpenses } from "../../utils/openingExpenseRegistration";
import ConfettiCelebration from "../../components/ui/ConfettiCelebration";
import { Expense } from "../../types/expense";
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
import { creditCardServices } from "../../services/creditCardServices";
import { CreditCard } from "../../types/creditCard";

type DaySummary = {
  date: Date;
  total: number;
};

/** Quantos lançamentos mostrar no preview do dia (antes de editar). */
const DAY_PREVIEW_LIMIT = 3;

export const CategoryBudgetScreen = () => {

  const desktopWeb = useDesktopWeb();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { user } = useAuth();
  const { navigate, params, currentScreen } = useNavigation() as any;
  const trackedTitle = String(
    params?.trackedTitle || params?.categoryName || "",
  ).trim();
  const clientId = String(params?.clientId || "");
  const isSpectator =
    !!clientId &&
    (user?.role === "consultor" ||
      user?.role === "supervisor" ||
      user?.role === "admin" ||
      !!user?.isAdmin);
  const ownerId = isSpectator ? clientId : user?.id || "";
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DaySummary[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<Expense[]>([]);
  const [plannedAmount, setPlannedAmount] = useState<number>(0);
  const [cycleLabel, setCycleLabel] = useState<string>("");
  const [zeroConfirmedDateKeys, setZeroConfirmedDateKeys] = useState<string[]>([]);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [confirmingZero, setConfirmingZero] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [plannedCycleDurationDays, setPlannedCycleDurationDays] =
    useState<number>(0);
  const [cycleDateStart, setCycleDateStart] = useState<Date | null>(null);
  const [cycleDateEnd, setCycleDateEnd] = useState<Date | null>(null);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [dragSourceDateKey, setDragSourceDateKey] = useState<string | null>(
    null,
  );
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineDraftActive, setInlineDraftActive] = useState(false);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

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

  const loadData = async (options?: { silent?: boolean }) => {
    if (!ownerId || !trackedTitle) {
      setLoading(false);
      return;
    }

    if (!options?.silent) setLoading(true);
    try {
      const today = new Date();
      const planning = await planningServices.getPlanning(ownerId);
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

      const cycleStartedAtRaw = planning?.consumoModeradoCycleStartedAt
        ? new Date(planning.consumoModeradoCycleStartedAt)
        : null;
      const cycleStartDate = cycleStartedAtRaw
        ? getStartOfDay(cycleStartedAtRaw)
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

      const expenses = await expenseServices.getExpenses(ownerId, {
        startDate: start,
        endDate: end,
        createdAtFrom: cycleStartedAtRaw || undefined,
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

      const monthYears = listMonthYearsInRange(start, end);
      const titleKey = normalizeTrackedTitleKey(trackedTitle);
      const zerosByMonth = await Promise.all(
        monthYears.map(async (monthYear) => {
          const monthBudget = await budgetServices.getBudget(ownerId, monthYear);
          const confirmedDays =
            monthBudget?.trackedZeroConfirmedDays?.[titleKey] || [];
          return list
            .filter(
              (daySummary) =>
                getMonthYearFromDate(daySummary.date) === monthYear &&
                confirmedDays.includes(daySummary.date.getDate()),
            )
            .map((daySummary) => formatDateToString(daySummary.date));
        }),
      );
      setZeroConfirmedDateKeys(Array.from(new Set(zerosByMonth.flat())));
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
    if (!ownerId || !desktopWeb) {
      setCreditCards([]);
      return;
    }
    let cancelled = false;
    creditCardServices
      .getCreditCards(ownerId)
      .then((cards) => {
        if (!cancelled) {
          setCreditCards(cards.filter((card) => card.isActive !== false));
        }
      })
      .catch(() => {
        if (!cancelled) setCreditCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, desktopWeb]);

  const handleAddTrackedExpense = (date?: Date) => {
    if (desktopWeb) {
      if (date) {
        setEditingDateKey(formatDateToString(date));
        setInlineDraftActive(false);
      }
      return;
    }
    navigate("AddExpense", {
      prefillExpenseType: "tracked",
      prefillTrackedTitle: trackedTitle,
      clientId: clientId || undefined,
      returnTo: "CategoryBudget",
      returnParams: { trackedTitle, clientId: clientId || undefined },
      ...(date ? { prefillDate: formatDateToString(date) } : {}),
    });
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

  const applyLocalTrackedExpenseAdd = (expense: Expense) => {
    const dateKey = formatDateToString(new Date(expense.date));
    const value = Number(expense.value) || 0;
    setExpenseHistory((prev) => [expense, ...prev]);
    bumpDayTotal(dateKey, value);
    setZeroConfirmedDateKeys((prev) => prev.filter((k) => k !== dateKey));
  };

  const replaceLocalTrackedExpenseId = (tempId: string, real: Expense) => {
    setExpenseHistory((prev) =>
      prev.map((e) => (e.id === tempId ? real : e)),
    );
  };

  const applyLocalTrackedExpenseRemove = (expense: Expense) => {
    const dateKey = formatDateToString(new Date(expense.date));
    const value = Number(expense.value) || 0;
    setExpenseHistory((prev) => prev.filter((e) => e.id !== expense.id));
    bumpDayTotal(dateKey, -value);
  };

  const applyLocalTrackedExpenseMove = (
    expense: Expense,
    toDateKey: string,
  ) => {
    const fromKey = formatDateToString(new Date(expense.date));
    if (fromKey === toDateKey) return;
    const [y, m, d] = toDateKey.split("-").map(Number);
    const value = Number(expense.value) || 0;
    const moved: Expense = {
      ...expense,
      date: toNoon(new Date(y, m - 1, d)),
      updatedAt: new Date(),
    };
    setExpenseHistory((prev) =>
      prev.map((e) => (e.id === expense.id ? moved : e)),
    );
    bumpDayTotal(fromKey, -value);
    bumpDayTotal(toDateKey, value);
    setZeroConfirmedDateKeys((prev) => prev.filter((k) => k !== toDateKey));
  };

  const refreshTrackedInBackground = () => {
    void loadData({ silent: true }).catch((err) =>
      console.warn("⚠️ [CategoryBudget] Refresh falhou:", err),
    );
  };

  const submitInlineTrackedExpense = async (
    date: Date,
    payload: DesktopDayQuickEntryPayload,
  ) => {
    if (!ownerId || !trackedTitle) return;
    try {
      setInlineSaving(true);
      const created = await expenseServices.createExpense(ownerId, {
        value: payload.value,
        description: payload.description,
        date: toNoon(date),
        category: "Acompanhamento Diário",
        paymentMethod:
          payload.payment === "card" ? "credit_card" : "cash",
        ...(payload.payment === "card" && payload.cardId
          ? { cardId: payload.cardId }
          : {}),
        isTrackedDaily: true,
        trackedTitle,
      });
      applyLocalTrackedExpenseAdd(created);
      setInlineDraftActive(false);
      setInlineSaving(false);
      refreshTrackedInBackground();
    } catch (err: any) {
      setInlineSaving(false);
      Alert.alert(
        "Erro",
        err?.message || "Não foi possível salvar o lançamento.",
      );
    }
  };

  const duplicateTrackedExpense = (expense: Expense) => {
    if (!ownerId) return;
    const noon = toNoon(new Date(expense.date));
    const tempId = `temp-dup-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const optimistic: Expense = {
      ...expense,
      id: tempId,
      date: noon,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    applyLocalTrackedExpenseAdd(optimistic);

    void (async () => {
      try {
        const created = await expenseServices.createExpense(ownerId, {
          value: expense.value,
          description: expense.description || trackedTitle,
          date: noon,
          category: expense.category || "Acompanhamento Diário",
          paymentMethod: expense.paymentMethod || "cash",
          ...(expense.paymentMethod === "credit_card" && expense.cardId
            ? { cardId: expense.cardId }
            : {}),
          isTrackedDaily: true,
          trackedTitle: expense.trackedTitle || trackedTitle,
        });
        replaceLocalTrackedExpenseId(tempId, created);
        refreshTrackedInBackground();
      } catch (err: any) {
        applyLocalTrackedExpenseRemove(optimistic);
        Alert.alert(
          "Erro",
          err?.message || "Não foi possível duplicar o lançamento.",
        );
      }
    })();
  };

  const moveTrackedExpenseToDay = async (
    payload: DesktopDayDragPayload,
    toDateKey: string,
  ) => {
    if (!ownerId || payload.kind !== "expense") return;
    if (payload.fromDateKey === toDateKey) return;
    const local =
      expenseHistory.find((e) => e.id === payload.entryId) || null;
    if (!local) return;
    try {
      setInlineSaving(true);
      const [y, m, d] = toDateKey.split("-").map(Number);
      applyLocalTrackedExpenseMove(local, toDateKey);
      setEditingDateKey(toDateKey);
      setInlineSaving(false);
      void (async () => {
        try {
          await expenseServices.updateExpense(payload.entryId, {
            date: toNoon(new Date(y, m - 1, d)),
          });
        } catch (err: any) {
          Alert.alert(
            "Erro",
            err?.message || "Não foi possível mover o lançamento.",
          );
        } finally {
          refreshTrackedInBackground();
        }
      })();
    } catch (err: any) {
      setInlineSaving(false);
      Alert.alert(
        "Erro",
        err?.message || "Não foi possível mover o lançamento.",
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

  const toggleSelectAllDay = (items: Expense[]) => {
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

  const deleteTrackedExpense = (expense: Expense) => {
    if (!ownerId) return;
    Alert.alert(
      "Excluir lançamento",
      `Remover "${expense.description || trackedTitle}" de ${formatCurrency(expense.value)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            applyLocalTrackedExpenseRemove(expense);
            setSelectedEntryIds((prev) =>
              prev.filter((id) => id !== expense.id),
            );
            void (async () => {
              try {
                await expenseServices.deleteExpense(expense.id);
              } catch (err: any) {
                applyLocalTrackedExpenseAdd(expense);
                Alert.alert(
                  "Erro",
                  err?.message || "Não foi possível excluir o lançamento.",
                );
              } finally {
                refreshTrackedInBackground();
              }
            })();
          },
        },
      ],
    );
  };

  const deleteSelectedTrackedExpenses = (items: Expense[]) => {
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
            selected.forEach((item) => applyLocalTrackedExpenseRemove(item));
            setSelectedEntryIds([]);
            void (async () => {
              const failed: Expense[] = [];
              await Promise.all(
                selected.map(async (item) => {
                  try {
                    await expenseServices.deleteExpense(item.id);
                  } catch {
                    failed.push(item);
                  }
                }),
              );
              if (failed.length) {
                failed.forEach((item) => applyLocalTrackedExpenseAdd(item));
                Alert.alert(
                  "Erro",
                  `Não foi possível excluir ${failed.length} lançamento(s).`,
                );
              }
              refreshTrackedInBackground();
            })();
          },
        },
      ],
    );
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
    const hasExpense = daySummary.total > 0;
    const isZeroConfirmed = zeroConfirmedDateKeys.includes(
      formatDateToString(daySummary.date),
    );
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
        color: "#FF008A",
        icon: "trending-up" as const,
      };
    }

    if (difference < -tolerance) {
      return {
        label: "Abaixo da meta",
        detail: `${formatCurrency(Math.abs(difference))} abaixo da meta diária.`,
        color: "#B900FF",
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

  const getExpensePaymentLabel = (raw?: string) => {
    const method = String(raw || "").toLowerCase();
    if (method.includes("credit") || method === "card") return "Crédito";
    if (method.includes("debit")) return "Débito";
    if (method.includes("pix")) return "PIX";
    if (method.includes("cash") || method.includes("dinheiro")) return "Dinheiro";
    return "Outro";
  };

  const getExpensesForDate = (date: Date) => {
    const dateKey = formatDateToString(date);
    return expenseHistory.filter(
      (expense) => formatDateToString(new Date(expense.date)) === dateKey,
    );
  };

  const openExpenseEditor = (expenseId: string) => {
    navigate("EditExpense", {
      id: expenseId,
      expenseId,
      returnTo: "CategoryBudget",
      clientId: clientId || undefined,
      returnParams: { trackedTitle, clientId: clientId || undefined },
    });
  };

  const handleOpenNoRecordActions = (date: Date) => {
    if (desktopWeb) {
      setEditingDateKey(formatDateToString(date));
      setInlineDraftActive(false);
      setSelectedEntryIds([]);
      return;
    }
    const label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    setZeroConfirmDayLabel(label);
    setZeroConfirmDate(date);
    setZeroConfirmVisible(true);
  };

  const handleConfirmZeroFromInline = async (date: Date) => {
    if (!ownerId || !trackedTitle) return;
    try {
      setConfirmingZero(true);
      await budgetServices.confirmZeroExpenseDayForTracked(
        ownerId,
        date,
        trackedTitle,
      );
      const dateKey = formatDateToString(date);
      setZeroConfirmedDateKeys((previous) =>
        Array.from(new Set([...previous, dateKey])),
      );
      setEditingDateKey(null);
      setInlineDraftActive(false);
      setShowConfetti(true);
      // Só celebra quando pontua — aqui o fluxo tracked confirma zero com confetti.
      Alert.alert("Parabéns! 🎉", "Zero registrado com sucesso.");
    } catch (error) {
      console.error("❌ [CATEGORY BUDGET] Erro ao confirmar zero:", error);
      Alert.alert("Erro", "Não foi possível confirmar o zero agora.");
    } finally {
      setConfirmingZero(false);
    }
  };

  const handleConfirmZero = async () => {
    if (!ownerId || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await budgetServices.confirmZeroExpenseDayForTracked(
        ownerId,
        zeroConfirmDate,
        trackedTitle,
      );

      const dateKey = formatDateToString(zeroConfirmDate);
      setZeroConfirmedDateKeys((previous) =>
        Array.from(new Set([...previous, dateKey])),
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

  const handleConfirmEntries = async (entries: OpeningExpenseEntry[]) => {
    if (!ownerId || !zeroConfirmDate || !trackedTitle) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await registerOpeningExpenses(ownerId, zeroConfirmDate, entries, {
        reconcileConsumo: false,
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
        showBackButton={isSpectator}
        showSidebar={!isSpectator}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B900FF" />
          <Text style={styles.loadingText}>Carregando acompanhamento...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title={trackedTitle || "Acompanhamento"}
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
            <Text style={styles.title}>{trackedTitle}</Text>
            <Text style={styles.subtitle}>
              Acompanhe os gastos diarios desse titulo personalizado
            </Text>
            <ActingForClientBanner clientId={clientId} />
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
                <Ionicons name="calendar-outline" size={24} color="#B900FF" />
                <Text style={styles.statLabel}>Dias no ciclo</Text>
                <Text style={styles.statValue}>{daysInCycle}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color="#B900FF" />
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
                  color={isOverBudget ? "#FF008A" : "#B900FF"}
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
                <Text style={styles.cardTitle}>📅 Gastos por dia</Text>
                <Text style={styles.cardSubtitle}>
                  Detalhamento dos gastos deste acompanhamento no ciclo atual
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
                const dayItems = getExpensesForDate(daySummary.date);

                const dayHeader = (
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
                      <Text style={styles.dayEmpty}>Sem gasto registrado</Text>
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
                          moveTrackedExpenseToDay,
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
                                    deleteSelectedTrackedExpenses(dayItems)
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
                                kind="expense"
                                title={item.description || trackedTitle}
                                meta={getExpensePaymentLabel(
                                  item.paymentMethod,
                                )}
                                value={item.value}
                                selected={selectedEntryIds.includes(item.id)}
                                onToggleSelect={() =>
                                  toggleEntrySelected(item.id)
                                }
                                onEdit={() => openExpenseEditor(item.id)}
                                onDuplicate={() =>
                                  duplicateTrackedExpense(item)
                                }
                                onDelete={() => deleteTrackedExpense(item)}
                              />
                            ) : (
                              <TouchableOpacity
                                key={item.id}
                                style={styles.editItemRow}
                                onPress={() => openExpenseEditor(item.id)}
                              >
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.editItemTitle}>
                                    {item.description || trackedTitle}
                                  </Text>
                                  <Text style={styles.editItemMeta}>
                                    {getExpensePaymentLabel(
                                      item.paymentMethod,
                                    )}
                                  </Text>
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
                                key={`tracked-exp-quick-${dateKey}`}
                                descriptionPlaceholder={`Descrição (ex.: ${trackedTitle})`}
                                cards={creditCards}
                                saving={inlineSaving}
                                onDraftChange={setInlineDraftActive}
                                onSubmit={(payload) =>
                                  submitInlineTrackedExpense(
                                    daySummary.date,
                                    payload,
                                  )
                                }
                              />
                              {!isZeroConfirmed ? (
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
                                  disabled={
                                    inlineDraftActive || confirmingZero
                                  }
                                  onPress={() =>
                                    handleConfirmZeroFromInline(
                                      daySummary.date,
                                    )
                                  }
                                >
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={16}
                                    color={
                                      inlineDraftActive ? "#666" : "#B900FF"
                                    }
                                  />
                                  <Text
                                    style={[
                                      styles.addItemButtonText,
                                      {
                                        color: inlineDraftActive
                                          ? "#777"
                                          : "#B900FF",
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
                                onPress={() =>
                                  handleAddTrackedExpense(daySummary.date)
                                }
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
                              .map((item) => (
                                <View
                                  key={item.id}
                                  style={styles.dayPreviewRow}
                                >
                                  <Text
                                    style={styles.dayPreviewTitle}
                                    numberOfLines={1}
                                  >
                                    {item.description || trackedTitle}
                                  </Text>
                                  <Text style={styles.dayPreviewAmount}>
                                    {formatCurrency(item.value)}
                                  </Text>
                                </View>
                              ))}
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
                  onPress={() => handleAddTrackedExpense()}
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
        fixedKind="tracked"
        trackedOptions={trackedTitle ? [trackedTitle] : []}
        onConfirmEntries={handleConfirmEntries}
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
    marginBottom: 0,
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
    fontSize: 12,
    color: "#999",
    marginTop: 10,
    lineHeight: 18,
  },
  overPlannedText: {
    marginTop: 10,
    color: "#FF008A",
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
    textAlign: "center",
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
  dayRowZeroConfirmed: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderColor: "rgba(76, 175, 80, 0.45)",
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
  editIconButton: {
    padding: 8,
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
    backgroundColor: "#171321",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  addExpenseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#B900FF",
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
    borderBottomColor: "#21172D",
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
    color: "#FF008A",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default CategoryBudgetScreen;
