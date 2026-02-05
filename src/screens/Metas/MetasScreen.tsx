/**
 * Tela de Metas
 * Versão simples, 100% local (sem salvar em banco), para visualizar e simular progresso em metas financeiras.
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../../components/Layout/Layout';

type Goal = {
  id: string;
  title: string;
  description: string;
  category: 'Reserva' | 'Dívidas' | 'Sonhos';
  current: number;
  target: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

const INITIAL_GOALS: Goal[] = [
  {
    id: 'g1',
    title: 'Reserva de emergência',
    description: 'Guardar um valor equivalente a 3 meses de gastos fixos.',
    category: 'Reserva',
    current: 1500,
    target: 6000,
    icon: 'shield-half-outline',
    color: '#4CAF50',
  },
  {
    id: 'g2',
    title: 'Quitar cartão de crédito',
    description: 'Reduzir o saldo do cartão até zerar a fatura atual.',
    category: 'Dívidas',
    current: 800,
    target: 2000,
    icon: 'card-outline',
    color: '#F44336',
  },
  {
    id: 'g3',
    title: 'Viagem de fim de ano',
    description: 'Juntar um valor para viagem e hospedagem.',
    category: 'Sonhos',
    current: 500,
    target: 3000,
    icon: 'airplane-outline',
    color: '#FF9800',
  },
];

export const MetasScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);

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

  const totalGoals = goals.length;
  const completedGoals = goals.filter((g) => g.current >= g.target).length;

  const handleSimulateProgress = (id: string) => {
    setGoals((prev) =>
      prev.map((goal) => {
        if (goal.id !== id) return goal;
        const increment = goal.target * 0.1; // +10% da meta
        const newCurrent = Math.min(goal.current + increment, goal.target);
        return { ...goal, current: newCurrent };
      }),
    );
  };

  const formatCurrency = (value: number) =>
    `R$ ${value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} `;

  const GoalCard: React.FC<{ goal: Goal }> = ({ goal }) => {
    const progress = Math.min(goal.current / goal.target, 1);
    const percentage = Math.round(progress * 100);
    const isCompleted = percentage >= 100;

    return (
      <View style={styles.goalCard}>
        <View style={styles.goalHeader}>
          <View style={[styles.goalIconContainer, { backgroundColor: `${goal.color}25` }]}>
            <Ionicons name={goal.icon} size={24} color={goal.color} />
          </View>
          <View style={styles.goalHeaderText}>
            <Text style={styles.goalTitle}>{goal.title}</Text>
            <Text style={styles.goalCategory}>{goal.category}</Text>
          </View>
          {isCompleted && (
            <View style={styles.goalBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.goalBadgeText}>Concluída</Text>
            </View>
          )}
        </View>

        <Text style={styles.goalDescription}>{goal.description}</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressAmount}>
            {formatCurrency(goal.current)} / {formatCurrency(goal.target)}
          </Text>
          <Text style={[styles.progressPercentage, isCompleted && styles.progressPercentageDone]}>
            {percentage}%
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.max(8, percentage)}%`, // nunca muito fininha
                backgroundColor: isCompleted ? '#4CAF50' : goal.color,
              },
            ]}
          />
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.progressButton}
            onPress={() => handleSimulateProgress(goal.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trending-up" size={18} color="#fff" />
            <Text style={styles.progressButtonText}>Simular avanço (+10%)</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Layout title="Metas" showBackButton={false} showSidebar={true}>
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
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Ionicons name="flag-outline" size={64} color="#F44336" />
            <Text style={styles.title}>Metas financeiras</Text>
            <Text style={styles.subtitle}>
              Acompanhe, de forma simples, o quanto você já avançou em cada objetivo.
            </Text>
          </View>

          {/* Resumo rápido */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="list-outline" size={20} color="#03A9F4" />
              </View>
              <Text style={styles.summaryLabel}>Metas criadas</Text>
              <Text style={styles.summaryValue}>{totalGoals}</Text>
            </View>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="checkmark-done-outline" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.summaryLabel}>Concluídas</Text>
              <Text style={styles.summaryValue}>{completedGoals}</Text>
            </View>
          </View>

          {/* Lista de metas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suas metas</Text>
            {goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#999',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  goalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  goalHeaderText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  goalCategory: {
    fontSize: 12,
    color: '#999',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  goalBadgeText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
  },
  goalDescription: {
    fontSize: 13,
    color: '#ccc',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressAmount: {
    fontSize: 12,
    color: '#aaa',
  },
  progressPercentage: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600',
  },
  progressPercentageDone: {
    color: '#4CAF50',
  },
  progressBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#111',
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  progressButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
});

export default MetasScreen;
