/**
 * Tela de Controle de Orçamento Mensal
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
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { formatCurrency } from "../../utils/currencyUtils";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation } from "../../routes/NavigationContext";
import {
  budgetServices,
  getMonthYearFromDate,
  listMonthYearsInRange,
} from "../../services/budgetServices";
import expenseServices from "../../services/expenseServices";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { getStartOfDay, getEndOfDay, addDays, formatExpectedMonthLabel, formatDateToString } from "../../utils/dateUtils";
import { DailyExpense } from "../../types/budget";
import { Expense } from "../../types/expense";
import {
  requestNotificationPermissions,
  scheduleDailyExpenseReminder,
  cancelDailyExpenseReminder,
} from "../../services/notificationServices";
import { getRankingRegistrationFeedback } from "../../services/rankingPlanilhaService";
import ConfettiCelebration from "../../components/ui/ConfettiCelebration";
import {
  isConsumoModeradoHistoryExpense,
} from "../../utils/expenseScopeUtils";

type CycleDailyExpense = DailyExpense & { dateKey: string };

export const BudgetScreen = () => {
  const { user } = useAuth();
  const { currentScreen, navigate, params } = useNavigation() as any;
  const clientId = String(params?.clientId || "");
  const isSpectator =
    !!clientId &&
    (user?.role === "consultor" || user?.role === "admin" || !!user?.isAdmin);
  const ownerId = isSpectator ? clientId : user?.id || "";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [plannedMonthlySpending, setPlannedMonthlySpending] =
    useState<number>(0);
  const [dailyExpenses, setDailyExpenses] = useState<CycleDailyExpense[]>([]);
  const [expensesByDate, setExpensesByDate] = useState<Record<string, Expense[]>>(
    {},
  );
  const [dailyExpenseDates, setDailyExpenseDates] = useState<Date[]>([]);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [zeroConfirmedDateKeys, setZeroConfirmedDateKeys] = useState<string[]>([]);
  const [choiceModalVisible, setChoiceModalVisible] = useState(false);
  const [choiceModalDayLabel, setChoiceModalDayLabel] = useState("");
  const [choiceModalDate, setChoiceModalDate] = useState<Date | null>(null);
  const [correctZeroModalVisible, setCorrectZeroModalVisible] = useState(false);
  const [correctZeroModalDayLabel, setCorrectZeroModalDayLabel] = useState("");
  const [correctZeroModalDate, setCorrectZeroModalDate] = useState<Date | null>(
    null,
  );
  const [planningLoaded, setPlanningLoaded] = useState<boolean>(false);
  const [planningTotals, setPlanningTotals] = useState<any>(null);
  const [planningItems, setPlanningItems] = useState<any>(null);
  const [planningCycleLabel, setPlanningCycleLabel] = useState<string>("");
  const [cycleDateStart, setCycleDateStart] = useState<Date | null>(null);
  const [cycleDateEnd, setCycleDateEnd] = useState<Date | null>(null);
  const [plannedCycleDurationDays, setPlannedCycleDurationDays] =
    useState<number>(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Calcular dias do mês atual
  const today = new Date();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  // Calcular dias no ciclo
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

  // Calcular média diária ideal
  const budgetValue = plannedMonthlySpending || 0;
  const idealDailyAverage = budgetValue / daysForIdealTarget;

  // Calcular total gasto e média real
  const totalSpent = dailyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingToSpend = Math.max(0, budgetValue - totalSpent);
  const overPlannedAmount = Math.max(0, totalSpent - budgetValue);
  // Contar apenas dias DENTRO DO CICLO com gasto (>0) ou que foram marcados como zero
  const countedDays = dailyExpenseDates.filter((date) => {
    const dateKey = formatDateToString(date);
    const hasExpense = dailyExpenses.some(
      (d) => d.dateKey === dateKey && d.amount > 0,
    );
    const isZeroConfirmed = zeroConfirmedDateKeys.includes(dateKey);
    return hasExpense || isZeroConfirmed;
  }).length;
  const actualDailyAverage = countedDays > 0 ? totalSpent / countedDays : 0;

  // Status da média (se está acima ou abaixo do ideal)
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

  const formatPaymentMethodLabel = (raw: any) => {
    const pm = String(raw || "").toLowerCase();
    if (pm.includes("card") || pm.includes("cart")) return "Cartão";
    if (pm.includes("pix") || pm.includes("dinheiro") || pm.includes("cash")) {
      return "Dinheiro / Pix";
    }
    return raw ? String(raw) : "Não informado";
  };

  const isCardPayment = (raw?: any) => {
    const pm = String(raw || "").toLowerCase();
    return /card|cart|cartão|credit|debit|cr[eé]dito|d[eé]bito/.test(pm);
  };

  const formatItemDateLabel = (item: any) => {
    const parsedDate =
      item?.date || item?.expectedDate || item?.dueDate || item?.createdAt;

    if (parsedDate) {
      const d = new Date(parsedDate);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString("pt-BR");
      }
    }

    if (item?.expectedMonth) {
      const label = formatExpectedMonthLabel(String(item.expectedMonth));
      if (label) return label;
    }

    if (typeof item?.dueDay === "number") {
      return `Dia ${item.dueDay}`;
    }

    return "Não informada";
  };

  const formatDayMonthLabel = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Carregar dados do Firebase ao montar componente
  useEffect(() => {
    if (currentScreen === "Budget" && ownerId) {
      loadBudgetData();
      if (!isSpectator) {
        setupNotifications();
      }
    }
  }, [currentScreen, ownerId, isSpectator]);

  // Animações de entrada
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

  const loadBudgetData = async (options?: { silent?: boolean }) => {
    if (!ownerId) return;

    try {
      if (!options?.silent) {
        setLoading(true);
      }
      if (!isSpectator) {
        await budgetServices.syncRankingPenalties(ownerId);
      }

      // 1) Buscar valor mensal esperado do planejamento do consultor
      const planning = await planningServices.getPlanning(ownerId);
      setPlanningCycleLabel(getPlanningCycleLabel(planning) || "");
      setPlannedCycleDurationDays(
        Number(planning?.consumoModeradoCycleDurationDays || 0),
      );
      const totalPlannedByCategory = planning?.plannedByCategory
        ? Object.values(planning.plannedByCategory).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0,
          )
        : 0;
      const billsArr = planning?.bills || [];
      const totalBills = billsArr.reduce((sum, bill) => {
        if (isCardPayment(bill?.paymentMethod)) return sum;
        return sum + (Number(bill.amount) || 0);
      }, 0);

      // Separate expected expenses by payment method
      const expectedExpensesArr = planning?.expectedExpenses || [];
      const totalExpectedExpensesAll = expectedExpensesArr.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      );

      const totalCardExpenses = [...billsArr, ...expectedExpensesArr].reduce(
        (total: number, item: any) => {
          if (isCardPayment(item?.paymentMethod))
            return total + (Number(item?.amount) || 0);
          return total;
        },
        0,
      );

      const totalExpectedExpenses = expectedExpensesArr.reduce(
        (total: number, item: any) => {
          if (isCardPayment(item?.paymentMethod)) return total;
          return total + (Number(item?.amount) || 0);
        },
        0,
      );

      // Use the explicit field configured by the consultant for Consumo moderado.
      const consumoModerado = Number(planning?.consumoModerado ?? 0);
      const consumoCard = Number(planning?.consumoModeradoCard) || 0;
      const consumoCash = Number(planning?.consumoModeradoCash) || 0;
      const consumoModeradoSplit =
        consumoCard !== 0 || consumoCash !== 0
          ? { card: consumoCard, cash: consumoCash }
          : { card: 0, cash: consumoModerado };

      const totalPlannedSpending =
        totalPlannedByCategory + totalBills + totalExpectedExpenses;
      setPlannedMonthlySpending(consumoModerado);
      setPlanningTotals({
        totalBills,
        totalExpectedExpensesAll,
        totalExpectedExpenses,
        totalCardExpenses,
        consumoModerado,
        consumoModeradoCard: consumoModeradoSplit.card,
        consumoModeradoCash: consumoModeradoSplit.cash,
        totalPlannedByCategory,
        totalPlannedSpending,
      });
      setPlanningItems({
        bills: billsArr,
        expectedExpenses: expectedExpensesArr || [],
        plannedByCategory: planning?.plannedByCategory || {},
      });
      setPlanningLoaded(!!planning);

      if (__DEV__) {
        console.log("[BUDGET] planejamento carregado para consumo moderado", {
          userId: ownerId,
          hasPlanning: !!planning,
          totalPlannedByCategory,
          totalBills,
          totalExpectedExpenses,
          totalPlannedSpending,
        });
      }

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

      const cycleDates: Date[] = [];
      let dateCursor = getStartOfDay(start);
      const lastDate = getStartOfDay(end);
      while (dateCursor <= lastDate) {
        cycleDates.push(new Date(dateCursor));
        dateCursor = addDays(dateCursor, 1);
      }
      setDailyExpenseDates(cycleDates);

      const monthYears = listMonthYearsInRange(start, end);
      const budgetsByMonth = new Map<string, Awaited<ReturnType<typeof budgetServices.getBudget>>>();
      await Promise.all(
        monthYears.map(async (monthYear) => {
          const monthBudget = await budgetServices.getBudget(ownerId, monthYear);
          budgetsByMonth.set(monthYear, monthBudget);
        }),
      );

      const zeroKeys: string[] = [];
      cycleDates.forEach((date) => {
        const monthYear = getMonthYearFromDate(date);
        const monthBudget = budgetsByMonth.get(monthYear);
        const day = date.getDate();
        if ((monthBudget?.zeroConfirmedDays || []).includes(day)) {
          zeroKeys.push(formatDateToString(date));
        }
      });
      setZeroConfirmedDateKeys(zeroKeys);

      try {
        const expenses = await expenseServices.getExpenses(ownerId, {
          startDate: start,
          endDate: end,
          createdAtFrom: cycleStartedAtRaw || undefined,
        });
        const expensesForModerado = expenses.filter(
          isConsumoModeradoHistoryExpense,
        );

        const amountByDateKey = new Map<string, number>();
        const grouped: Record<string, Expense[]> = {};
        cycleDates.forEach((date) => {
          amountByDateKey.set(formatDateToString(date), 0);
        });

        expensesForModerado.forEach((exp) => {
          const dateKey = formatDateToString(new Date(exp.date));
          if (!amountByDateKey.has(dateKey)) return;
          const prev = amountByDateKey.get(dateKey) ?? 0;
          const val =
            typeof exp.value === "number"
              ? exp.value
              : parseFloat(String(exp.value)) || 0;
          amountByDateKey.set(dateKey, prev + val);
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(exp);
        });

        const merged: CycleDailyExpense[] = [];
        amountByDateKey.forEach((realAmount, dateKey) => {
          const day = Number(dateKey.slice(-2));
          merged.push({
            dateKey,
            day,
            amount: realAmount > 0 ? realAmount : 0,
          });
        });
        merged.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        setDailyExpenses(merged);
        setZeroConfirmedDateKeys(
          zeroKeys.filter((key) => (amountByDateKey.get(key) ?? 0) <= 0),
        );
        setExpensesByDate(grouped);
      } catch (err) {
        console.error("❌ [BUDGET] Erro ao agregar gastos do mês:", err);
        setDailyExpenses([]);
        setExpensesByDate({});
      }

      console.log("✅ Orçamento carregado do Firebase");
    } catch (error) {
      console.error("❌ Erro ao carregar orçamento:", error);
      Alert.alert("Erro", "Não foi possível carregar o orçamento");
    } finally {
      setLoading(false);
    }
  };

  const setupNotifications = async () => {
    try {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission) {
        console.log("✅ Permissão de notificações concedida");

        // Verificar se já tem gasto registrado hoje
        const todayKey = formatDateToString(new Date());
        const hasExpenseToday = dailyExpenses.some(
          (expense) => expense.dateKey === todayKey && expense.amount > 0,
        );

        if (!hasExpenseToday) {
          // Agendar lembrete diário às 21h
          const notificationId = await scheduleDailyExpenseReminder();
          if (notificationId) {
            console.log("✅ Lembrete diário configurado com sucesso");
          }
        } else {
          console.log(
            "✅ Já tem gasto registrado hoje, lembrete não necessário",
          );
          // Cancelar qualquer lembrete existente
          await cancelDailyExpenseReminder();
        }
      } else {
        console.log("⚠️ Permissão de notificações negada");
      }
    } catch (error) {
      console.error("❌ Erro ao configurar notificações:", error);
    }
  };

  const getExpensePaymentLabel = (raw?: string) => {
    const method = String(raw || "").toLowerCase();
    if (method.includes("credit") || method === "card") return "Crédito";
    if (method.includes("debit")) return "Débito";
    if (method.includes("pix")) return "PIX";
    if (method.includes("cash") || method.includes("dinheiro")) return "Dinheiro";
    return "Outro";
  };

  const openExpenseEditor = (expenseId: string) => {
    navigate("EditExpense", {
      id: expenseId,
      expenseId,
      returnTo: "Budget",
    });
  };

  const openAddExpenseForDay = (date: Date) => {
    navigate("AddExpense", {
      prefillDate: formatDateToString(date),
      prefillExpenseType: "consumption",
      consumptionOnly: true,
      returnTo: "Budget",
      returnParams: { clientId: clientId || undefined },
    });
  };

  const handleEditDay = (date: Date) => {
    const dateKey = formatDateToString(date);
    const items = expensesByDate[dateKey] || [];
    const isZeroConfirmed =
      getDayExpense(date) === 0 && zeroConfirmedDateKeys.includes(dateKey);

    if (items.length === 0 || isZeroConfirmed) {
      openAddExpenseForDay(date);
      return;
    }

    setEditingDateKey(dateKey);
  };

  const handleOpenNoRecordActions = (date: Date) => {
    if (!user || isSpectator) return;
    const label = formatDayMonthLabel(date);

    setChoiceModalDayLabel(label);
    setChoiceModalDate(date);
    setChoiceModalVisible(true);
  };

  const handleCloseChoiceModal = () => {
    setChoiceModalVisible(false);
    setChoiceModalDate(null);
  };

  const handleChooseRegister = () => {
    if (isSpectator || !choiceModalDate) return;
    const date = choiceModalDate;
    setChoiceModalVisible(false);
    setChoiceModalDate(null);
    // iOS: o Modal nativo pode ficar preso se a tela trocar no mesmo tick
    setTimeout(
      () => openAddExpenseForDay(date),
      Platform.OS === "ios" ? 350 : 0,
    );
  };

  const handleChooseMarkZero = async () => {
    if (!user || isSpectator || !choiceModalDate) return;
    setChoiceModalVisible(false);
    try {
      setSaving(true);
      const { ranking } = await budgetServices.confirmZeroExpenseDay(
        user.id,
        choiceModalDate,
      );
      await loadBudgetData({ silent: true });
      const feedback = getRankingRegistrationFeedback(ranking, "zero");
      if (feedback.celebrate) {
        setShowConfetti(true);
      }
      Alert.alert(feedback.title, feedback.message);
    } catch (err) {
      console.error("❌ [BUDGET] Erro ao confirmar zero:", err);
      Alert.alert("Erro", "Não foi possível confirmar o zero agora.");
    } finally {
      setSaving(false);
    }
  };

  const handleCorrectDayToZero = (date: Date) => {
    if (!user || isSpectator) return;
    setCorrectZeroModalDayLabel(formatDayMonthLabel(date));
    setCorrectZeroModalDate(date);
    setCorrectZeroModalVisible(true);
  };

  const handleCancelCorrectZero = () => {
    setCorrectZeroModalVisible(false);
    setCorrectZeroModalDate(null);
  };

  const executeCorrectDayToZero = async () => {
    if (!user || isSpectator || !correctZeroModalDate) return;

    const date = correctZeroModalDate;
    setCorrectZeroModalVisible(false);

    try {
      setSaving(true);
      const { ranking } = await budgetServices.correctConsumoModeradoDayToZero(
        user.id,
        date,
      );
      setEditingDateKey(null);
      setCorrectZeroModalDate(null);
      await loadBudgetData({ silent: true });
      const feedback = getRankingRegistrationFeedback(ranking, "zero");
      if (feedback.celebrate) {
        setShowConfetti(true);
      }
      Alert.alert(feedback.title, feedback.message);
    } catch (err: any) {
      console.error("❌ [BUDGET] Erro ao corrigir dia para zero:", err);
      Alert.alert(
        "Erro",
        err?.message || "Não foi possível corrigir o dia agora.",
      );
    } finally {
      setSaving(false);
    }
  };

  const getDayExpense = (date: Date): number => {
    const dateKey = formatDateToString(date);
    const expense = dailyExpenses.find((item) => item.dateKey === dateKey);
    return expense ? expense.amount : 0;
  };

  if (loading) {
    return (
      <Layout
        title="Controle de Orçamento"
        showBackButton={isSpectator}
        showSidebar={!isSpectator}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando orçamento...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Consumo Moderado"
      showBackButton={isSpectator}
      showSidebar={!isSpectator}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="wallet-outline" size={64} color="#8c52ff" />
            <Text style={styles.title}>Orçamento Mensal</Text>
            <Text style={styles.subtitle}>
              Controle quanto você pode gastar por dia
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

          {/* Meta Mensal */}
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
              {planningLoaded
                ? "Cálculo: gasto esperado do ciclo menos total gasto até agora."
                : "Planejamento não encontrado. O valor ficará em R$ 0,00 até o consultor preencher o planejamento."}
            </Text>
            <View style={styles.infoContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#999"
              />
              <Text style={styles.infoText}>
                Quando ultrapassar o planejado, o valor exibido fica em R$ 0,00.
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

            {budgetValue > 0 && planningTotals ? (
              <View style={styles.plannedSplitSection}>
                <Text style={styles.plannedSplitTitle}>
                  Planejado no ciclo
                </Text>
                <View style={styles.plannedSplitRow}>
                  <View style={styles.plannedSplitItem}>
                    <Ionicons name="cash-outline" size={18} color="#8c52ff" />
                    <Text style={styles.plannedSplitLabel}>Dinheiro</Text>
                    <Text style={styles.plannedSplitValue}>
                      {formatCurrency(planningTotals.consumoModeradoCash || 0)}
                    </Text>
                  </View>
                  <View style={styles.plannedSplitItem}>
                    <Ionicons name="card-outline" size={18} color="#8c52ff" />
                    <Text style={styles.plannedSplitLabel}>Cartão</Text>
                    <Text style={styles.plannedSplitValue}>
                      {formatCurrency(planningTotals.consumoModeradoCard || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}
          </View>

          {/* Estatísticas */}
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
                  {zeroConfirmedDateKeys.length}
                </Text>
              </View>
            </View>
          )}

          {/* Lista de Dias */}
          {budgetValue > 0 && (
            <View style={styles.daysCard}>
              <Text style={styles.cardTitle}>📅 Gastos Diários</Text>
              <Text style={styles.cardSubtitle}>
                Registre quanto gastou em cada dia
              </Text>

              <View style={styles.daysList}>
                {dailyExpenseDates.map((date) => {
                  const day = date.getDate();
                  const dateKey = formatDateToString(date);
                  const expense = getDayExpense(date);
                  const isEditing = editingDateKey === dateKey;
                  const isZeroConfirmed =
                    expense === 0 && zeroConfirmedDateKeys.includes(dateKey);

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
                          {formatDayMonthLabel(date)}
                        </Text>
                        {!isEditing && expense > 0 && (
                          <Text style={styles.dayExpense}>
                            {formatCurrency(expense)}
                          </Text>
                        )}
                        {!isEditing && expense === 0 && !isZeroConfirmed && (
                          <Text style={styles.dayEmpty}>Sem registro</Text>
                        )}
                        {!isEditing && isZeroConfirmed && (
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

                      {!isSpectator &&
                        (isEditing ? (
                        <View style={styles.editItemsWrap}>
                          {(expensesByDate[dateKey] || []).map((item) => (
                            <TouchableOpacity
                              key={item.id}
                              style={styles.editItemRow}
                              onPress={() => openExpenseEditor(item.id)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={styles.editItemTitle}>
                                  {item.description || "Gasto"}
                                </Text>
                                <Text style={styles.editItemMeta}>
                                  {getExpensePaymentLabel(item.paymentMethod)}
                                </Text>
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
                            onPress={() => openAddExpenseForDay(date)}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                            <Text style={styles.addItemButtonText}>
                              Adicionar lançamento
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.correctZeroButton}
                            onPress={() => handleCorrectDayToZero(date)}
                          >
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={16}
                              color="#8c52ff"
                            />
                            <Text style={styles.correctZeroButtonText}>
                              Corrigir: marcar como zero
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setEditingDateKey(null)}
                          >
                            <Ionicons name="close" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : expense === 0 && !isZeroConfirmed ? (
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
                          onPress={() => handleEditDay(date)}
                        >
                          <Ionicons name="pencil" size={18} color="#8c52ff" />
                        </TouchableOpacity>
                      ))}
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
                Aguarde o planejamento do consultor para iniciar o consumo
                moderado
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
      </KeyboardAvoidingView>
      <Modal
        transparent
        visible={choiceModalVisible}
        animationType="fade"
        onRequestClose={handleCloseChoiceModal}
      >
        <Pressable
          style={modalStyles.backdrop}
          onPress={handleCloseChoiceModal}
        >
          <Pressable
            style={modalStyles.container}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={modalStyles.title}>Dia sem registro</Text>
            <Text style={modalStyles.message}>{choiceModalDayLabel}</Text>
            <View style={modalStyles.actionsRow}>
              <TouchableOpacity
                style={modalStyles.buttonPurple}
                onPress={handleChooseMarkZero}
              >
                <Text style={modalStyles.buttonWhiteLabel}>
                  Marcar zero no app
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.buttonPink}
                onPress={handleChooseRegister}
              >
                <Text style={modalStyles.buttonWhiteLabel}>
                  Registrar gasto
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={modalStyles.dismissButton}
              onPress={handleCloseChoiceModal}
            >
              <Text style={modalStyles.dismissLabel}>Voltar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={correctZeroModalVisible}
        animationType="fade"
      >
        <View style={modalStyles.backdrop}>
          <View style={modalStyles.container}>
            <Text style={modalStyles.title}>Corrigir para zero</Text>
            <Text style={modalStyles.message}>
              Isso remove os gastos de {correctZeroModalDayLabel} e marca o dia
              como zero confirmado. No ranking você ganha 1 ponto (em vez de 2),
              pois havia gasto registrado antes.
            </Text>
            <View style={modalStyles.actionsRow}>
              <TouchableOpacity
                style={modalStyles.buttonPurple}
                onPress={handleCancelCorrectZero}
                disabled={saving}
              >
                <Text style={modalStyles.buttonWhiteLabel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modalStyles.buttonPink}
                onPress={executeCorrectDayToZero}
                disabled={saving}
              >
                <Text style={modalStyles.buttonWhiteLabel}>
                  {saving ? "Corrigindo..." : "Confirmar correção"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  topTotalsWrapper: { gap: 12, marginBottom: 8 },
  topTotalCardFull: {
    backgroundColor: "#121212",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  topTotalLabel: { color: "#999", fontSize: 13 },
  topTotalValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 6,
  },
  topTotalsRow: { flexDirection: "row", marginTop: 8 },
  topTotalSmall: {
    flex: 1,
    backgroundColor: "#0f0b12",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  topTotalSmallLabel: { color: "#999", fontSize: 12 },
  topTotalSmallValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
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
  currencySymbol: {
    fontSize: 18,
    color: "#999",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    paddingVertical: 12,
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
  plannedSplitSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  plannedSplitTitle: {
    color: "#bbb",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  plannedSplitRow: {
    flexDirection: "row",
    gap: 8,
  },
  plannedSplitItem: {
    flex: 1,
    backgroundColor: "#121212",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  plannedSplitLabel: {
    color: "#999",
    fontSize: 11,
    fontWeight: "600",
  },
  plannedSplitValue: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
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
  correctZeroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8c52ff",
    backgroundColor: "rgba(140, 82, 255, 0.08)",
  },
  correctZeroButtonText: {
    color: "#8c52ff",
    fontSize: 13,
    fontWeight: "600",
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
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayInput: {
    width: 80,
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "#8c52ff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  editIconButton: {
    padding: 8,
  },
  alertIconButton: {
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: "#8c52ff",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#ff4d6d",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  planningSection: { marginTop: 12, gap: 12 },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: "#0f0f12",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  emptyTextSmall: { color: "#999", fontSize: 13 },
  itemCard: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#151515",
  },
  itemTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  itemSub: { color: "#999", fontSize: 13, marginTop: 4 },
  itemMethod: { color: "#cfcfcf", fontSize: 12 },
  itemMeta: { color: "#b5b5b5", fontSize: 12, marginTop: 2 },
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
  dismissButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  dismissLabel: {
    color: "#a89fc0",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default BudgetScreen;
