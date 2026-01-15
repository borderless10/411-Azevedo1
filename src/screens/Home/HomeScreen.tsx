/**
 * Tela Home - Dashboard Inicial
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '../../routes/NavigationContext';

export const HomeScreen = () => {
  const { user, signOut } = useAuth();
  const { navigate } = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá,</Text>
            <Text style={styles.userName}>{user?.name || user?.email} 👋</Text>
          </View>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Cards de resumo rápido */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.cardGreen]}>
            <Ionicons name="trending-up" size={32} color="#4CAF50" />
            <Text style={styles.summaryLabel}>Total Recebido</Text>
            <Text style={styles.summaryValue}>R$ 0,00</Text>
            <Text style={styles.summarySubtext}>Este mês</Text>
          </View>

          <View style={[styles.summaryCard, styles.cardRed]}>
            <Ionicons name="trending-down" size={32} color="#F44336" />
            <Text style={styles.summaryLabel}>Total Gasto</Text>
            <Text style={styles.summaryValue}>R$ 0,00</Text>
            <Text style={styles.summarySubtext}>Este mês</Text>
          </View>

          <View style={[styles.summaryCard, styles.cardBlue]}>
            <Ionicons name="wallet" size={32} color="#007AFF" />
            <Text style={styles.summaryLabel}>Saldo Atual</Text>
            <Text style={styles.summaryValue}>R$ 0,00</Text>
            <Text style={styles.summarySubtext}>Disponível</Text>
          </View>
        </View>

        {/* Ações rápidas */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Ações Rápidas</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionGreen]}
              onPress={() => navigate('AddIncome')}
            >
              <Ionicons name="add-circle" size={40} color="#4CAF50" />
              <Text style={styles.actionLabel}>Adicionar Renda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionRed]}
              onPress={() => navigate('AddExpense')}
            >
              <Ionicons name="remove-circle" size={40} color="#F44336" />
              <Text style={styles.actionLabel}>Adicionar Gasto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionBlue]}
              onPress={() => navigate('IncomeList')}
            >
              <Ionicons name="list" size={40} color="#007AFF" />
              <Text style={styles.actionLabel}>Ver Rendas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.actionOrange]}
              onPress={() => navigate('ExpenseList')}
            >
              <Ionicons name="basket" size={40} color="#FF9800" />
              <Text style={styles.actionLabel}>Ver Gastos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Últimas transações */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.sectionTitle}>Últimas Transações</Text>
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma transação ainda</Text>
            <Text style={styles.emptySubtext}>
              Comece adicionando uma renda ou gasto
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  summaryContainer: {
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionsContainer: {
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
});

export default HomeScreen;
