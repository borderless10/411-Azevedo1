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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import incomeServices from "../../services/incomeServices";
import expenseServices from "../../services/expenseServices";
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

export const HomeScreen = () => {
  const { navigate, currentScreen } = useNavigation();
  const { user } = useAuth();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
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

  // Função para obter cor de categoria
  const getCategoryColor = (categoryName: string): string => {
    const defaultCat = DEFAULT_EXPENSE_CATEGORIES.find(
      (cat) => cat.name === categoryName,
    );
    if (defaultCat) return defaultCat.color;

    // Cores padrão para categorias não mapeadas
    const colors = [
      "#FF5722",
      "#3F51B5",
      "#795548",
      "#F44336",
      "#009688",
      "#E91E63",
      "#FF9800",
      "#607D8B",
      "#9C27B0",
      "#00BCD4",
    ];
    const hash = categoryName
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
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
      setBalance(0);
      setAllTransactions([]);
      setHasLoaded(true); // Marcar como carregado mesmo com erro para mostrar estado vazio
    } finally {
      console.log("🏠 [HOME] Finalizando carregamento...");
      setLoading(false);
      setRefreshing(false);
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
              <Ionicons name="remove-circle" size={22} color="#F44336" />
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
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
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
                  <Ionicons name="trash-outline" size={18} color="#F44336" />
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
              <Ionicons name="cash" size={22} color="#4CAF50" />
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
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
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
                  <Ionicons name="trash-outline" size={18} color="#F44336" />
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
          <ActivityIndicator size="large" color="#007AFF" />
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
            colors={["#007AFF"]}
          />
        }
      >
        <View style={styles.content}>
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
                  <Text style={styles.summaryLabelBalance}>Saldo Atual</Text>
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
                    color={balance < 0 ? "#F44336" : "#007AFF"}
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
                  <Ionicons name="trending-up" size={18} color="#4CAF50" />
                </View>
                <Text style={styles.summaryLabelIncome}>Total Recebido</Text>
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
                  <Ionicons name="trending-down" size={18} color="#F44336" />
                </View>
                <Text style={styles.summaryLabelExpense}>Total Gasto</Text>
                <Text style={styles.summaryValueSquare}>
                  {formatCurrency(totalExpense)}
                </Text>
                <Text style={styles.summarySubtext}>Este mês</Text>
              </Animated.View>
            </View>
          </Animated.View>

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
                      color="#007AFF"
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
                      color="#4CAF50"
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

          {/* Ações rápidas */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>

            <View style={styles.actionsGrid}>
              <ActionCard
                icon="add-circle"
                label="Adicionar Renda"
                color="#4CAF50"
                onPress={() => navigate("AddIncome")}
                delay={0}
              />
              <ActionCard
                icon="remove-circle"
                label="Adicionar Gasto"
                color="#F44336"
                onPress={() => navigate("AddExpense")}
                delay={100}
              />
            </View>
          </View>

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
                  color={filterType === "income" ? "#4CAF50" : "#999"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "income" && styles.filterButtonTextActive,
                    filterType === "income" && { color: "#4CAF50" },
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
                  color={filterType === "expense" ? "#F44336" : "#999"}
                />
                <Text
                  style={[
                    styles.filterButtonText,
                    filterType === "expense" && styles.filterButtonTextActive,
                    filterType === "expense" && { color: "#F44336" },
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
  summaryContainer: {
    marginBottom: 16,
  },
  // Card Horizontal (Saldo Atual)
  summaryCardHorizontal: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
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
    gap: 8,
  },
  summaryCardSquare: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#333",
    minHeight: 110,
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
  cardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  cardRed: {
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  cardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
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
    color: "#007AFF",
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryLabelIncome: {
    fontSize: 13,
    color: "#4CAF50",
    marginTop: 0,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  summaryLabelExpense: {
    fontSize: 13,
    color: "#F44336",
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 20,
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
    borderTopColor: "#4CAF50",
  },
  actionRed: {
    borderTopWidth: 3,
    borderTopColor: "#F44336",
  },
  actionBlue: {
    borderTopWidth: 3,
    borderTopColor: "#007AFF",
  },
  actionOrange: {
    borderTopWidth: 3,
    borderTopColor: "#FF9800",
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
    borderColor: "#007AFF",
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
    borderLeftColor: "#F44336",
  },
  summaryValueNegative: {
    color: "#F44336",
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
    borderColor: "#4CAF5040",
  },
  transactionIconExpense: {
    backgroundColor: "#3a1a1a",
    borderColor: "#F4433640",
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
    alignItems: "flex-start",
  },
  transactionPriceContainer: {
    flex: 1,
    alignItems: "flex-start",
    marginTop: -20,
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
    color: "#4CAF50",
    letterSpacing: 0.2,
  },
  transactionValueExpense: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F44336",
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
