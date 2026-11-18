/**
 * Tela Home - Dashboard Inicial
 */

import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
  LayoutAnimation,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { useDesktopWeb } from "../../utils/desktopWeb";
import { useAuth } from "../../hooks/useAuth";
import { useShowValues } from "../../contexts/ShowValuesContext";
import { isStaffUser } from "../../services/userServices";
import incomeServices from "../../services/incomeServices";
import expenseServices from "../../services/expenseServices";
import {
  budgetServices,
  type ConsumoModeradoPerformance,
} from "../../services/budgetServices";
import { planningServices } from "../../services/planningServices";
import { activityServices } from "../../services/activityServices";
import {
  requestNotificationPermissions,
  syncExpectedIncomeNotifications,
} from "../../services/notificationServices";
import { formatCurrency } from "../../utils/currencyUtils";
import { incomeTransactionLabel } from "../../utils/incomeEntry";
import { computePlanningTotals } from "../../utils/planningDisplayUtils";
import { perfMark, perfMeasure } from "../../utils/perfMarks";
import MaskedAmount from "../../components/ui/MaskedAmount";
import CardWaveBg, {
  CardWaveWarmup,
} from "../../components/ui/CardWaveBg";
import {
  formatDateForDisplay,
  formatDateToString,
  subtractDays,
  getStartOfDay,
  getEndOfDay,
  getFirstDayOfMonth,
} from "../../utils/dateUtils";
import {
  getZeroPromptSessionKey,
  isZeroPromptResolvedForSession,
  markZeroPromptResolvedForSession,
} from "../../utils/zeroPromptSessionCache";
import { Income } from "../../types/income";
import { Expense } from "../../types/expense";
import {
  CategoryData,
  LineChart,
  LineChartData,
  PieChart,
  ConsumoModeradoBg,
} from "../../components/Charts";
import { premium, premiumCardShadow } from "../../theme/visaoPremium";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/category";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";
import { getRankingRegistrationFeedback } from "../../services/rankingPlanilhaService";
import { OpeningExpenseEntry } from "../../types/openingExpense";
import { registerOpeningExpenses } from "../../utils/openingExpenseRegistration";
import ConfirmDeleteModal from "../../components/ui/ConfirmDeleteModal";
import ConfettiCelebration from "../../components/ui/ConfettiCelebration";
import ExpectedDetails from "../../components/ui/ExpectedDetails";
import { profileDisplayName } from "../../utils/chatDisplayNames";
import {
  getExpenseScopeLabel,
  shouldShowExpenseCategoryTag,
} from "../../utils/expenseScopeUtils";
import { HomeDesktopDashboard } from "./HomeDesktopDashboard";

export const HomeScreen = () => {
  const desktop = useDesktopWeb();
  const { navigate, currentScreen } = useNavigation();
  const { user, activeCoupleMember } = useAuth();
  const { showValues, toggleShowValues } = useShowValues();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [realizedExpenseTotal, setRealizedExpenseTotal] = useState(0);
  const [realizedBalance, setRealizedBalance] = useState(0);
  const [balance, setBalance] = useState(0);
  const [expectedExpenses, setExpectedExpenses] = useState<number | null>(null);
  const [expectedIncomes, setExpectedIncomes] = useState<number | null>(null);
  const [expectedSavings, setExpectedSavings] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [planningData, setPlanningData] = useState<any | null>(null);
  const [allTransactions, setAllTransactions] = useState<
    Array<{
      item: Income | Expense;
      type: "income" | "expense";
    }>
  >([]);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">(
    "all",
  );
  const transactionsListRef = useRef<FlatList>(null);
  const homeScrollOffsetRef = useRef(0);
  const restoreHomeScrollRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryChartData, setCategoryChartData] = useState<CategoryData[]>(
    [],
  );
  const [lineChartData, setLineChartData] = useState<LineChartData[]>([]);
  const [activePeriodLabel, setActivePeriodLabel] = useState("Este mês");
  const [consumoCardSize, setConsumoCardSize] = useState({ w: 320, h: 168 });
  const [consumoModeradoPerformance, setConsumoModeradoPerformance] =
    useState<ConsumoModeradoPerformance | null>(null);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const zeroPromptCheckInFlightRef = useRef(false);
  const loadInProgressRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroTrackedOptions, setZeroTrackedOptions] = useState<string[]>([]);
  const [confirmingZero, setConfirmingZero] = useState(false);
  const [trackedZerosFollowUp, setTrackedZerosFollowUp] = useState<{
    day: Date;
    dayLabel: string;
    titles: string[];
    pendingFeedback?: { title: string; message: string };
  } | null>(null);
  const [savingTrackedZerosFollowUp, setSavingTrackedZerosFollowUp] =
    useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<{
    id: string;
    type: "income" | "expense";
    description: string;
    value: number;
  } | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [expanded, setExpanded] = useState<"income" | "expense" | null>(null);

  // Função para obter cor de categoria
  const getCategoryColor = (categoryName: string): string => {
    const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(
      (cat) => cat.name === categoryName,
    );
    if (defaultCat) return defaultCat.color;

    // Cores padrão para categorias não mapeadas
    const colors = [
      "#FF008A",
      "#B900FF",
      "#6b6480",
      "#FF008A",
      "#a47aff",
      "#FF008A",
      "#c084fc",
      "#6b6480",
      "#B900FF",
      "#a47aff",
    ];
    const hash = categoryName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const isCreditCardExpense = (expense: Expense | any) => {
    const paymentMethod = String(expense?.paymentMethod || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    const isCardMethod =
      paymentMethod === "credit_card" ||
      paymentMethod === "debit_card" ||
      paymentMethod === "card" ||
      paymentMethod === "cart" ||
      paymentMethod === "cartao" ||
      paymentMethod === "credito" ||
      paymentMethod === "credit" ||
      paymentMethod === "debito";

    return isCardMethod || Boolean(expense?.cardId);
  };

  // Carregar dados do mês atual
  const loadData = async (force = false) => {
    if (!user?.id) {
      console.log("⚠️ [HOME] Usuário não disponível, pulando carregamento");
      setLoading(false);
      return;
    }

    if (loadInProgressRef.current && !force) {
      console.log("⚠️ [HOME] Carregamento em andamento, pulando...");
      return;
    }

    const requestId = ++loadRequestIdRef.current;
    loadInProgressRef.current = true;

    try {
      perfMark("home.load.start");
      console.log("🏠 [HOME] Iniciando carregamento de dados...", {
        userId: user.id,
        force,
      });
      if (!hasLoaded) {
        setLoading(true);
      }

      const today = new Date();
      const startOfMonth = getFirstDayOfMonth(today);
      const endOfToday = getEndOfDay(today);
      let activeStartDate = startOfMonth;
      let activeEndDate = endOfToday;
      let createdAtFrom: Date | undefined;

      // Load planning first to respect cycle start/end when present.
      let planning: any = null;
      try {
        if (!isStaffUser(user)) {
          planning = await planningServices.getPlanning(user.id);
          perfMeasure("home.planning", "home.load.start");

          if (planning?.consumoModeradoCycleStartedAt) {
            const cycleStartedAt = new Date(
              planning.consumoModeradoCycleStartedAt,
            );
            createdAtFrom = cycleStartedAt;
            activeStartDate = getStartOfDay(cycleStartedAt);
            setActivePeriodLabel("No ciclo");

            if (planning?.consumoModeradoCycleEndedAt) {
              const cycleEnd = getEndOfDay(
                new Date(planning.consumoModeradoCycleEndedAt),
              );
              activeEndDate = cycleEnd < endOfToday ? cycleEnd : endOfToday;
            }
          } else {
            setActivePeriodLabel("Este mês");
          }
        } else {
          setActivePeriodLabel("Este mês");
        }
      } catch (err) {
        console.error("❌ [HOME] Erro ao buscar planning:", err);
        setActivePeriodLabel("Este mês");
      }

      if (activeEndDate < activeStartDate) {
        activeEndDate = getEndOfDay(activeStartDate);
      }

      // Período para gráfico de linha (últimos 7 dias)
      const sevenDaysAgo = getStartOfDay(subtractDays(today, 6));
      const lineChartStartDate =
        sevenDaysAgo > activeStartDate ? sevenDaysAgo : activeStartDate;
      const canLoadLineChart = lineChartStartDate <= activeEndDate;

      console.log("🏠 [HOME] Buscando dados do período:", {
        start: activeStartDate,
        end: activeEndDate,
      });

      // Carregar totais, transações e dados dos gráficos em paralelo (respeitando ciclo)
      const [allIncomes, allExpenses] = await Promise.all([
        incomeServices
          .getIncomes(user.id, {
            startDate: activeStartDate,
            endDate: activeEndDate,
            createdAtFrom,
          })
          .catch((err) => {
            console.error("❌ [HOME] Erro ao buscar rendas:", err);
            return [];
          }),
        expenseServices
          .getExpenses(user.id, {
            startDate: activeStartDate,
            endDate: activeEndDate,
            excludeSectionOnly: true,
            createdAtFrom,
          })
          .catch((err) => {
            console.error("❌ [HOME] Erro ao buscar gastos:", err);
            return [];
          }),
      ]);
      const incomeTotal = allIncomes.reduce(
        (sum, income) => sum + Number(income.value || 0),
        0,
      );
      const expenseTotal = allExpenses.reduce(
        (sum, expense) => sum + Number(expense.value || 0),
        0,
      );
      const expensesByCategory = expenseServices.groupLoadedExpenses(allExpenses);
      const withinLineChart = (value: unknown) => {
        const date =
          value instanceof Date ? value : new Date(value as string | number);
        return !Number.isNaN(date.getTime()) && date >= lineChartStartDate;
      };
      const last7DaysIncomes = canLoadLineChart
        ? allIncomes.filter((income) => withinLineChart(income.date))
        : [];
      const last7DaysExpenses = canLoadLineChart
        ? allExpenses.filter((expense) => withinLineChart(expense.date))
        : [];

      setPlanningData(planning || null);

      // compute expected values if planning exists
      let calcExpectedExpenses: number | null = null;
      let calcExpectedIncomes: number | null = null;
      let calcExpectedSavings: number | null = null;
      if (planning) {
        const planningTotals = computePlanningTotals(planning);
        calcExpectedExpenses = planningTotals.totalCashExpenses;
        calcExpectedIncomes = planningTotals.totalResources;
        calcExpectedSavings = planningTotals.expectedSavings;
      }

      setExpectedExpenses(calcExpectedExpenses);
      setExpectedIncomes(calcExpectedIncomes);
      setExpectedSavings(calcExpectedSavings);

      perfMeasure("home.incomes-expenses", "home.load.start");

      console.log("🏠 [HOME] Dados recebidos:", {
        incomeTotal,
        expenseTotal,
        allIncomesCount: allIncomes.length,
        allExpensesCount: allExpenses.length,
        start: activeStartDate.toISOString(),
        end: activeEndDate.toISOString(),
      });

      // Combinar e ordenar por data de criação
      const allTransactionsWithType = [
        ...allIncomes.map((inc) => ({
          item: inc as Income | Expense,
          type: "income" as const,
          createdAt: inc.createdAt,
        })),
        ...allExpenses.map((exp) => ({
          item: exp as Income | Expense,
          type: "expense" as const,
          createdAt: exp.createdAt,
        })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((t) => ({ item: t.item, type: t.type }));

      const calculatedBalance = incomeTotal - expenseTotal;

      // Preparar dados do gráfico de categorias
      const categoryData: CategoryData[] = (expensesByCategory || [])
        .slice(0, 5) // Top 5 categorias
        .map((item) => ({
          category: item.category || "Outros",
          total: item.total || 0,
          percentage: item.percentage || 0,
          color: getCategoryColor(item.category || "Outros"),
        }));
      setCategoryChartData(categoryData);

      // Preparar dados do gráfico de linha (últimos 7 dias)
      const daysData: LineChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = subtractDays(today, i);
        const dateStr = formatDateToString(date);

        const dayIncomes = (last7DaysIncomes || []).filter(
          (inc) => inc && inc.date && formatDateToString(inc.date) === dateStr,
        );
        const dayExpenses = (last7DaysExpenses || []).filter(
          (exp) => exp && exp.date && formatDateToString(exp.date) === dateStr,
        );

        const incomeTotal = dayIncomes.reduce(
          (sum, inc) => sum + (inc.value || 0),
          0,
        );
        const expenseTotal = dayExpenses.reduce(
          (sum, exp) => sum + (exp.value || 0),
          0,
        );

        daysData.push({
          date,
          income: incomeTotal || 0,
          expense: expenseTotal || 0,
        });
      }
      setLineChartData(daysData);

      // Atualizar estados
      if (requestId !== loadRequestIdRef.current) {
        return;
      }

      if (isStaffUser(user)) {
        setConsumoModeradoPerformance(null);
      }

      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      const realizedExpenseAll = allExpenses.reduce(
        (sum, expense) => sum + (Number(expense.value) || 0),
        0,
      );
      const realizedExpenses = allExpenses.filter(
        (expense) => !isCreditCardExpense(expense),
      );
      const realizedExpenseForBalance = realizedExpenses.reduce(
        (sum, expense) => sum + (Number(expense.value) || 0),
        0,
      );
      const realizedBalanceTotal = incomeTotal - realizedExpenseForBalance;
      setRealizedExpenseTotal(realizedExpenseAll);
      setRealizedBalance(realizedBalanceTotal);
      setBalance(calculatedBalance);
      setAllTransactions(allTransactionsWithType);
      setHasLoaded(true);
      perfMeasure("home.ready", "home.load.start");

      if (!isStaffUser(user)) {
        // Secundário: não segura a tela. O card atualiza quando chegar.
        void budgetServices
          .getConsumoModeradoPerformance(user.id, {
            planning,
            expenses: allExpenses,
          })
          .then((performance) => {
            if (requestId !== loadRequestIdRef.current) return;
            setConsumoModeradoPerformance(performance);
            perfMeasure("home.performance", "home.load.start");
          })
          .catch(() => undefined);
      }

      if (planning && !isStaffUser(user)) {
        const expected = (planning.expectedIncomes || []).map((income: any) => ({
          id: String(income.id || ""),
          source: String(income.source || "Renda esperada"),
          expectedMonth: income.expectedMonth,
        }));
        void requestNotificationPermissions()
          .then((hasPermission) => {
            if (!hasPermission) return;
            return syncExpectedIncomeNotifications(user.id, expected);
          })
          .catch(() => undefined);
      }

      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      console.log("✅ [HOME] Dados carregados e estados atualizados:", {
        incomeTotal: incomeTotal,
        expenseTotal: expenseTotal,
        balance: calculatedBalance,
        transactionsCount: allTransactionsWithType.length,
        formattedIncome: formatCurrency(incomeTotal),
        formattedExpense: formatCurrency(expenseTotal),
        formattedBalance: formatCurrency(calculatedBalance),
      });
    } catch (error: any) {
      console.error("❌ [HOME] Erro geral ao carregar dados:", error);
      console.error("❌ [HOME] Detalhes do erro:", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      if (requestId !== loadRequestIdRef.current) {
        return;
      }
      setTotalIncome(0);
      setTotalExpense(0);
      setRealizedExpenseTotal(0);
      setRealizedBalance(0);
      setBalance(0);
      setAllTransactions([]);
      setHasLoaded(true); // Marcar como carregado mesmo com erro para mostrar estado vazio
    } finally {
      if (loadRequestIdRef.current === requestId) {
        console.log("🏠 [HOME] Finalizando carregamento...");
        loadInProgressRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const toggleExpand = (key: "income" | "expense") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === key ? null : key));
  };

  const buildExpenseSummary = (planning: any) => {
    if (!planning) return [] as any[];
    const map: Record<string, number> = {};

    const isCardPayment = (method?: string) => {
      const normalized = String(method || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      return (
        normalized === "card" ||
        normalized === "credit_card" ||
        normalized === "debit_card" ||
        normalized === "cart" ||
        normalized === "cartao" ||
        normalized === "credito" ||
        normalized === "credit"
      );
    };

    const getNonCardPortion = (item: any) => {
      const cashAmount = Number(item?.amountCash);
      if (Number.isFinite(cashAmount) && cashAmount > 0) {
        return cashAmount;
      }

      if (isCardPayment(item?.paymentMethod)) {
        return 0;
      }

      const amount = Number(item?.amount);
      return Number.isFinite(amount) ? amount : 0;
    };

    // plannedByCategory is an object { categoryName: value }
    if (planning.plannedByCategory) {
      Object.entries(planning.plannedByCategory).forEach(([k, v]) => {
        const n = Number(v) || 0;
        map[k] = (map[k] || 0) + n;
      });
    }
    // expectedExpenses array
    (planning.expectedExpenses || []).forEach((it: any) => {
      const n = getNonCardPortion(it);
      if (n <= 0) return;
      const key = it.categoryId || it.source || "Outros";
      map[key] = (map[key] || 0) + n;
    });
    // bills
    (planning.bills || []).forEach((b: any) => {
      if (b?.inactive === true) return;
      const n = getNonCardPortion(b);
      if (n <= 0) return;
      const key = b.name || "Contas";
      map[key] = (map[key] || 0) + n;
    });

    const items = Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((s, it) => s + it.value, 0) || 1;
    return items
      .slice(0, 3)
      .map((it) => ({ ...it, percent: (it.value / total) * 100 }));
  };

  const buildIncomeSummary = (planning: any) => {
    if (!planning) return [] as any[];
    const map: Record<string, number> = {};
    const monthly = Number(planning.monthlyIncome) || 0;
    if (monthly > 0) map["Salário"] = monthly;
    (planning.expectedIncomes || []).forEach((it: any) => {
      const key = it.source || it.categoryId || "Outros";
      const n = Number(it.amount) || 0;
      map[key] = (map[key] || 0) + n;
    });
    const items = Object.entries(map)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    const total = items.reduce((s, it) => s + it.value, 0) || 1;
    return items
      .slice(0, 3)
      .map((it) => ({ ...it, percent: (it.value / total) * 100 }));
  };

  const checkZeroPlanilhaForYesterday = async () => {
    if (!user?.id) return;

    if (isStaffUser(user)) {
      return;
    }

    // Não perguntar no primeiro dia do usuário (quando a conta foi criada hoje)
    try {
      const rawCreated = (user as any).createdAt;
      if (rawCreated) {
        const createdDate =
          typeof rawCreated === "string"
            ? new Date(rawCreated)
            : rawCreated instanceof Date
              ? rawCreated
              : new Date(rawCreated);

        const startOfCreated = getStartOfDay(createdDate);
        const startOfToday = getStartOfDay(new Date());
        if (startOfCreated.getTime() === startOfToday.getTime()) {
          // Usuário criado hoje — não solicitar confirmação do dia anterior
          return;
        }
      }
    } catch (e) {
      // Se qualquer erro ao interpretar createdAt, continuar com verificação
      if (__DEV__) console.log("[HOME] erro ao interpretar createdAt:", e);
    }

    const yesterday = getStartOfDay(subtractDays(new Date(), 1));

    try {
      const planning = await planningServices.getPlanning(user.id);
      const cycleStartedAt = planning?.consumoModeradoCycleStartedAt;
      if (cycleStartedAt) {
        const cycleStart = getStartOfDay(new Date(cycleStartedAt));
        if (yesterday.getTime() < cycleStart.getTime()) {
          return;
        }

        const cycleEndedAt = planning?.consumoModeradoCycleEndedAt;
        if (cycleEndedAt) {
          const cycleEnd = getStartOfDay(new Date(cycleEndedAt));
          if (yesterday.getTime() > cycleEnd.getTime()) {
            return;
          }
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.log("[HOME] erro ao validar ciclo no prompt de ontem:", e);
      }
    }

    const sessionKey = getZeroPromptSessionKey(user.id, yesterday);

    if (isZeroPromptResolvedForSession(sessionKey)) {
      return;
    }

    if (zeroPromptCheckInFlightRef.current) {
      return;
    }

    zeroPromptCheckInFlightRef.current = true;

    try {
      await budgetServices.syncRankingPenalties(
        user.id,
        new Date(),
        activeCoupleMember,
      );

      const alreadyResolved = await budgetServices.isDayExpensePromptResolved(
        user.id,
        yesterday,
        activeCoupleMember,
      );

      if (alreadyResolved) {
        markZeroPromptResolvedForSession(sessionKey);
        return;
      }

      const yesterdayLabel = formatDateForDisplay(yesterday);
      try {
        const planning = await planningServices.getPlanning(user.id);
        const tracked = [
          ...(planning?.bills || [])
            .filter((b: any) => b.dailyTracking)
            .map((b: any) => String(b.name || "")),
          ...(planning?.expectedExpenses || [])
            .filter((e: any) => e.dailyTracking)
            .map((e: any) => String(e.source || "")),
        ].filter((name) => name.trim().length > 0);
        setZeroTrackedOptions(Array.from(new Set(tracked)));
      } catch {
        setZeroTrackedOptions([]);
      }
      setZeroConfirmDayLabel(yesterdayLabel);
      setZeroConfirmDate(yesterday);
      setZeroConfirmVisible(true);
    } catch (error) {
      console.error("❌ [HOME] Erro ao verificar dia sem gasto:", error);
    } finally {
      zeroPromptCheckInFlightRef.current = false;
    }
  };

  const markYesterdayPromptResolved = () => {
    if (!user?.id || !zeroConfirmDate) return;
    markZeroPromptResolvedForSession(
      getZeroPromptSessionKey(user.id, zeroConfirmDate),
    );
  };

  const registerTrackedZerosForDay = async (
    day: Date,
    titles: string[],
  ): Promise<void> => {
    if (!user?.id || titles.length === 0) return;

    for (const title of titles) {
      await budgetServices.confirmZeroExpenseDayForTracked(
        user.id,
        day,
        title,
        activeCoupleMember,
      );
    }
  };

  const showPendingFeedback = (feedback?: {
    title: string;
    message: string;
  }) => {
    if (!feedback) return;
    Alert.alert(feedback.title, feedback.message);
  };

  const processTrackedZerosAfterConsumoModerado = async (
    day: Date,
    pendingFeedback?: { title: string; message: string },
  ) => {
    if (!user?.id) {
      showPendingFeedback(pendingFeedback);
      return;
    }

    try {
      const missing =
        await budgetServices.listMissingTrackedDailyRecordsForDay(
          user.id,
          day,
          activeCoupleMember,
        );
      if (missing.length === 0) {
        showPendingFeedback(pendingFeedback);
        return;
      }

      const dayLabel = formatDateForDisplay(day);
      // Padrão ligado: undefined/ausente conta como true.
      const autoZero = user.autoZeroTrackedExpensesEnabled !== false;

      if (autoZero) {
        // Não: zero no CM + zeros nos acompanhados juntos, sem 2º popup.
        await registerTrackedZerosForDay(day, missing);
        showPendingFeedback(pendingFeedback);
        return;
      }

      // Toggle desligado: 2º popup só dos gastos acompanhados.
      setTrackedZerosFollowUp({
        day,
        dayLabel,
        titles: missing,
        pendingFeedback,
      });
    } catch (error) {
      console.error(
        "❌ [HOME] Erro ao verificar gastos acompanhados sem registro:",
        error,
      );
      showPendingFeedback(pendingFeedback);
    }
  };

  const dismissTrackedZerosFollowUp = () => {
    const feedback = trackedZerosFollowUp?.pendingFeedback;
    setTrackedZerosFollowUp(null);
    showPendingFeedback(feedback);
  };

  const confirmTrackedZerosFollowUp = async () => {
    if (!trackedZerosFollowUp) return;
    const { day, titles, pendingFeedback } = trackedZerosFollowUp;
    try {
      setSavingTrackedZerosFollowUp(true);
      await registerTrackedZerosForDay(day, titles);
      setTrackedZerosFollowUp(null);
      const successBody = pendingFeedback
        ? `Zeros registrados nos gastos acompanhados.\n\n${pendingFeedback.message}`
        : "Zeros registrados nos gastos acompanhados.";
      Alert.alert(pendingFeedback?.title || "Sucesso", successBody);
    } catch (error) {
      console.error(
        "❌ [HOME] Erro ao registrar zero nos acompanhados:",
        error,
      );
      Alert.alert(
        "Erro",
        "Não foi possível registrar os zeros nos gastos acompanhados.",
      );
    } finally {
      setSavingTrackedZerosFollowUp(false);
    }
  };

  const handleConfirmZeroPlanilha = async () => {
    if (!user?.id || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      const { ranking } = await budgetServices.confirmZeroExpenseDay(
        user.id,
        zeroConfirmDate,
        activeCoupleMember,
      );
      markYesterdayPromptResolved();

      await activityServices.logActivity(user.id, {
        type: "budget_updated",
        title: "✅ Zero no app confirmado",
        description: `Parabéns! O dia ${zeroConfirmDayLabel} foi registrado com ${formatCurrency(0)}.`,
      });

      const confirmedDay = zeroConfirmDate;

      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      const feedback = getRankingRegistrationFeedback(ranking, "zero");
      if (feedback.celebrate) {
        setShowConfetti(true);
      }

      // Pergunta dos acompanhados antes do Alert de ranking (web engolia o Alert anterior).
      await processTrackedZerosAfterConsumoModerado(confirmedDay, {
        title: feedback.title,
        message: feedback.message,
      });
    } catch (error) {
      console.error("❌ [HOME] Erro ao confirmar zero na planilha:", error);
      Alert.alert(
        "Erro",
        "Não foi possível confirmar o zero no app agora.",
      );
    } finally {
      setConfirmingZero(false);
    }
  };

  const handleRegisterOpeningExpenses = async (
    entries: OpeningExpenseEntry[],
  ) => {
    if (!user?.id || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    const coupleMember =
      activeCoupleMember === 1 || activeCoupleMember === 2
        ? activeCoupleMember
        : undefined;

    try {
      setConfirmingZero(true);
      await registerOpeningExpenses(user.id, zeroConfirmDate, entries, {
        coupleMember,
      });
      markYesterdayPromptResolved();

      const total = entries.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      await activityServices.logActivity(user.id, {
        type: "expense_created",
        title: "Gastos registrados",
        description: `${entries.length} lançamento(s) · ${formatCurrency(total)} no dia ${zeroConfirmDayLabel}.`,
      });

      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      await loadData();
      Alert.alert("Sucesso", "Gastos registrados com sucesso.");
    } catch (error) {
      console.error("❌ [HOME] Erro ao registrar gastos do dia:", error);
      Alert.alert("Erro", "Não foi possível registrar os gastos agora.");
    } finally {
      setConfirmingZero(false);
    }
  };

  const handleCancelZeroPlanilha = async () => {
    if (confirmingZero || !user?.id || !zeroConfirmDate) return;

    try {
      setConfirmingZero(true);
      await budgetServices.dismissExpensePromptForDay(
        user.id,
        zeroConfirmDate,
        activeCoupleMember,
      );
      markYesterdayPromptResolved();
    } catch (error) {
      console.error("❌ [HOME] Erro ao adiar confirmação de gasto:", error);
    } finally {
      setConfirmingZero(false);
      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
    }
  };

  // Carregar dados quando montar ou voltar ao foco
  useEffect(() => {
    // Só carregar se estiver na tela Home
    if (currentScreen !== "Home") {
      console.log("⚠️ [HOME] Não está na tela Home, pulando carregamento", {
        currentScreen,
      });
      return;
    }

    // Aguardar usuário estar disponível
    if (!user?.id) {
      console.log("⚠️ [HOME] Aguardando usuário...", {
        currentScreen,
        hasUser: !!user,
        userId: user?.id,
      });
      setLoading(false);
      return;
    }

    console.log("🏠 [HOME] Condições OK, iniciando carregamento...", {
      currentScreen,
      userId: user.id,
      hasLoaded,
      loading,
    });

    // Sempre recarregar quando volta para Home para garantir dados atualizados
    loadData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, user?.id]); // Recarregar quando mudar de tela ou usuário

  useEffect(() => {
    if (currentScreen !== "Home" || !user?.id) {
      return;
    }

    checkZeroPlanilhaForYesterday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, user?.id]);

  // Pull to refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Handler para deletar transação
  const handleDeleteTransaction = (
    id: string,
    type: "income" | "expense",
    description: string,
    value: number,
  ) => {
    if (!id) {
      Alert.alert("Erro", "Não foi possível identificar a transação.");
      return;
    }

    setTransactionToDelete({
      id,
      type,
      description: description || "Sem descrição",
      value,
    });
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || !user?.id) return;

    const { id, type, description, value } = transactionToDelete;

    try {
      setDeletingTransaction(true);

      if (type === "income") {
        await incomeServices.deleteIncome(id);
      } else {
        await expenseServices.deleteExpense(id);
      }

      setAllTransactions((previous) =>
        previous.filter((transaction) => (transaction.item as any).id !== id),
      );

      if (type === "income") {
        setTotalIncome((previous) => Math.max(0, previous - value));
        setBalance((previous) => previous - value);
        setRealizedBalance((previous) => previous - value);
      } else {
        setTotalExpense((previous) => Math.max(0, previous - value));
        setRealizedExpenseTotal((previous) => Math.max(0, previous - value));
        setBalance((previous) => previous + value);
        setRealizedBalance((previous) => previous + value);
      }

      setTransactionToDelete(null);
      await loadData(true);
    } catch (error: any) {
      console.error(`❌ Erro ao deletar ${type}:`, error);
      Alert.alert(
        "Erro",
        `Erro ao excluir ${type === "income" ? "a renda" : "o gasto"}. Tente novamente.`,
      );
    } finally {
      setDeletingTransaction(false);
    }
  };

  // Handler para editar transação
  const handleEditTransaction = (id: string, type: "income" | "expense") => {
    console.log(`✏️ Editando ${type}:`, id);
    if (type === "income") {
      navigate("EditIncome" as any, { id });
    } else {
      navigate("EditExpense" as any, { id });
    }
  };

  // Componente ActionCard com animação
  const ActionCard: React.FC<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    onPress: () => void;
    delay: number;
    fullWidth?: boolean;
    waveVariant?:
      | "actionIncome"
      | "actionExpense"
      | "actionIncomeList"
      | "actionExpenseList"
      | "actionPlanning";
  }> = ({ icon, label, color, onPress, delay, fullWidth, waveVariant }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          delay,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          delay,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <Animated.View
        style={[
          styles.actionCardWrapper,
          desktop && styles.actionCardDesktop,
          fullWidth && styles.actionCardFullWidth,
          fullWidth && desktop && styles.actionCardFullWidthDesktop,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.actionCard,
            waveVariant && styles.actionCardWithWave,
            fullWidth && styles.actionCardContentCentered,
            {
              borderColor: waveVariant ? "transparent" : `${color}40`,
              ...premiumCardShadow,
            },
          ]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          activeOpacity={0.9}
        >
          {waveVariant ? (
            <CardWaveBg
              variant={waveVariant}
              crop="action"
              opacity={1}
              borderRadius={12}
            />
          ) : null}
          <View
            style={[
              styles.actionIconContainer,
              styles.actionForeground,
              {
                backgroundColor: `${color}22`,
                borderColor: `${color}35`,
              },
            ]}
          >
            <Ionicons name={icon} size={18} color={color} />
          </View>
          <Text
            style={[
              styles.actionLabel,
              styles.actionForeground,
              fullWidth && styles.actionLabelCentered,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Componente TransactionItem com animação
  const TransactionItem: React.FC<{
    transaction: { item: Income | Expense; type: "income" | "expense" };
    index: number;
  }> = ({ transaction, index }) => {
    const { item, type } = transaction;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: Math.min(index, 6) * 40,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          delay: Math.min(index, 6) * 40,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    if (type === "expense") {
      const expense = item as Expense;
      return (
        <Animated.View
          key={expense.id}
          style={[
            styles.transactionItem,
            styles.transactionItemExpense,
            desktop && styles.transactionItemDesktop,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <CardWaveBg
            variant="txExpense"
            crop="fill"
            opacity={1}
            borderRadius={16}
          />
          <View style={[styles.transactionIcon, styles.transactionForeground]}>
            <View
              style={[
                styles.transactionIconContainer,
                styles.transactionIconExpense,
              ]}
            >
              <Ionicons name="remove-circle" size={22} color="#FF008A" />
            </View>
          </View>
          <View
            style={[styles.transactionContent, styles.transactionForeground]}
          >
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionDescription} numberOfLines={3}>
                {expense.description || "Sem descrição"}
              </Text>
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditTransaction(expense.id, "expense")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#B900FF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    handleDeleteTransaction(
                      expense.id,
                      "expense",
                      expense.description,
                      expense.value,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF008A" />
                </TouchableOpacity>
              </View>
            </View>
            {/* Tags de tipo e pagamento */}
            <View style={styles.transactionTagsRow}>
              {(() => {
                const scope = getExpenseScopeLabel(expense);
                const SCOPE_COLOR: Record<string, { color: string; bg: string }> = {
                  "Consumo Moderado": { color: "#c084fc", bg: "#280a3a" },
                  "Acompanhamento":   { color: "#34d399", bg: "#062820" },
                  "Conta":            { color: "#f87171", bg: "#300e0e" },
                };
                const PAYMENT_TAG: Record<string, { label: string; color: string; bg: string }> = {
                  credit_card: { label: "Crédito", color: "#c9b5ff", bg: "#2f214d" },
                  debit_card:  { label: "Débito",  color: "#86efac", bg: "#14351f" },
                  pix:         { label: "Pix",     color: "#67e8f9", bg: "#0e2e35" },
                  cash:        { label: "Dinheiro",color: "#fde68a", bg: "#352e10" },
                  other:       { label: "Outro",   color: "#aaa",    bg: "#222"    },
                };
                const scopeTag = scope ? SCOPE_COLOR[scope] : null;
                const pm = expense.paymentMethod ?? "other";
                const pmTag = PAYMENT_TAG[pm] ?? PAYMENT_TAG.other;
                const showCategory = shouldShowExpenseCategoryTag(expense);
                return (
                  <>
                    {scope && scopeTag ? (
                      <View style={[styles.transactionTag, { backgroundColor: scopeTag.bg, borderColor: scopeTag.color + "55" }]}>
                        <Text style={[styles.transactionTagText, { color: scopeTag.color }]}>{scope}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.transactionTag, { backgroundColor: pmTag.bg, borderColor: pmTag.color + "55" }]}>
                      <Text style={[styles.transactionTagText, { color: pmTag.color }]}>
                        {pmTag.label}{expense.paymentMethod === "credit_card" && expense.cardLast4 ? ` ••${expense.cardLast4}` : ""}
                      </Text>
                    </View>
                    {showCategory ? (
                      <View style={[styles.transactionTag, { backgroundColor: "#171321", borderColor: "#333" }]}>
                        <Text style={[styles.transactionTagText, { color: "#888" }]}>{expense.category}</Text>
                      </View>
                    ) : null}
                  </>
                );
              })()}
            </View>
            <View style={styles.transactionFooter}>
              <View style={styles.transactionPriceContainer}>
                <Text style={styles.transactionValueExpense}>
                  {showValues ? `-${formatCurrency(expense.value)}` : "R$ •••"}
                </Text>
              </View>
              <View style={styles.transactionDateContainer}>
                <Text style={styles.transactionDate}>
                  {formatDateForDisplay(expense.date)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      );
    } else {
      const income = item as Income;
      return (
        <Animated.View
          key={income.id}
          style={[
            styles.transactionItem,
            styles.transactionItemIncome,
            desktop && styles.transactionItemDesktop,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <CardWaveBg
            variant="txIncome"
            crop="fill"
            opacity={1}
            borderRadius={16}
          />
          <View style={[styles.transactionIcon, styles.transactionForeground]}>
            <View
              style={[
                styles.transactionIconContainer,
                styles.transactionIconIncome,
              ]}
            >
              <Ionicons name="cash" size={22} color="#B900FF" />
            </View>
          </View>
          <View
            style={[styles.transactionContent, styles.transactionForeground]}
          >
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionDescription} numberOfLines={3}>
                {incomeTransactionLabel(income)}
              </Text>
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditTransaction(income.id, "income")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#B900FF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    handleDeleteTransaction(
                      income.id,
                      "income",
                      income.description,
                      income.value,
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#FF008A" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.transactionFooter}>
              <View style={styles.transactionPriceContainer}>
                <Text style={styles.transactionValueIncome}>
                  {showValues ? `+${formatCurrency(income.value)}` : "R$ •••"}
                </Text>
              </View>
              <View style={styles.transactionDateContainer}>
                <Text style={styles.transactionDate}>
                  {formatDateForDisplay(income.date)}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      );
    }
  };

  // Filtrar transações baseado no filtro e busca
  const filteredTransactions = allTransactions.filter((transaction) => {
    // Aplicar filtro de tipo
    if (filterType === "income" && transaction.type !== "income") return false;
    if (filterType === "expense" && transaction.type !== "expense")
      return false;

    // Aplicar busca por descrição
    if (searchTerm.trim()) {
      const description =
        transaction.type === "income"
          ? (transaction.item as Income).description
          : (transaction.item as Expense).description;
      if (!description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  const handleFilterTypeChange = useCallback(
    (next: "all" | "income" | "expense") => {
      if (next === filterType) return;
      // FlatList zera o scroll ao trocar `data` — restaura a posição atual.
      restoreHomeScrollRef.current = true;
      setFilterType(next);
    },
    [filterType],
  );

  useLayoutEffect(() => {
    if (!restoreHomeScrollRef.current) return;
    restoreHomeScrollRef.current = false;
    const y = homeScrollOffsetRef.current;
    const restore = () => {
      transactionsListRef.current?.scrollToOffset({
        offset: y,
        animated: false,
      });
    };
    requestAnimationFrame(() => {
      restore();
      setTimeout(restore, 16);
      setTimeout(restore, 64);
    });
  }, [filterType, filteredTransactions.length]);

  const showExpectedSavingsHelp = () => {
    Alert.alert(
      "Poupança estimada",
      "Valor estimado a partir do seu planejamento: recursos previstos menos gastos previstos no período ativo (ciclo de consumo moderado ou mês corrente).",
    );
  };

  const pieChartVisualData = useMemo(
    () =>
      categoryChartData.map((item) => ({
        category: item.category,
        value: item.total,
        percentage: item.percentage,
        color: item.color,
      })),
    [categoryChartData],
  );

  const savingsPeriodLabel =
    activePeriodLabel === "No ciclo"
      ? "No ciclo (estimado)"
      : `${activePeriodLabel} (estimado)`;

  // Renderizar item de transação
  const renderTransactionItem = (
    transaction: { item: Income | Expense; type: "income" | "expense" },
    index: number,
  ) => {
    return <TransactionItem transaction={transaction} index={index} />;
  };

  // Mostrar loading apenas na primeira carga
  if (!hasLoaded && loading) {
    return (
      <Layout showHeader={true} showSidebar={true} desktopWidth={1080}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={premium.purple} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </Layout>
    );
  }

  if (desktop) {
    return (
      <Layout showHeader showSidebar>
        <HomeDesktopDashboard
          displayName={profileDisplayName(user, user?.email || "Usuário")}
          showValues={showValues}
          onToggleValues={toggleShowValues}
          activePeriodLabel={activePeriodLabel}
          expectedIncomes={expectedIncomes}
          expectedExpenses={expectedExpenses}
          expectedSavings={expectedSavings}
          totalIncome={totalIncome}
          realizedExpenseTotal={realizedExpenseTotal}
          realizedBalance={realizedBalance}
          isStaff={isStaffUser(user)}
          onOpenPlanning={() => navigate("PlanningView")}
          onOpenBudget={() => navigate("Budget")}
          onAddIncome={() => navigate("AddIncome")}
          onAddExpense={() => navigate("AddExpense")}
          onIncomeList={() => navigate("IncomeList")}
          onExpenseList={() => navigate("ExpenseList")}
          onShowSavingsHelp={showExpectedSavingsHelp}
          consumo={
            consumoModeradoPerformance
              ? {
                  label: consumoModeradoPerformance.label,
                  detail: consumoModeradoPerformance.detail,
                  color: consumoModeradoPerformance.color,
                  icon: consumoModeradoPerformance.icon as any,
                  actualDailyAverage:
                    consumoModeradoPerformance.actualDailyAverage,
                  idealDailyAverage:
                    consumoModeradoPerformance.idealDailyAverage,
                }
              : null
          }
          pieData={pieChartVisualData}
          lineData={lineChartData}
          filterType={filterType}
          onFilter={handleFilterTypeChange}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          transactions={filteredTransactions}
          onEdit={handleEditTransaction}
          onDelete={handleDeleteTransaction}
        />
        <ZeroPlanilhaConfirmModal
          visible={zeroConfirmVisible}
          dayLabel={zeroConfirmDayLabel}
          loading={confirmingZero}
          onCancel={handleCancelZeroPlanilha}
          onConfirmZero={handleConfirmZeroPlanilha}
          trackedOptions={zeroTrackedOptions}
          onConfirmEntries={handleRegisterOpeningExpenses}
        />
        <Modal
          visible={!!trackedZerosFollowUp}
          transparent
          animationType="fade"
          onRequestClose={dismissTrackedZerosFollowUp}
        >
          <View style={styles.trackedFollowUpOverlay}>
            <View style={styles.trackedFollowUpCard}>
              <Text style={styles.trackedFollowUpTitle}>
                E para gasto acompanhado?
              </Text>
              <Text style={styles.trackedFollowUpBody}>
                No dia {trackedZerosFollowUp?.dayLabel}, estes gastos acompanhados
                ainda não têm registro:{" "}
                {(trackedZerosFollowUp?.titles || []).join(", ")}. Deseja
                registrar zero neles também?
              </Text>
              <View style={styles.trackedFollowUpActions}>
                <TouchableOpacity
                  style={styles.trackedFollowUpSecondary}
                  onPress={dismissTrackedZerosFollowUp}
                  disabled={savingTrackedZerosFollowUp}
                >
                  <Text style={styles.trackedFollowUpSecondaryText}>
                    Agora não
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.trackedFollowUpPrimary}
                  onPress={() => {
                    void confirmTrackedZerosFollowUp();
                  }}
                  disabled={savingTrackedZerosFollowUp}
                >
                  {savingTrackedZerosFollowUp ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.trackedFollowUpPrimaryText}>
                      Registrar zero
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <ConfettiCelebration active={showConfetti} />
        <ConfirmDeleteModal
          visible={Boolean(transactionToDelete)}
          title="Excluir transação"
          message={
            transactionToDelete
              ? `Deseja excluir ${transactionToDelete.type === "income" ? "a renda" : "o gasto"} "${transactionToDelete.description}" de ${formatCurrency(transactionToDelete.value)}?`
              : ""
          }
          confirmLabel={deletingTransaction ? "Excluindo..." : "Excluir"}
          onCancel={() => {
            if (deletingTransaction) return;
            setTransactionToDelete(null);
          }}
          onConfirm={() => {
            if (deletingTransaction) return;
            void confirmDeleteTransaction();
          }}
        />
      </Layout>
    );
  }

  return (
    <Layout showHeader={true} showSidebar={true}>
      <CardWaveWarmup />
      <FlatList
        ref={transactionsListRef}
        style={styles.container}
        data={filteredTransactions}
        keyExtractor={(item, index) =>
          String((item.item as { id?: string }).id || index)
        }
        renderItem={({ item, index }) => renderTransactionItem(item, index)}
        initialNumToRender={12}
        maxToRenderPerBatch={8}
        windowSize={9}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          homeScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[premium.purple]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
            <Text style={styles.emptySubtext}>
              Comece adicionando uma renda ou gasto
            </Text>
          </View>
        }
        ListHeaderComponent={
        <View style={[styles.content, desktop && styles.contentDesktop]}>
          <View style={styles.pageGreeting}>
            <View style={styles.pageGreetingText}>
              <Text style={styles.pageGreetingHello}>Olá,</Text>
              <Text style={styles.pageGreetingName} numberOfLines={1}>
                {profileDisplayName(user, user?.email || "Usuário")}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleShowValues}
              style={styles.greetingEyeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={
                showValues ? "Ocultar valores" : "Mostrar valores"
              }
            >
              <Ionicons
                name={showValues ? "eye" : "eye-off"}
                size={24}
                color={premium.purpleSoft}
              />
            </TouchableOpacity>
          </View>
          {/* Cards de resumo rápido */}
          <Animated.View
            style={[
              styles.summaryContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {!isStaffUser(user) ? (
              // Normal user: show planning-based expected cards
              <>
                <View style={[styles.summaryRow, desktop && styles.summaryRowDesktop]}>
                  <View style={[styles.expectedSummaryColumn, desktop && styles.expectedSummaryColumnDesktop]}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleExpand("income")}
                      style={styles.expectedCardPressable}
                    >
                      <Animated.View
                        style={[
                          expanded === "income"
                            ? styles.expectedCardSquareExpanded
                            : styles.expectedCardSquare,
                          styles.cardGreen,
                          {
                            opacity: fadeAnim,
                            transform: [
                              {
                                translateY: Animated.add(
                                  slideAnim,
                                  new Animated.Value(10),
                                ),
                              },
                            ],
                          },
                        ]}
                      >
                        <CardWaveBg variant="v2Purple" crop="fill" opacity={1} />
                        <View
                          style={[
                            styles.cardIconContainer,
                            { backgroundColor: "rgba(185,0,255,0.16)" },
                          ]}
                        >
                          <Ionicons
                            name="cash"
                            size={18}
                            color={premium.purple}
                          />
                        </View>
                        <Text style={styles.summaryLabelIncome}>
                          Recursos Disponíveis
                        </Text>
                        {expectedIncomes === null ? (
                          <Text style={styles.summaryValueSquare}>-</Text>
                        ) : (
                          <MaskedAmount
                            value={expectedIncomes}
                            style={styles.summaryValueSquare}
                          />
                        )}
                        <Text style={styles.summarySubtext}>Este mês</Text>
                        <View style={styles.chevronContainer}>
                          <Ionicons
                            name={
                              expanded === "income"
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={18}
                            color="#999"
                            style={{
                              transform: [
                                {
                                  rotate:
                                    expanded === "income" ? "180deg" : "0deg",
                                },
                              ],
                            }}
                          />
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.expectedSummaryColumn, desktop && styles.expectedSummaryColumnDesktop]}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => toggleExpand("expense")}
                      style={styles.expectedCardPressable}
                    >
                      <Animated.View
                        style={[
                          expanded === "expense"
                            ? styles.expectedCardSquareExpanded
                            : styles.expectedCardSquare,
                          styles.cardRed,
                          {
                            opacity: fadeAnim,
                            transform: [
                              {
                                translateY: Animated.add(
                                  slideAnim,
                                  new Animated.Value(10),
                                ),
                              },
                            ],
                          },
                        ]}
                      >
                        <CardWaveBg variant="v2Magenta" crop="fill" opacity={1} />
                        <View
                          style={[
                            styles.cardIconContainer,
                            { backgroundColor: "rgba(255,0,138,0.16)" },
                          ]}
                        >
                          <Ionicons
                            name="calendar"
                            size={18}
                            color={premium.magenta}
                          />
                        </View>
                        <Text style={styles.summaryLabelExpense}>
                          Gasto Esperado
                        </Text>
                        {expectedExpenses === null ? (
                          <Text style={styles.summaryValueSquare}>-</Text>
                        ) : (
                          <MaskedAmount
                            value={expectedExpenses}
                            style={styles.summaryValueSquare}
                          />
                        )}
                        <Text style={styles.summarySubtext}>Este mês</Text>
                        <View style={styles.chevronContainer}>
                          <Ionicons
                            name={
                              expanded === "expense"
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={18}
                            color="#999"
                            style={{
                              transform: [
                                {
                                  rotate:
                                    expanded === "expense" ? "180deg" : "0deg",
                                },
                              ],
                            }}
                          />
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  </View>
                </View>

                {expanded !== null && (
                  <ExpectedDetails
                    items={
                      expanded === "expense"
                        ? buildExpenseSummary(planningData)
                        : buildIncomeSummary(planningData)
                    }
                    onSeeMore={() => navigate("PlanningView")}
                  />
                )}

                <Animated.View
                  style={[
                    styles.summaryCardHorizontal,
                    styles.premiumSavingsCard,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <CardWaveBg variant="v2Wide" crop="band" opacity={1} />
                  <View style={styles.premiumSavingsRow}>
                    <View style={styles.premiumSavingsIconCircle}>
                      <MaterialCommunityIcons
                        name="piggy-bank-outline"
                        size={20}
                        color={premium.purple}
                      />
                    </View>
                    <View style={styles.balanceTextContainer}>
                      <Text style={styles.summaryLabelBalance}>
                        Poupança Esperada
                      </Text>
                      <Text style={styles.summarySubtext}>
                        {savingsPeriodLabel}
                      </Text>
                    </View>
                    {expectedSavings === null ? (
                      <Text style={styles.premiumSavingsValue}>-</Text>
                    ) : (
                      <MaskedAmount
                        value={expectedSavings}
                        style={styles.premiumSavingsValue}
                      />
                    )}
                    <TouchableOpacity
                      onPress={showExpectedSavingsHelp}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.premiumSavingsHelpBtn}
                      accessibilityLabel="O que é poupança estimada"
                    >
                      <Ionicons
                        name="help-circle-outline"
                        size={22}
                        color={premium.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </Animated.View>

                {consumoModeradoPerformance ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => navigate("Budget")}
                  >
                    <View
                      style={[
                        styles.consumoModeradoCard,
                        desktop && styles.consumoModeradoCardDesktop,
                      ]}
                    >
                      <View
                        style={[
                          styles.consumoModeradoBgLayer,
                          desktop && styles.consumoModeradoBgLayerDesktop,
                        ]}
                        onLayout={(e) => {
                          const { width, height } = e.nativeEvent.layout;
                          if (
                            width !== consumoCardSize.w ||
                            height !== consumoCardSize.h
                          ) {
                            setConsumoCardSize({ w: width, h: height });
                          }
                        }}
                      >
                        <ConsumoModeradoBg
                          width={Math.max(consumoCardSize.w, 160)}
                          height={Math.max(consumoCardSize.h, 120)}
                          color={premium.magenta}
                        />
                      </View>

                      <View
                        style={[
                          styles.consumoModeradoForeground,
                          desktop && styles.consumoModeradoForegroundDesktop,
                        ]}
                      >
                        <View style={styles.consumoModeradoHeader}>
                          <Ionicons
                            name="wallet-outline"
                            size={20}
                            color={premium.purple}
                          />
                          <Text style={styles.consumoModeradoTitle}>
                            Consumo Moderado
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={premium.textSecondary}
                          />
                        </View>

                        <View style={styles.consumoModeradoStatusRow}>
                          <Ionicons
                            name={consumoModeradoPerformance.icon}
                            size={20}
                            color={consumoModeradoPerformance.color}
                          />
                          <Text
                            style={[
                              styles.consumoModeradoStatusLabel,
                              { color: consumoModeradoPerformance.color },
                            ]}
                          >
                            {consumoModeradoPerformance.label}
                          </Text>
                        </View>

                        <Text style={styles.consumoModeradoDetail}>
                          {showValues
                            ? consumoModeradoPerformance.detail
                            : consumoModeradoPerformance.detail.replace(
                                /R\$\s*[\d.,]+/g,
                                "R$ •••",
                              )}
                        </Text>

                        <View
                          style={[
                            styles.consumoModeradoMetaBlock,
                            desktop && styles.consumoModeradoMetaBlockDesktop,
                          ]}
                        >
                          <View style={styles.consumoModeradoMetaRow}>
                            <Text style={styles.consumoModeradoMetaLabel}>
                              Média realizada
                            </Text>
                            <MaskedAmount
                              value={
                                consumoModeradoPerformance.actualDailyAverage
                              }
                              style={styles.consumoModeradoMetaValue}
                            />
                          </View>
                          <View style={styles.consumoModeradoMetaDivider} />
                          <View style={styles.consumoModeradoMetaRow}>
                            <Text style={styles.consumoModeradoMetaLabel}>
                              Média diária ideal
                            </Text>
                            <MaskedAmount
                              value={
                                consumoModeradoPerformance.idealDailyAverage
                              }
                              style={styles.consumoModeradoMetaValue}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : null}

                <View style={styles.balanceCardsSection}>
                  <Text style={styles.sectionTitle}>Saldo</Text>
                  <View
                    style={[
                      styles.balanceCardsRow,
                      desktop && styles.balanceCardsRowDesktop,
                    ]}
                  >
                    <View
                      style={[
                        styles.expectedSummaryColumn,
                        desktop && styles.balanceColumnDesktop,
                      ]}
                    >
                      <View
                        style={[
                          styles.premiumBalanceCard,
                          styles.premiumBalanceCardPurple,
                        ]}
                      >
                        <CardWaveBg variant="v2Purple" crop="fill" opacity={0.95} />
                        <View style={styles.premiumBalanceTitleRow}>
                          <View style={styles.premiumBalanceIcon}>
                            <Ionicons
                              name="cash"
                              size={14}
                              color={premium.purple}
                            />
                          </View>
                          <Text
                            style={styles.premiumBalanceLabel}
                            numberOfLines={2}
                          >
                            Rendas Realizadas
                          </Text>
                        </View>
                        <MaskedAmount
                          value={totalIncome}
                          style={styles.premiumBalanceValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        />
                        <Text style={styles.summarySubtext}>
                          {activePeriodLabel}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.expectedSummaryColumn,
                        desktop && styles.balanceColumnDesktop,
                      ]}
                    >
                      <View
                        style={[
                          styles.premiumBalanceCard,
                          styles.premiumBalanceCardMagenta,
                        ]}
                      >
                        <CardWaveBg variant="v2Magenta" crop="fill" opacity={0.95} />
                        <View style={styles.premiumBalanceTitleRow}>
                          <View
                            style={[
                              styles.premiumBalanceIcon,
                              styles.premiumBalanceIconMagenta,
                            ]}
                          >
                            <Ionicons
                              name="trending-down"
                              size={14}
                              color={premium.magenta}
                            />
                          </View>
                          <Text
                            style={[
                              styles.premiumBalanceLabel,
                              styles.premiumBalanceLabelMagenta,
                            ]}
                            numberOfLines={2}
                          >
                            Gastos Realizados
                          </Text>
                        </View>
                        <MaskedAmount
                          value={realizedExpenseTotal}
                          style={styles.premiumBalanceValue}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        />
                        <Text style={styles.summarySubtext}>
                          {activePeriodLabel}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.expectedSummaryColumn,
                        desktop && styles.balanceColumnDesktop,
                      ]}
                    >
                      <View
                        style={[
                          styles.premiumBalanceCard,
                          styles.premiumBalanceCardPurpleGlow,
                        ]}
                      >
                        <CardWaveBg variant="v2Square" crop="square" opacity={0.95} />
                        <View style={styles.premiumBalanceTitleRow}>
                          <View style={styles.premiumBalanceIcon}>
                            <Ionicons
                              name="wallet"
                              size={14}
                              color={
                                realizedBalance < 0
                                  ? premium.magenta
                                  : premium.purple
                              }
                            />
                          </View>
                          <Text
                            style={styles.premiumBalanceLabel}
                            numberOfLines={1}
                          >
                            Saldo
                          </Text>
                        </View>
                        <MaskedAmount
                          value={realizedBalance}
                          style={
                            [
                              styles.premiumBalanceValue,
                              realizedBalance < 0
                                ? styles.summaryValueNegative
                                : null,
                            ] as any
                          }
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.7}
                        />
                        <Text style={styles.summarySubtext}>
                          {activePeriodLabel}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              // Consultor/admin: manter cards antigos
              <>
                {/* Saldo Atual - Retângulo Horizontal */}
                <Animated.View
                  style={[
                    styles.summaryCardHorizontal,
                    styles.cardBlue,
                    balance < 0 && styles.cardNegative,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={styles.balanceContent}>
                    <View style={styles.balanceTextContainer}>
                      <Text style={styles.summaryLabelBalance}>
                        Saldo Atual
                      </Text>
                      <MaskedAmount
                        value={balance}
                        style={
                          [
                            styles.summaryValue,
                            balance < 0 ? styles.summaryValueNegative : null,
                          ] as any
                        }
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.7}
                      />
                      <Text style={styles.summarySubtext}>Disponível</Text>
                    </View>
                    <View style={styles.balanceIconContainer}>
                      <Ionicons
                        name="wallet"
                        size={28}
                        color={balance < 0 ? "#FF008A" : "#B900FF"}
                      />
                    </View>
                  </View>
                </Animated.View>

                {/* Total Gasto e Total Recebido - Quadrados */}
                <View style={[styles.summaryRow, desktop && styles.summaryRowDesktop]}>
                  <Animated.View
                    style={[
                      styles.summaryCardSquare,
                      styles.cardGreen,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: Animated.add(
                              slideAnim,
                              new Animated.Value(10),
                            ),
                          },
                        ],
                      },
                    ]}
                  >
                    <CardWaveBg variant="v2Purple" crop="fill" opacity={1} />
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="trending-up" size={18} color="#B900FF" />
                    </View>
                    <Text style={styles.summaryLabelIncome}>
                      Total Recebido
                    </Text>
                    <MaskedAmount
                      value={totalIncome}
                      style={styles.summaryValueSquare}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    />
                    <Text style={styles.summarySubtext}>
                      {activePeriodLabel}
                    </Text>
                  </Animated.View>

                  <Animated.View
                    style={[
                      styles.summaryCardSquare,
                      styles.cardRed,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            translateY: Animated.add(
                              slideAnim,
                              new Animated.Value(10),
                            ),
                          },
                        ],
                      },
                    ]}
                  >
                    <CardWaveBg variant="v2Magenta" crop="fill" opacity={1} />
                    <View style={styles.cardIconContainer}>
                      <Ionicons
                        name="trending-down"
                        size={18}
                        color="#FF008A"
                      />
                    </View>
                    <Text style={styles.summaryLabelExpense}>Total Gasto</Text>
                    <MaskedAmount
                      value={totalExpense}
                      style={styles.summaryValueSquare}
                      numberOfLines={1}
                      adjustsFontSizeToFit={true}
                      minimumFontScale={0.7}
                    />
                    <Text style={styles.summarySubtext}>
                      {activePeriodLabel}
                    </Text>
                  </Animated.View>
                </View>
              </>
            )}
          </Animated.View>

          {/* Ações rápidas */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>

            <View style={[styles.actionsGrid, desktop && styles.actionsGridDesktop]}>
              <ActionCard
                icon="add-circle"
                label="Adicionar Renda"
                color="#B900FF"
                onPress={() => navigate("AddIncome")}
                delay={0}
                waveVariant="actionIncome"
              />
              <ActionCard
                icon="remove-circle"
                label="Adicionar Gasto"
                color="#FF008A"
                onPress={() => navigate("AddExpense")}
                delay={100}
                waveVariant="actionExpense"
              />
              <ActionCard
                icon="cash-outline"
                label="Rendas Acompanhadas"
                color="#a47aff"
                onPress={() => navigate("IncomeList")}
                delay={200}
                waveVariant="actionIncomeList"
              />
              <ActionCard
                icon="receipt-outline"
                label="Ver Todos os Gastos"
                color="#ff6b8a"
                onPress={() => navigate("ExpenseList")}
                delay={300}
                waveVariant="actionExpenseList"
              />
              {!isStaffUser(user) && (
                <ActionCard
                  icon="calendar"
                  label="Planejamento"
                  color={premium.purpleBright}
                  onPress={() => navigate("PlanningView")}
                  delay={400}
                  fullWidth
                  waveVariant="actionPlanning"
                />
              )}
            </View>
          </View>

          {/* Gráficos */}
          {(categoryChartData.length > 0 || lineChartData.length > 0) && (
            <Animated.View
              style={[
                styles.chartsContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.sectionTitle}>Visualizações</Text>

              <View
                style={[
                  styles.chartsRow,
                  desktop && styles.chartsRowDesktop,
                ]}
              >
                <View
                  style={[styles.chartCard, desktop && styles.chartCardDesktop]}
                >
                  <View style={styles.chartHeader}>
                    <Ionicons
                      name="pie-chart-outline"
                      size={20}
                      color={premium.purple}
                    />
                    <Text style={styles.chartTitle}>Gastos por Categoria</Text>
                  </View>
                  {pieChartVisualData.length > 0 ? (
                    <PieChart
                      data={pieChartVisualData}
                      size={desktop ? 168 : 128}
                    />
                  ) : (
                    <View style={styles.chartEmptyState}>
                      <Ionicons
                        name="ellipse-outline"
                        size={36}
                        color={premium.textSecondary}
                      />
                      <Text style={styles.chartEmptyText}>
                        Sem gastos por categoria no período
                      </Text>
                    </View>
                  )}
                </View>

                {lineChartData.length > 0 ? (
                  <View
                    style={[styles.chartCard, desktop && styles.chartCardDesktop]}
                  >
                    <View style={styles.chartHeader}>
                      <Ionicons
                        name="trending-up-outline"
                        size={20}
                        color={premium.purple}
                      />
                      <Text style={styles.chartTitle}>
                        Evolução (Últimos 7 dias)
                      </Text>
                    </View>
                    <LineChart
                      data={lineChartData}
                      height={desktop ? 168 : 120}
                      showLabels={true}
                    />
                  </View>
                ) : null}
              </View>
            </Animated.View>
          )}

          {/* Filtros e Busca */}
          <View style={styles.filtersContainer}>
            <Text style={styles.sectionTitle}>Transações</Text>

            {/* Campo de Busca */}
            <View
              style={[
                styles.searchContainer,
                desktop && styles.searchContainerDesktop,
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={premium.purpleSoft}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por descrição..."
                placeholderTextColor={premium.textSecondary}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchTerm("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Filtros de Tipo */}
            <View
              style={[
                styles.filterButtons,
                desktop && styles.filterButtonsDesktop,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  desktop && styles.filterButtonDesktop,
                  filterType === "all" && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterTypeChange("all")}
              >
                <Ionicons
                  name="list"
                  size={16}
                  color={filterType === "all" ? premium.text : premium.textSecondary}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "all" && styles.filterButtonTextActive,
                  ]}
                >
                  Todas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  desktop && styles.filterButtonDesktop,
                  filterType === "income" && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterTypeChange("income")}
              >
                <Ionicons
                  name="trending-up"
                  size={18}
                  color={filterType === "income" ? premium.purple : premium.textSecondary}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "income" && styles.filterButtonTextActive,
                    filterType === "income" && { color: premium.purple },
                  ]}
                >
                  Rendas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  desktop && styles.filterButtonDesktop,
                  filterType === "expense" && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterTypeChange("expense")}
              >
                <Ionicons
                  name="trending-down"
                  size={18}
                  color={filterType === "expense" ? premium.magenta : premium.textSecondary}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "expense" && styles.filterButtonTextActive,
                    filterType === "expense" && { color: premium.magenta },
                  ]}
                >
                  Gastos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
        }
      />

      <ZeroPlanilhaConfirmModal
        visible={zeroConfirmVisible}
        dayLabel={zeroConfirmDayLabel}
        loading={confirmingZero}
        onCancel={handleCancelZeroPlanilha}
        onConfirmZero={handleConfirmZeroPlanilha}
        trackedOptions={zeroTrackedOptions}
        onConfirmEntries={handleRegisterOpeningExpenses}
      />

      <Modal
        visible={!!trackedZerosFollowUp}
        transparent
        animationType="fade"
        onRequestClose={dismissTrackedZerosFollowUp}
      >
        <View style={styles.trackedFollowUpOverlay}>
          <View style={styles.trackedFollowUpCard}>
            <Text style={styles.trackedFollowUpTitle}>
              E para gasto acompanhado?
            </Text>
            <Text style={styles.trackedFollowUpBody}>
              No dia {trackedZerosFollowUp?.dayLabel}, estes gastos acompanhados
              ainda não têm registro:{" "}
              {(trackedZerosFollowUp?.titles || []).join(", ")}. Deseja
              registrar zero neles também?
            </Text>
            <View style={styles.trackedFollowUpActions}>
              <TouchableOpacity
                style={styles.trackedFollowUpSecondary}
                onPress={dismissTrackedZerosFollowUp}
                disabled={savingTrackedZerosFollowUp}
              >
                <Text style={styles.trackedFollowUpSecondaryText}>
                  Agora não
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trackedFollowUpPrimary}
                onPress={() => {
                  void confirmTrackedZerosFollowUp();
                }}
                disabled={savingTrackedZerosFollowUp}
              >
                {savingTrackedZerosFollowUp ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.trackedFollowUpPrimaryText}>
                    Registrar zero
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ConfettiCelebration
        active={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <ConfirmDeleteModal
        visible={!!transactionToDelete}
        title="Confirmar exclusão"
        message={
          transactionToDelete
            ? `Deseja excluir ${transactionToDelete.type === "income" ? "a renda" : "o gasto"} "${transactionToDelete.description}" de ${formatCurrency(transactionToDelete.value)}?`
            : undefined
        }
        confirmLabel={deletingTransaction ? "Excluindo..." : "Excluir"}
        onCancel={() => {
          if (deletingTransaction) return;
          setTransactionToDelete(null);
        }}
        onConfirm={() => {
          if (deletingTransaction) return;
          void confirmDeleteTransaction();
        }}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 8,
    backgroundColor: premium.bg,
  },
  contentDesktop: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  listContentDesktop: {
    paddingBottom: 48,
  },
  pageGreeting: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageGreetingText: {
    flex: 1,
    minWidth: 0,
  },
  pageGreetingHello: {
    color: premium.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  pageGreetingName: {
    color: premium.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
    maxWidth: "100%",
    letterSpacing: -0.4,
  },
  greetingEyeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(185,0,255,0.1)",
    borderWidth: 1,
    borderColor: premium.border,
  },
  summaryContainer: {
    marginBottom: 8,
  },
  balanceCardsSection: {
    marginTop: 2,
    marginBottom: 6,
  },
  balanceCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 8,
    gap: 8,
  },
  balanceCardsRowDesktop: {
    gap: 14,
  },
  balanceColumnDesktop: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    alignSelf: "stretch",
  },
  balanceMetricCard: {
    flex: 1,
    backgroundColor: "#171321",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 108,
  },
  balanceMetricCardExpense: {
    borderLeftWidth: 4,
    borderLeftColor: "#FF008A",
  },
  balanceMetricCardIncome: {
    borderLeftWidth: 4,
    borderLeftColor: "#B900FF",
  },
  balanceMetricCardBalance: {
    borderLeftWidth: 4,
    borderLeftColor: "#B900FF",
  },
  balanceMetricHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 24,
  },
  balanceMetricLabel: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  balanceMetricValue: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8,
  },
  balanceMetricValueNegative: {
    color: "#FF008A",
  },
  // Card Horizontal (Saldo Atual)
  summaryCardHorizontal: {
    backgroundColor: "#0E0B14",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "rgba(185,0,255,0.28)",
    ...premiumCardShadow,
    overflow: "hidden",
    position: "relative",
    minHeight: 48,
  },
  premiumSavingsCard: {
    backgroundColor: "#0E0B14",
    borderColor: "rgba(185,0,255,0.32)",
    shadowColor: premium.purple,
    shadowOpacity: 0.22,
  },
  premiumSavingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 2,
  },
  premiumSavingsIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(185,0,255,0.12)",
    borderWidth: 1,
    borderColor: premium.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumSavingsHelpBtn: {
    padding: 4,
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceTextContainer: {
    flex: 1,
    zIndex: 2,
  },
  balanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#21172D",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  // Cards Quadrados (Total Gasto e Total Recebido)
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  summaryRowDesktop: {
    flexWrap: "nowrap",
    gap: 14,
  },
  expectedSummaryColumnDesktop: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  actionCardDesktop: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "23%",
    minWidth: 180,
    maxWidth: 250,
  },
  actionsGridDesktop: {
    gap: 12,
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  chartsRow: {
    width: "100%",
    gap: 16,
  },
  chartsRowDesktop: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 16,
  },
  chartCardDesktop: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 260,
    justifyContent: "flex-start",
  },
  expectedSummaryColumn: {
    flex: 1,
    paddingHorizontal: 0,
    alignSelf: "stretch",
  },
  expectedCardPressable: {
    width: "100%",
  },
  expectedCardSquare: {
    backgroundColor: "#0E0B14",
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderWidth: 1.2,
    borderColor: "rgba(190,130,255,0.22)",
    ...premiumCardShadow,
    minHeight: 86,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  expectedCardSquareExpanded: {
    backgroundColor: "#14101C",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.2,
    borderColor: "rgba(190,130,255,0.28)",
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  summaryCardSquare: {
    flex: 1,
    backgroundColor: "#0E0B14",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1.2,
    borderColor: "rgba(190,130,255,0.22)",
  },
  summaryCardSquareExpanded: {
    flex: 1,
    backgroundColor: "#171321",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#21172D",
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#21172D",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    zIndex: 2,
  },
  chevronContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  cardGreen: {
    borderColor: "rgba(200,160,255,0.28)",
    shadowColor: premium.purple,
    shadowOpacity: 0.3,
    shadowRadius: 18,
  },
  cardRed: {
    borderColor: "rgba(255,140,200,0.3)",
    shadowColor: premium.magenta,
    shadowOpacity: 0.28,
    shadowRadius: 18,
  },
  cardBlue: {
    borderLeftWidth: 3,
    borderLeftColor: premium.purple,
  },
  cardBalance: {
    borderLeftWidth: 3,
    borderLeftColor: premium.purpleBright,
  },
  premiumBalanceCard: {
    backgroundColor: "#0E0B14",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: premium.border,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 78,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  premiumBalanceCardPurple: {
    borderColor: "rgba(185,0,255,0.35)",
    shadowColor: premium.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumBalanceCardMagenta: {
    borderColor: "rgba(255,0,138,0.32)",
    shadowColor: premium.magenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumBalanceCardPurpleGlow: {
    borderColor: "rgba(185,0,255,0.35)",
    shadowColor: premium.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumBalanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    zIndex: 2,
    width: "100%",
    paddingHorizontal: 2,
  },
  premiumBalanceIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(185,0,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  premiumBalanceIconMagenta: {
    backgroundColor: "rgba(255,0,138,0.16)",
  },
  premiumBalanceLabel: {
    color: premium.purple,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "left",
    lineHeight: 12,
    flexShrink: 1,
    zIndex: 2,
  },
  premiumBalanceLabelMagenta: {
    color: premium.magenta,
  },
  premiumBalanceValue: {
    color: premium.text,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
    width: "100%",
    zIndex: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  summaryLabelBalance: {
    fontSize: 13,
    color: premium.purple,
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryLabelIncome: {
    fontSize: 13,
    color: premium.purple,
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
    zIndex: 2,
  },
  summaryLabelExpense: {
    fontSize: 13,
    color: premium.magenta,
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
    zIndex: 2,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "700",
    color: premium.text,
    marginTop: 1,
    letterSpacing: -0.3,
    flexShrink: 1,
    width: "100%",
    textAlign: "center",
  },
  summaryValueSquare: {
    fontSize: 16,
    fontWeight: "700",
    color: premium.text,
    marginTop: 1,
    letterSpacing: -0.3,
    flexShrink: 1,
    width: "100%",
    textAlign: "center",
    zIndex: 2,
  },
  summarySubtext: {
    fontSize: 9,
    color: premium.textSecondary,
    marginTop: 1,
    textAlign: "center",
    zIndex: 2,
  },
  premiumSavingsValue: {
    color: premium.text,
    fontSize: 16,
    fontWeight: "800",
    zIndex: 2,
    marginLeft: 8,
  },
  actionsContainer: {
    marginTop: 4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: premium.text,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  consumoModeradoCard: {
    backgroundColor: "#120818",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,0,138,0.55)",
    marginBottom: 8,
    overflow: "hidden",
    minHeight: 112,
    shadowColor: premium.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
  },
  consumoModeradoCardDesktop: {
    padding: 16,
    minHeight: 148,
    marginBottom: 12,
  },
  consumoModeradoBgLayer: {
    position: "absolute",
    right: -8,
    bottom: -6,
    top: 22,
    width: "58%",
    opacity: 1,
  },
  consumoModeradoBgLayerDesktop: {
    width: "48%",
    top: 12,
    right: 0,
  },
  consumoModeradoForeground: {
    position: "relative",
    zIndex: 2,
    gap: 8,
  },
  consumoModeradoForegroundDesktop: {
    maxWidth: "54%",
    gap: 10,
  },
  consumoModeradoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  consumoModeradoTitle: {
    flex: 1,
    color: premium.text,
    fontSize: 16,
    fontWeight: "700",
  },
  consumoModeradoStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "62%",
  },
  consumoModeradoStatusLabel: {
    fontSize: 18,
    fontWeight: "800",
  },
  consumoModeradoDetail: {
    color: "#E6E1EE",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
    maxWidth: "62%",
  },
  consumoModeradoMetaBlock: {
    marginTop: 4,
    gap: 0,
    maxWidth: "58%",
    backgroundColor: "rgba(8, 3, 14, 0.82)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  consumoModeradoMetaBlockDesktop: {
    maxWidth: "100%",
  },
  consumoModeradoMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: 8,
  },
  consumoModeradoMetaDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  consumoModeradoMetaLabel: {
    color: "#C9C3D4",
    fontSize: 13,
  },
  consumoModeradoMetaValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionCardWrapper: {
    flex: 1,
    minWidth: "45%",
  },
  actionCardFullWidth: {
    flexBasis: "100%",
    width: "100%",
    minWidth: "100%",
    maxWidth: "100%",
  },
  actionCardFullWidthDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "100%",
    width: "100%",
    maxWidth: "100%",
    minWidth: "100%",
    alignSelf: "stretch",
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: premium.surface,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "flex-start",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    minHeight: 40,
    overflow: "hidden",
  },
  actionCardWithWave: {
    backgroundColor: "#07050D",
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  actionCardContentCentered: {
    justifyContent: "center",
    alignSelf: "stretch",
  },
  actionForeground: {
    zIndex: 1,
  },
  actionIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  actionGreen: {
    borderTopWidth: 3,
    borderTopColor: "#B900FF",
  },
  actionRed: {
    borderTopWidth: 3,
    borderTopColor: "#FF008A",
  },
  actionBlue: {
    borderTopWidth: 3,
    borderTopColor: "#B900FF",
  },
  actionOrange: {
    borderTopWidth: 3,
    borderTopColor: "#c084fc",
  },
  actionLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: premium.text,
    textAlign: "left",
    letterSpacing: 0.1,
  },
  actionLabelCentered: {
    flex: 0,
    textAlign: "center",
  },
  filtersContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: premium.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: premium.border,
  },
  searchContainerDesktop: {
    maxWidth: 480,
    width: "100%",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: premium.text,
    fontSize: 15,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButtonsDesktop: {
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: premium.surface,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: premium.border,
    gap: 6,
  },
  filterButtonDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    minWidth: 128,
    paddingHorizontal: 18,
  },
  filterButtonActive: {
    backgroundColor: premium.surfaceElevated,
    borderColor: premium.borderStrong,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: premium.textSecondary,
  },
  filterButtonTextActive: {
    color: premium.text,
  },
  transactionsContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: premium.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: premium.border,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: premium.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: premium.textSecondary,
    marginTop: 8,
    textAlign: "center",
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
    color: "#ccc",
  },
  cardNegative: {
    borderLeftColor: "#FF008A",
  },
  summaryValueNegative: {
    color: "#FF008A",
  },
  transactionsList: {
    backgroundColor: "#171321",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    marginBottom: 6,
    backgroundColor: "#07050D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    overflow: "hidden",
  },
  transactionItemIncome: {
    borderColor: "rgba(185, 0, 255, 0.28)",
  },
  transactionItemExpense: {
    borderColor: "rgba(255, 0, 138, 0.28)",
  },
  transactionItemDesktop: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    width: "100%",
    maxWidth: "100%",
    alignSelf: "stretch",
  },
  transactionForeground: {
    zIndex: 1,
  },
  transactionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  transactionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  transactionIconIncome: {
    backgroundColor: "rgba(185,0,255,0.14)",
    borderColor: "rgba(185,0,255,0.4)",
  },
  transactionIconExpense: {
    backgroundColor: "rgba(255,0,138,0.12)",
    borderColor: "rgba(255,0,138,0.4)",
  },
  transactionContent: {
    flex: 1,
    flexDirection: "column",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  transactionDescription: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: premium.text,
    letterSpacing: 0.1,
    marginRight: 8,
    lineHeight: 18,
  },
  transactionFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  transactionPriceContainer: {
    flex: 1,
    alignItems: "flex-start",
    marginTop: 6,
  },
  transactionDateContainer: {
    alignItems: "flex-end",
    marginLeft: 12,
    marginTop: 8,
  },
  transactionDate: {
    fontSize: 11,
    color: premium.textSecondary,
    fontWeight: "600",
  },
  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: premium.surfaceElevated,
    borderWidth: 1,
    borderColor: premium.border,
  },
  transactionValueIncome: {
    fontSize: 16,
    fontWeight: "800",
    color: premium.purple,
    letterSpacing: 0.2,
  },
  transactionValueExpense: {
    fontSize: 16,
    fontWeight: "800",
    color: premium.magenta,
    letterSpacing: 0.2,
  },
  transactionTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 4,
    marginBottom: 4,
  },
  transactionTag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  transactionTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  chartsContainer: {
    marginBottom: 16,
    gap: 16,
  },
  chartCard: {
    backgroundColor: premium.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(185,0,255,0.42)",
    shadowColor: premium.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 4,
  },
  chartEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  chartEmptyText: {
    color: premium.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: premium.text,
  },
  trackedFollowUpOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  trackedFollowUpCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#21172D",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#21172D",
    padding: 20,
    gap: 14,
  },
  trackedFollowUpTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  trackedFollowUpBody: {
    color: "#cfc6e0",
    fontSize: 15,
    lineHeight: 22,
  },
  trackedFollowUpActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  trackedFollowUpSecondary: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: "#21172D",
  },
  trackedFollowUpSecondaryText: {
    color: "#ddd",
    fontWeight: "600",
  },
  trackedFollowUpPrimary: {
    minHeight: 44,
    minWidth: 140,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#B900FF",
  },
  trackedFollowUpPrimaryText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default HomeScreen;
