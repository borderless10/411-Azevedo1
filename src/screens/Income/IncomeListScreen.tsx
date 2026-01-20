/**
 * Tela de Listagem de Rendas
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';
import { Layout } from '../../components/Layout/Layout';
import { Button } from '../../components/ui/Button/Button';
import incomeServices from '../../services/incomeServices';
import { Income } from '../../types/income';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDateForDisplay, formatDateToString } from '../../utils/dateUtils';

export const IncomeListScreen = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  // Carregar rendas
  const loadIncomes = async () => {
    if (!user) return;

    try {
      console.log('💰 Carregando rendas...');
      const data = await incomeServices.getIncomes(user.id);
      setIncomes(data);

      // Calcular total
      const sum = data.reduce((acc, income) => acc + income.value, 0);
      setTotal(sum);

      console.log('✅ Rendas carregadas:', data.length, 'Total:', sum);
    } catch (error) {
      console.error('❌ Erro ao carregar rendas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadIncomes();
  }, [user]);

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadIncomes();
  };

  // Agrupar por data
  const groupedByDate = incomes.reduce((acc, income) => {
    const dateKey = formatDateToString(income.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(income);
    return acc;
  }, {} as Record<string, Income[]>);

  const groupedEntries = Object.entries(groupedByDate).sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  // Renderizar item
  const renderIncomeItem = (income: Income) => (
    <TouchableOpacity
      key={income.id}
      style={styles.incomeItem}
      onPress={() => {
        // TODO: Navegar para edição
        console.log('Editar renda:', income.id);
      }}
    >
      <View style={styles.incomeItemLeft}>
        <View style={styles.incomeIconContainer}>
          <Ionicons name="cash" size={24} color="#4CAF50" />
        </View>
        <View style={styles.incomeInfo}>
          <Text style={styles.incomeDescription} numberOfLines={1}>
            {income.description}
          </Text>
          <View style={styles.incomeMeta}>
            <Ionicons name="pricetag-outline" size={14} color="#999" />
            <Text style={styles.incomeCategory}>{income.category}</Text>
            <Text style={styles.incomeTime}>
              {formatDateForDisplay(income.date)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.incomeItemRight}>
        <Text style={styles.incomeValue}>+{formatCurrency(income.value)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Renderizar grupo de data
  const renderDateGroup = (date: string, dateIncomes: Income[]) => {
    const dayTotal = dateIncomes.reduce((sum, income) => sum + income.value, 0);

    return (
      <View key={date} style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{formatDateForDisplay(new Date(date))}</Text>
          <Text style={styles.dateTotal}>+{formatCurrency(dayTotal)}</Text>
        </View>
        <View style={styles.incomeList}>
          {dateIncomes.map(renderIncomeItem)}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Layout title="Minhas Rendas" showBackButton={true} showSidebar={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando rendas...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Minhas Rendas" showBackButton={true} showSidebar={false}>
      <View style={styles.container}>
        {/* Header com total */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Recebido</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(total)}
              </Text>
              <Text style={styles.totalSubtext}>
                {incomes.length} {incomes.length === 1 ? 'renda' : 'rendas'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigate('AddIncome')}
            >
              <Ionicons name="add-circle" size={32} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de rendas */}
        {incomes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma renda ainda</Text>
            <Text style={styles.emptySubtext}>
              Comece adicionando sua primeira renda
            </Text>
            <Button
              title="Adicionar Renda"
              onPress={() => navigate('AddIncome')}
              variant="primary"
              icon="add"
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#007AFF']}
              />
            }
          >
            <View style={styles.content}>
              {groupedEntries.map(([date, dateIncomes]) =>
                renderDateGroup(date, dateIncomes)
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ccc',
  },
  header: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    padding: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  totalSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  addButton: {
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  dateTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  incomeList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  incomeItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  incomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a3a1a',
    borderWidth: 1,
    borderColor: '#4CAF5040',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  incomeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  incomeCategory: {
    fontSize: 12,
    color: '#999',
  },
  incomeTime: {
    fontSize: 12,
    color: '#999',
  },
  incomeItemRight: {
    marginLeft: 12,
  },
  incomeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ccc',
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyButton: {
    minWidth: 200,
  },
});

export default IncomeListScreen;
