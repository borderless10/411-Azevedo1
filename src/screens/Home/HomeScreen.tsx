/**
 * Tela Home - Dashboard Inicial
 */

import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../../routes/NavigationContext';
import { Layout } from '../../components/Layout/Layout';
import { useAuth } from '../../hooks/useAuth';
import incomeServices from '../../services/incomeServices';
import expenseServices from '../../services/expenseServices';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDateForDisplay } from '../../utils/dateUtils';
import { getFirstDayOfMonth, getEndOfDay } from '../../utils/dateUtils';
import { Income } from '../../types/income';
import { Expense } from '../../types/expense';

export const HomeScreen = () => {
  const { navigate, currentScreen } = useNavigation();
  const { user } = useAuth();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<Array<{
    item: Income | Expense;
    type: 'income' | 'expense';
  }>>([]);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Carregar dados do mês atual
  const loadData = async () => {
    if (!user?.id) {
      console.log('⚠️ [HOME] Usuário não disponível, pulando carregamento');
      setLoading(false);
      return;
    }

    // Evitar múltiplas chamadas simultâneas - usar flag separada
    if (loading) {
      console.log('⚠️ [HOME] Já está carregando, pulando...');
      return;
    }

    try {
      console.log('🏠 [HOME] Iniciando carregamento de dados...', { userId: user.id });
      setLoading(true);
      
      const today = new Date();
      const startOfMonth = getFirstDayOfMonth(today);
      const endOfToday = getEndOfDay(today);

      console.log('🏠 [HOME] Buscando dados do período:', { startOfMonth, endOfToday });

      // Carregar totais do mês em paralelo
      const [incomeTotal, expenseTotal, recentIncomes, recentExpenses] = await Promise.all([
        incomeServices.getIncomesTotal(user.id, startOfMonth, endOfToday).catch(err => {
          console.error('❌ [HOME] Erro ao buscar totais de renda:', err);
          return 0;
        }),
        expenseServices.getExpensesTotal(user.id, startOfMonth, endOfToday).catch(err => {
          console.error('❌ [HOME] Erro ao buscar totais de gastos:', err);
          return 0;
        }),
        incomeServices.getRecentIncomes(user.id, 5).catch(err => {
          console.error('❌ [HOME] Erro ao buscar rendas recentes:', err);
          return [];
        }),
        expenseServices.getRecentExpenses(user.id, 5).catch(err => {
          console.error('❌ [HOME] Erro ao buscar gastos recentes:', err);
          return [];
        }),
      ]);

      console.log('🏠 [HOME] Dados recebidos:', {
        incomeTotal,
        expenseTotal,
        recentIncomesCount: recentIncomes.length,
        recentExpensesCount: recentExpenses.length,
        startOfMonth: startOfMonth.toISOString(),
        endOfToday: endOfToday.toISOString(),
      });

      // Combinar e ordenar por data de criação
      const allTransactionsWithType = [
        ...recentIncomes.map(inc => ({ item: inc as Income | Expense, type: 'income' as const, createdAt: inc.createdAt })),
        ...recentExpenses.map(exp => ({ item: exp as Income | Expense, type: 'expense' as const, createdAt: exp.createdAt })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map(t => ({ item: t.item, type: t.type }));

      const calculatedBalance = incomeTotal - expenseTotal;

      // Atualizar estados
      setTotalIncome(incomeTotal);
      setTotalExpense(expenseTotal);
      setBalance(calculatedBalance);
      setRecentTransactions(allTransactionsWithType);
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

      console.log('✅ [HOME] Dados carregados e estados atualizados:', {
        incomeTotal: incomeTotal,
        expenseTotal: expenseTotal,
        balance: calculatedBalance,
        transactionsCount: allTransactionsWithType.length,
        formattedIncome: formatCurrency(incomeTotal),
        formattedExpense: formatCurrency(expenseTotal),
        formattedBalance: formatCurrency(calculatedBalance),
      });
    } catch (error: any) {
      console.error('❌ [HOME] Erro geral ao carregar dados:', error);
      console.error('❌ [HOME] Detalhes do erro:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });
      // Em caso de erro, definir valores padrão
      setTotalIncome(0);
      setTotalExpense(0);
      setBalance(0);
      setRecentTransactions([]);
      setHasLoaded(true); // Marcar como carregado mesmo com erro para mostrar estado vazio
    } finally {
      console.log('🏠 [HOME] Finalizando carregamento...');
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar dados quando montar ou voltar ao foco
  useEffect(() => {
    // Só carregar se estiver na tela Home
    if (currentScreen !== 'Home') {
      console.log('⚠️ [HOME] Não está na tela Home, pulando carregamento', { currentScreen });
      return;
    }

    // Aguardar usuário estar disponível
    if (!user?.id) {
      console.log('⚠️ [HOME] Aguardando usuário...', { 
        currentScreen, 
        hasUser: !!user,
        userId: user?.id
      });
      setLoading(false);
      return;
    }

    console.log('🏠 [HOME] Condições OK, iniciando carregamento...', { 
      currentScreen, 
      userId: user.id,
      hasLoaded,
      loading
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
  const handleDeleteTransaction = (id: string, type: 'income' | 'expense', description: string, value: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Deseja realmente excluir ${type === 'income' ? 'a renda' : 'o gasto'} "${description}" de ${formatCurrency(value)}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log(`🗑️ Deletando ${type}:`, id);
              if (type === 'income') {
                await incomeServices.deleteIncome(id);
              } else {
                await expenseServices.deleteExpense(id);
              }
              console.log(`✅ ${type === 'income' ? 'Renda' : 'Gasto'} deletado com sucesso`);
              // Recarregar dados
              await loadData();
              Alert.alert('Sucesso! ✅', `${type === 'income' ? 'Renda' : 'Gasto'} excluído com sucesso!`);
            } catch (error: any) {
              console.error(`❌ Erro ao deletar ${type}:`, error);
              Alert.alert('Erro', `Erro ao excluir ${type === 'income' ? 'a renda' : 'o gasto'}. Tente novamente.`);
            }
          },
        },
      ]
    );
  };

  // Handler para editar transação
  const handleEditTransaction = (id: string, type: 'income' | 'expense') => {
    console.log(`✏️ Editando ${type}:`, id);
    if (type === 'income') {
      navigate('EditIncome' as any, { id });
    } else {
      navigate('EditExpense' as any, { id });
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
          <View style={[styles.actionIconContainer, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={40} color={color} />
          </View>
          <Text style={styles.actionLabel}>{label}</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Componente TransactionItem com animação
  const TransactionItem: React.FC<{
    transaction: { item: Income | Expense; type: 'income' | 'expense' };
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

    if (type === 'expense') {
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
            <View style={[styles.transactionIconContainer, styles.transactionIconExpense]}>
              <Ionicons name="remove-circle" size={22} color="#F44336" />
            </View>
          </View>
          <View style={styles.transactionContent}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionDescription} numberOfLines={3}>
                {expense.description || 'Sem descrição'}
              </Text>
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditTransaction(expense.id, 'expense')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteTransaction(expense.id, 'expense', expense.description, expense.value)}
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
            <View style={[styles.transactionIconContainer, styles.transactionIconIncome]}>
              <Ionicons name="cash" size={22} color="#4CAF50" />
            </View>
          </View>
          <View style={styles.transactionContent}>
            <View style={styles.transactionHeader}>
              <Text style={styles.transactionDescription} numberOfLines={3}>
                {income.description || 'Sem descrição'}
              </Text>
              <View style={styles.transactionActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditTransaction(income.id, 'income')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteTransaction(income.id, 'income', income.description, income.value)}
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

  // Renderizar item de transação
  const renderTransactionItem = (transaction: { item: Income | Expense; type: 'income' | 'expense' }, index: number) => {
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
            colors={['#007AFF']}
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
                  <Ionicons name="wallet" size={40} color={balance < 0 ? '#F44336' : '#007AFF'} />
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
                    transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(10)) }],
                  },
                ]}
              >
                <View style={styles.cardIconContainer}>
                  <Ionicons name="trending-up" size={24} color="#4CAF50" />
                </View>
                <Text style={styles.summaryLabelIncome}>Total Recebido</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalIncome)}</Text>
                <Text style={styles.summarySubtext}>Este mês</Text>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.summaryCardSquare, 
                  styles.cardRed,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: Animated.add(slideAnim, new Animated.Value(10)) }],
                  },
                ]}
              >
                <View style={styles.cardIconContainer}>
                  <Ionicons name="trending-down" size={24} color="#F44336" />
                </View>
                <Text style={styles.summaryLabelExpense}>Total Gasto</Text>
                <Text style={styles.summaryValue}>{formatCurrency(totalExpense)}</Text>
                <Text style={styles.summarySubtext}>Este mês</Text>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Ações rápidas */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações Rápidas</Text>

            <View style={styles.actionsGrid}>
              <ActionCard
                icon="add-circle"
                label="Adicionar Renda"
                color="#4CAF50"
                onPress={() => navigate('AddIncome')}
                delay={0}
              />
              <ActionCard
                icon="remove-circle"
                label="Adicionar Gasto"
                color="#F44336"
                onPress={() => navigate('AddExpense')}
                delay={100}
              />
              <ActionCard
                icon="list"
                label="Ver Rendas"
                color="#007AFF"
                onPress={() => navigate('IncomeList')}
                delay={200}
              />
              <ActionCard
                icon="basket"
                label="Ver Gastos"
                color="#FF9800"
                onPress={() => navigate('ExpenseList')}
                delay={300}
              />
            </View>
          </View>

          {/* Últimas transações */}
          <View style={styles.transactionsContainer}>
            <Text style={styles.sectionTitle}>Últimas Transações</Text>
            {recentTransactions.length === 0 ? (
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
                {recentTransactions.map((item, index) =>
                  renderTransactionItem(item, index)
                )}
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
    padding: 20,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  // Card Horizontal (Saldo Atual)
  summaryCardHorizontal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  // Cards Quadrados (Total Gasto e Total Recebido)
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCardSquare: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardGreen: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardRed: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  summaryLabelBalance: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryLabelIncome: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryLabelExpense: {
    fontSize: 16,
    color: '#F44336',
    marginTop: 2,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  summaryValueSquare: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 4,
    letterSpacing: -0.3,
  },
  summarySubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCardWrapper: {
    flex: 1,
    minWidth: '45%',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderTopWidth: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 120,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionGreen: {
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  actionRed: {
    borderTopWidth: 3,
    borderTopColor: '#F44336',
  },
  actionBlue: {
    borderTopWidth: 3,
    borderTopColor: '#007AFF',
  },
  actionOrange: {
    borderTopWidth: 3,
    borderTopColor: '#FF9800',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  transactionsContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  cardNegative: {
    borderLeftColor: '#F44336',
  },
  summaryValueNegative: {
    color: '#F44336',
  },
  transactionsList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transactionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  transactionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  transactionIconIncome: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF5020',
  },
  transactionIconExpense: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F4433620',
  },
  transactionContent: {
    flex: 1,
    flexDirection: 'column',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  transactionDescription: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.1,
    marginRight: 8,
    lineHeight: 18,
    marginBottom: 0,
    paddingBottom: 0,
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionPriceContainer: {
    flex: 1,
    alignItems: 'flex-start',
    marginTop: -20,
  },
  transactionDateContainer: {
    alignItems: 'flex-end',
    marginLeft: 12,
    marginTop: 8,
  },
  transactionDate: {
    fontSize: 11,
    color: '#888',
    fontWeight: '700',
  },
  transactionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  transactionValueIncome: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 0.2,
  },
  transactionValueExpense: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F44336',
    letterSpacing: 0.2,
  },
});

export default HomeScreen;
