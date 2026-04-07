/**
 * Tela Home - Dashboard Inicial
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  TextInput,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import incomeServices from "../../services/incomeServices";
import expenseServices from "../../services/expenseServices";
import { budgetServices } from "../../services/budgetServices";
import { planningServices } from "../../services/planningServices";
import { activityServices } from "../../services/activityServices";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  formatDateForDisplay,
  formatDateToString,
  subtractDays,
  getStartOfDay,
  getEndOfDay,
} from "../../utils/dateUtils";
import { getFirstDayOfMonth } from "../../utils/dateUtils";
import { Income } from "../../types/income";
import { Expense } from "../../types/expense";
import {
  CategoryBarChart,
  CategoryData,
  LineChart,
  LineChartData,
} from "../../components/Charts";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/category";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";
import ExpectedDetails from "../../components/ui/ExpectedDetails";

export const HomeScreen = () => {
  const { navigate, currentScreen } = useNavigation();
  const { user } = useAuth();

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
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryChartData, setCategoryChartData] = useState<CategoryData[]>(
    [],
  );
  const [lineChartData, setLineChartData] = useState<LineChartData[]>([]);

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const lastZeroCheckKeyRef = useRef<string | null>(null);
  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [confirmingZero, setConfirmingZero] = useState(false);
  const [expanded, setExpanded] = useState<"income" | "expense" | null>(null);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      (UIManager as any).setLayoutAnimationEnabledExperimental
    ) {
      try {
        (UIManager as any).setLayoutAnimationEnabledExperimental(true);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Função para obter cor de categoria
  const getCategoryColor = (categoryName: string): string => {
    const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(
      (cat) => cat.name === categoryName,
    );
    if (defaultCat) return defaultCat.color;

    // Cores padrão para categorias não mapeadas
    const colors = [
      "#ff4d6d",
      "#8c52ff",
      "#6b6480",
      "#ff4d6d",
      "#a47aff",
      "#ff4d6d",
      "#c084fc",
      "#6b6480",
      "#8c52ff",
      "#a47aff",
    ];
    const hash = categoryName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const isCreditCardExpense = (expense: Expense | any) => {
    return expense?.paymentMethod === "credit_card" || Boolean(expense?.cardId);
  };

  // Carregar dados do mês atual
  const loadData = async () => {
    if (!user?.id) {
      console.log("⚠️ [HOME] Usuário não disponível, pulando carregamento");
      setLoading(false);
      return;
    }

    // Evitar múltiplas chamadas simultâneas - usar flag separada
    if (loading) {
      console.log("⚠️ [HOME] Já está carregando, pulando...");
      return;
    }

    try {
      console.log("🏠 [HOME] Iniciando carregamento de dados...", {
        userId: user.id,
      });
      setLoading(true);

      const today = new Date();
      const startOfMonth = getFirstDayOfMonth(today);
      const endOfToday = getEndOfDay(today);

      // Período para gráfico de linha (últimos 7 dias)
      const sevenDaysAgo = getStartOfDay(subtractDays(today, 6));

      console.log("🏠 [HOME] Buscando dados do período:", {
        startOfMonth,
        endOfToday,
      });

      // Carregar totais do mês, todas as transações e dados dos gráficos em paralelo
      const [
        incomeTotal,
        expenseTotal,
        allIncomes,
        allExpenses,
        expensesByCategory,
        last7DaysIncomes,
        last7DaysExpenses,
      ] = await Promise.all([
        incomeServices
          .getIncomesTotal(user.id, startOfMonth, endOfToday)
          .catch((err) => {
            console.error("❌ [HOME] Erro ao buscar totais de renda:", err);
            return 0;
          }),
        expenseServices
          .getExpensesTotal(user.id, startOfMonth, endOfToday)
          .catch((err) => {
            console.error("❌ [HOME] Erro ao buscar totais de gastos:", err);
            return 0;
          }),
        incomeServices.getIncomes(user.id).catch((err) => {
          console.error("❌ [HOME] Erro ao buscar rendas:", err);
          return [];
        }),
        expenseServices.getExpenses(user.id).catch((err) => {
          console.error("❌ [HOME] Erro ao buscar gastos:", err);
          return [];
        }),
        expenseServices
          .getExpensesGroupedByCategory(user.id, startOfMonth, endOfToday)
          .catch((err) => {
            console.error(
              "❌ [HOME] Erro ao buscar gastos por categoria:",
              err,
            );
            return [];
          }),
        incomeServices
          .getIncomes(user.id, { startDate: sevenDaysAgo, endDate: endOfToday })
          .catch((err) => {
            console.error(
              "❌ [HOME] Erro ao buscar rendas dos últimos 7 dias:",
              err,
            );
            return [];
          }),
        expenseServices
          .getExpenses(user.id, {
            startDate: sevenDaysAgo,
            endDate: endOfToday,
          })
          .catch((err) => {
            console.error(
              "❌ [HOME] Erro ao buscar gastos dos últimos 7 dias:",
              err,
            );
            return [];
          }),
      ]);

      // Load planning for normal users (consultant provides expected incomes/expenses)
      let planning: any = null;
      try {
        if (user.role !== "consultor" && !user.isAdmin) {
          planning = await planningServices.getPlanning(user.id);
        }
      } catch (err) {
        console.error("❌ [HOME] Erro ao buscar planning:", err);
      }

      setPlanningData(planning || null);

      // compute expected values if planning exists
      let calcExpectedExpenses: number | null = null;
      let calcExpectedIncomes: number | null = null;
      let calcExpectedSavings: number | null = null;
      if (planning) {
        console.log("🏠 [HOME] planning data:", planning);
        console.log(
          "🏠 [HOME] planning.expectedExpenses:",
          planning.expectedExpenses,
        );
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
        const sumExpected = (arr: any[] | undefined) =>
          (arr || []).reduce((s, it) => {
            const n = Number(it?.amount);
            return s + (Number.isFinite(n) ? n : 0);
          }, 0);

        const sumExpExpenses = (planning.expectedExpenses || []).reduce(
          (sum: number, item: any) => sum + getNonCardPortion(item),
          0,
        );
        const sumExpIncomes = sumExpected(planning.expectedIncomes);
        const monthly = Number(planning.monthlyIncome) || 0;

        // sum of bills considering only non-card portion
        const sumBills = (planning.bills || []).reduce((s: number, b: any) => {
          return s + getNonCardPortion(b);
        }, 0);

        // sum of plannedByCategory values
        const sumByCategory = planning.plannedByCategory
          ? Object.values(planning.plannedByCategory).reduce(
              (s: number, v: any) =>
                s + (Number.isFinite(Number(v)) ? Number(v) : 0),
              0,
            )
          : 0;

        // gasto esperado no mês = bills + plannedByCategory + expectedExpenses
        calcExpectedExpenses = sumBills + sumByCategory + sumExpExpenses;
        calcExpectedIncomes = monthly + sumExpIncomes;
        // expected savings: monthlyIncome + expectedIncomes - expectedExpenses
        // ensure numbers (coalesce nulls) to avoid `possibly null` TypeScript errors
        calcExpectedSavings =
          (calcExpectedIncomes ?? 0) - (calcExpectedExpenses ?? 0);
      }

      setExpectedExpenses(calcExpectedExpenses);
      setExpectedIncomes(calcExpectedIncomes);
      setExpectedSavings(calcExpectedSavings);

      console.log("🏠 [HOME] Dados recebidos:", {
        incomeTotal,
        expenseTotal,
        allIncomesCount: allIncomes.length,
        allExpensesCount: allExpenses.length,
        startOfMonth: startOfMonth.toISOString(),
        endOfToday: endOfToday.toISOString(),
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
      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      const realizedExpenses = allExpenses.filter(
        (expense) => !isCreditCardExpense(expense),
      );
      const realizedExpense = realizedExpenses.reduce(
        (sum, expense) => sum + (Number(expense.value) || 0),
        0,
      );
      const realizedBalanceTotal = incomeTotal - realizedExpense;
      setRealizedExpenseTotal(realizedExpense);
      setRealizedBalance(realizedBalanceTotal);
      setBalance(calculatedBalance);
      setAllTransactions(allTransactionsWithType);
      setHasLoaded(true);

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
      // Em caso de erro, definir valores padrão
      setTotalIncome(0);
      setTotalExpense(0);
      setRealizedExpenseTotal(0);
      setRealizedBalance(0);
      setBalance(0);
      setAllTransactions([]);
      setHasLoaded(true); // Marcar como carregado mesmo com erro para mostrar estado vazio
    } finally {
      console.log("🏠 [HOME] Finalizando carregamento...");
      setLoading(false);
      setRefreshing(false);
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

    if (user.role === "consultor" || user.isAdmin) {
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
    const checkKey = `${user.id}-${formatDateToString(yesterday)}`;

    if (lastZeroCheckKeyRef.current === checkKey) {
      return;
    }

    lastZeroCheckKeyRef.current = checkKey;

    try {
      const expensesYesterday = await expenseServices.getExpenses(user.id, {
        startDate: getStartOfDay(yesterday),
        endDate: getEndOfDay(yesterday),
      });

      const totalYesterday = expensesYesterday.reduce(
        (sum, item) => sum + item.value,
        0,
      );

      if (totalYesterday > 0) {
        return;
      }

      const alreadyConfirmed = await budgetServices.isZeroExpenseDayConfirmed(
        user.id,
        yesterday,
      );

      if (alreadyConfirmed) {
        return;
      }

      const yesterdayLabel = formatDateForDisplay(yesterday);
      setZeroConfirmDayLabel(yesterdayLabel);
      setZeroConfirmDate(yesterday);
      setZeroConfirmVisible(true);
    } catch (error) {
      console.error("❌ [HOME] Erro ao verificar dia sem gasto:", error);
    }
  };

  const handleConfirmZeroPlanilha = async () => {
    if (!user?.id || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await budgetServices.confirmZeroExpenseDay(user.id, zeroConfirmDate);

      await activityServices.logActivity(user.id, {
        type: "budget_updated",
        title: "✅ Zero na planilha confirmado",
        description: `Parabéns! O dia ${zeroConfirmDayLabel} foi registrado com ${formatCurrency(0)}.`,
      });

      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      Alert.alert(
        "Parabéns! 🎉",
        "Seu dia com zero na planilha foi contabilizado.",
      );
    } catch (error) {
      console.error("❌ [HOME] Erro ao confirmar zero na planilha:", error);
      Alert.alert(
        "Erro",
        "Não foi possível confirmar o zero na planilha agora.",
      );
    } finally {
      setConfirmingZero(false);
    }
  };

  const handleCancelZeroPlanilha = () => {
    if (confirmingZero) return;
    setZeroConfirmVisible(false);
    setZeroConfirmDate(null);
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
    Alert.alert(
      "Confirmar Exclusão",
      `Deseja realmente excluir ${type === "income" ? "a renda" : "o gasto"} "${description}" de ${formatCurrency(value)}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              console.log(`🗑️ Deletando ${type}:`, id);
              if (type === "income") {
                await incomeServices.deleteIncome(id);
              } else {
                await expenseServices.deleteExpense(id);
              }
              console.log(
                `✅ ${type === "income" ? "Renda" : "Gasto"} deletado com sucesso`,
              );
              // Recarregar dados
              await loadData();
              Alert.alert(
                "Sucesso! ✅",
                `${type === "income" ? "Renda" : "Gasto"} excluído com sucesso!`,
              );
            } catch (error: any) {
              console.error(`❌ Erro ao deletar ${type}:`, error);
              Alert.alert(
                "Erro",
                `Erro ao excluir ${type === "income" ? "a renda" : "o gasto"}. Tente novamente.`,
              );
            }
          },
        },
      ],
    );
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
  }> = ({ icon, label, color, onPress, delay }) => {
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
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.actionCard, { borderTopColor: color }]}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <View
            style={[
              styles.actionIconContainer,
              { backgroundColor: `${color}15` },
            ]}
          >
            <Ionicons name={icon} size={32} color={color} />
          </View>
          <Text style={styles.actionLabel}>{label}</Text>
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
          delay: index * 50,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          delay: index * 50,
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
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.transactionIcon}>
            <View
              style={[
                styles.transactionIconContainer,
                styles.transactionIconExpense,
              ]}
            >
              <Ionicons name="remove-circle" size={22} color="#ff4d6d" />
            </View>
          </View>
          <View style={styles.transactionContent}>
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
                  <Ionicons name="create-outline" size={18} color="#8c52ff" />
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
                  <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.transactionFooter}>
              <View style={styles.transactionPriceContainer}>
                <Text style={styles.transactionValueExpense}>
                  -{formatCurrency(expense.value)}
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
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.transactionIcon}>
            <View
              style={[
                styles.transactionIconContainer,
                styles.transactionIconIncome,
              ]}
            >
              <Ionicons name="cash" size={22} color="#8c52ff" />
            </View>
          </View>
          <View style={styles.transactionContent}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionDescription} numberOfLines={3}>
                {income.description || "Sem descrição"}
              </Text>
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditTransaction(income.id, "income")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#8c52ff" />
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
                  <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.transactionFooter}>
              <View style={styles.transactionPriceContainer}>
                <Text style={styles.transactionValueIncome}>
                  +{formatCurrency(income.value)}
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
      <Layout showHeader={true} showSidebar={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout showHeader={true} showSidebar={true}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#8c52ff"]}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.pageGreeting}>
            <Text style={styles.pageGreetingHello}>Olá,</Text>
            <Text style={styles.pageGreetingName} numberOfLines={1}>
              {user?.name || user?.email || "Usuário"}
            </Text>
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
            {user?.role !== "consultor" && !user?.isAdmin ? (
              // Normal user: show planning-based expected cards
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.expectedSummaryColumn}>
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
                        <View style={styles.cardIconContainer}>
                          <Ionicons name="cash" size={18} color="#8c52ff" />
                        </View>
                        <Text style={styles.summaryLabelIncome}>
                          Renda Esperada
                        </Text>
                        <Text style={styles.summaryValueSquare}>
                          {expectedIncomes === null
                            ? "-"
                            : formatCurrency(expectedIncomes)}
                        </Text>
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

                  <View style={styles.expectedSummaryColumn}>
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
                        <View style={styles.cardIconContainer}>
                          <Ionicons name="calendar" size={18} color="#ff4d6d" />
                        </View>
                        <Text style={styles.summaryLabelExpense}>
                          Gasto Esperado
                        </Text>
                        <Text style={styles.summaryValueSquare}>
                          {expectedExpenses === null
                            ? "-"
                            : formatCurrency(expectedExpenses)}
                        </Text>
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
                    styles.cardGreen,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <View style={styles.balanceContent}>
                    <View style={styles.balanceTextContainer}>
                      <Text style={styles.summaryLabelBalance}>
                        Poupança Esperada
                      </Text>
                      <Text style={styles.summaryValue}>
                        {expectedSavings === null
                          ? "-"
                          : formatCurrency(expectedSavings)}
                      </Text>
                      <Text style={styles.summarySubtext}>
                        Este mês (estimado)
                      </Text>
                    </View>
                    <View style={styles.balanceIconContainer}>
                      <Ionicons
                        name={"piggy-bank" as any}
                        size={28}
                        color="#8c52ff"
                      />
                    </View>
                  </View>
                </Animated.View>

                <View style={styles.balanceCardsSection}>
                  <Text style={styles.sectionTitle}>Saldo</Text>
                  <View style={styles.balanceCardsRow}>
                    <View style={styles.expectedSummaryColumn}>
                      <View style={styles.expectedCardPressable}>
                        <View
                          style={[styles.expectedCardSquare, styles.cardGreen]}
                        >
                          <View style={styles.cardIconContainer}>
                            <Ionicons name="cash" size={18} color="#8c52ff" />
                          </View>
                          <Text style={styles.summaryLabelIncome}>
                            Rendas Realizadas
                          </Text>
                          <Text style={styles.summaryValueSquare}>
                            {formatCurrency(totalIncome)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.expectedSummaryColumn}>
                      <View style={styles.expectedCardPressable}>
                        <View
                          style={[styles.expectedCardSquare, styles.cardRed]}
                        >
                          <View style={styles.cardIconContainer}>
                            <Ionicons
                              name="trending-down"
                              size={18}
                              color="#ff4d6d"
                            />
                          </View>
                          <Text style={styles.summaryLabelExpense}>
                            Gastos Realizados
                          </Text>
                          <Text style={styles.summaryValueSquare}>
                            {formatCurrency(realizedExpenseTotal)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.expectedSummaryColumn}>
                      <View style={styles.expectedCardPressable}>
                        <View
                          style={[
                            styles.expectedCardSquare,
                            styles.cardBalance,
                          ]}
                        >
                          <View style={styles.cardIconContainer}>
                            <Ionicons
                              name="wallet"
                              size={18}
                              color={
                                realizedBalance < 0 ? "#ff4d6d" : "#8c52ff"
                              }
                            />
                          </View>
                          <Text style={styles.summaryLabelBalance}>Saldo</Text>
                          <Text
                            style={[
                              styles.summaryValueSquare,
                              realizedBalance < 0 &&
                                styles.summaryValueNegative,
                            ]}
                          >
                            {formatCurrency(realizedBalance)}
                          </Text>
                        </View>
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
                      <Text
                        style={[
                          styles.summaryValue,
                          balance < 0 && styles.summaryValueNegative,
                        ]}
                      >
                        {formatCurrency(balance)}
                      </Text>
                      <Text style={styles.summarySubtext}>Disponível</Text>
                    </View>
                    <View style={styles.balanceIconContainer}>
                      <Ionicons
                        name="wallet"
                        size={28}
                        color={balance < 0 ? "#ff4d6d" : "#8c52ff"}
                      />
                    </View>
                  </View>
                </Animated.View>

                {/* Total Gasto e Total Recebido - Quadrados */}
                <View style={styles.summaryRow}>
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
                    <View style={styles.cardIconContainer}>
                      <Ionicons name="trending-up" size={18} color="#8c52ff" />
                    </View>
                    <Text style={styles.summaryLabelIncome}>
                      Total Recebido
                    </Text>
                    <Text style={styles.summaryValueSquare}>
                      {formatCurrency(totalIncome)}
                    </Text>
                    <Text style={styles.summarySubtext}>Este mês</Text>
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
                    <View style={styles.cardIconContainer}>
                      <Ionicons
                        name="trending-down"
                        size={18}
                        color="#ff4d6d"
                      />
                    </View>
                    <Text style={styles.summaryLabelExpense}>Total Gasto</Text>
                    <Text style={styles.summaryValueSquare}>
                      {formatCurrency(totalExpense)}
                    </Text>
                    <Text style={styles.summarySubtext}>Este mês</Text>
                  </Animated.View>
                </View>
              </>
            )}
          </Animated.View>

          {/* Ações rápidas */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>

            <View style={styles.actionsGrid}>
              <ActionCard
                icon="add-circle"
                label="Adicionar Renda"
                color="#8c52ff"
                onPress={() => navigate("AddIncome")}
                delay={0}
              />
              <ActionCard
                icon="remove-circle"
                label="Consumo moderado"
                color="#ff4d6d"
                onPress={() => navigate("AddExpense")}
                delay={100}
              />
              {user?.role !== "consultor" && !user?.isAdmin && (
                <ActionCard
                  icon="calendar"
                  label="Planejamento"
                  color="#c084fc"
                  onPress={() => navigate("PlanningView")}
                  delay={200}
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

              {/* Gráfico de Gastos por Categoria */}
              {categoryChartData.length > 0 && (
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Ionicons
                      name="pie-chart-outline"
                      size={20}
                      color="#8c52ff"
                    />
                    <Text style={styles.chartTitle}>Gastos por Categoria</Text>
                  </View>
                  <CategoryBarChart
                    data={categoryChartData}
                    showValues={true}
                    showPercentages={true}
                  />
                </View>
              )}

              {/* Gráfico de Evolução Temporal */}
              {lineChartData.length > 0 && (
                <View style={styles.chartCard}>
                  <View style={styles.chartHeader}>
                    <Ionicons
                      name="trending-up-outline"
                      size={20}
                      color="#8c52ff"
                    />
                    <Text style={styles.chartTitle}>
                      Evolução (Últimos 7 dias)
                    </Text>
                  </View>
                  <LineChart
                    data={lineChartData}
                    height={180}
                    showLabels={true}
                  />
                </View>
              )}
            </Animated.View>
          )}

          {/* Filtros e Busca */}
          <View style={styles.filtersContainer}>
            <Text style={styles.sectionTitle}>Transações</Text>

            {/* Campo de Busca */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color="#999"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por descrição..."
                placeholderTextColor="#666"
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
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === "all" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("all")}
              >
                <Ionicons
                  name="list"
                  size={18}
                  color={filterType === "all" ? "#fff" : "#999"}
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
                  filterType === "income" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("income")}
              >
                <Ionicons
                  name="trending-up"
                  size={18}
                  color={filterType === "income" ? "#8c52ff" : "#999"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "income" && styles.filterButtonTextActive,
                    filterType === "income" && { color: "#8c52ff" },
                  ]}
                >
                  Rendas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filterType === "expense" && styles.filterButtonActive,
                ]}
                onPress={() => setFilterType("expense")}
              >
                <Ionicons
                  name="trending-down"
                  size={18}
                  color={filterType === "expense" ? "#ff4d6d" : "#999"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "expense" && styles.filterButtonTextActive,
                    filterType === "expense" && { color: "#ff4d6d" },
                  ]}
                >
                  Gastos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de transações */}
          <View style={styles.transactionsContainer}>
            {filteredTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
                <Text style={styles.emptySubtext}>
                  Comece adicionando uma renda ou gasto
                </Text>
              </View>
            ) : (
              <Animated.View
                style={[
                  styles.transactionsList,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                {filteredTransactions.map((item, index) => (
                  <TransactionItem
                    key={(item.item as any).id ?? index}
                    transaction={item}
                    index={index}
                  />
                ))}
              </Animated.View>
            )}
          </View>
        </View>
      </ScrollView>

      <ZeroPlanilhaConfirmModal
        visible={zeroConfirmVisible}
        dayLabel={zeroConfirmDayLabel}
        loading={confirmingZero}
        onCancel={handleCancelZeroPlanilha}
        onConfirm={handleConfirmZeroPlanilha}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 12,
    backgroundColor: "#000",
  },
  pageGreeting: {
    marginBottom: 8,
  },
  pageGreetingHello: {
    color: "#bbb",
    fontSize: 14,
  },
  pageGreetingName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: "100%",
  },
  summaryContainer: {
    marginBottom: 16,
  },
  balanceCardsSection: {
    marginTop: 8,
    marginBottom: 14,
  },
  balanceCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 8,
  },
  balanceMetricCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 108,
  },
  balanceMetricCardExpense: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff4d6d",
  },
  balanceMetricCardIncome: {
    borderLeftWidth: 4,
    borderLeftColor: "#8c52ff",
  },
  balanceMetricCardBalance: {
    borderLeftWidth: 4,
    borderLeftColor: "#8c52ff",
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
    color: "#ff4d6d",
  },
  // Card Horizontal (Saldo Atual)
  summaryCardHorizontal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#333",
  },
  balanceContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  // Cards Quadrados (Total Gasto e Total Recebido)
  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    // espaçamento entre colunas (RN não tem `gap` em todas as versões)
  },
  expectedSummaryColumn: {
    flex: 1,
    paddingHorizontal: 4,
  },
  expectedCardPressable: {
    width: "100%",
  },
  expectedCardSquare: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 118,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  expectedCardSquareExpanded: {
    backgroundColor: "#161616",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#2a2040",
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  summaryCardSquare: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCardSquareExpanded: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#2a2040",
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  chevronContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: "#8c52ff",
  },
  cardRed: {
    borderLeftWidth: 4,
    borderLeftColor: "#ff4d6d",
  },
  cardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: "#8c52ff",
  },
  cardBalance: {
    borderLeftWidth: 4,
    borderLeftColor: "#8c52ff",
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
    color: "#8c52ff",
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryLabelIncome: {
    fontSize: 13,
    color: "#8c52ff",
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryLabelExpense: {
    fontSize: 13,
    color: "#ff4d6d",
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginTop: 1,
    letterSpacing: -0.3,
  },
  summaryValueSquare: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginTop: 1,
    letterSpacing: -0.3,
  },
  summarySubtext: {
    fontSize: 10,
    color: "#999",
    marginTop: 0,
  },
  actionsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 10,
    letterSpacing: -0.3,
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
  actionCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 85,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  actionGreen: {
    borderTopWidth: 3,
    borderTopColor: "#8c52ff",
  },
  actionRed: {
    borderTopWidth: 3,
    borderTopColor: "#ff4d6d",
  },
  actionBlue: {
    borderTopWidth: 3,
    borderTopColor: "#8c52ff",
  },
  actionOrange: {
    borderTopWidth: 3,
    borderTopColor: "#c084fc",
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#333",
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: "#2a2a2a",
    borderColor: "#8c52ff",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  transactionsContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ccc",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
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
    borderLeftColor: "#ff4d6d",
  },
  summaryValueNegative: {
    color: "#ff4d6d",
  },
  transactionsList: {
    backgroundColor: "#1a1a1a",
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  transactionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  transactionIconIncome: {
    backgroundColor: "#1a3a1a",
    borderColor: "#8c52ff40",
  },
  transactionIconExpense: {
    backgroundColor: "#3a1a1a",
    borderColor: "#ff4d6d40",
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
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 0.1,
    marginRight: 8,
    lineHeight: 18,
    marginBottom: 0,
    paddingBottom: 0,
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
    color: "#999",
    fontWeight: "700",
  },
  transactionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#2a2a2a",
    marginLeft: 6,
    borderWidth: 1,
    borderColor: "#333",
  },
  transactionValueIncome: {
    fontSize: 17,
    fontWeight: "700",
    color: "#8c52ff",
    letterSpacing: 0.2,
  },
  transactionValueExpense: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ff4d6d",
    letterSpacing: 0.2,
  },
  chartsContainer: {
    marginBottom: 16,
    gap: 16,
  },
  chartCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
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
    color: "#fff",
  },
});

export default HomeScreen;
