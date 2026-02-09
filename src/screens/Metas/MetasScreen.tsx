/**
 * Tela de Metas Financeiras
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../../components/Layout/Layout';
import { formatCurrency } from '../../utils/currencyUtils';
import { useAuth } from '../../contexts/AuthContext';
import { goalServices } from '../../services/goalServices';
import {
  Goal,
  GoalStatus,
  GoalCategory,
  GOAL_CATEGORIES,
  getCategoryInfo,
  CreateGoalData,
} from '../../types/goal';

export const MetasScreen = () => {
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | GoalStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showContributionModal, setShowContributionModal] = useState<boolean>(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [contributionAmount, setContributionAmount] = useState<string>('');
  const [contributionNote, setContributionNote] = useState<string>('');

  // Form de criar meta
  const [newGoalTitle, setNewGoalTitle] = useState<string>('');
  const [newGoalDescription, setNewGoalDescription] = useState<string>('');
  const [newGoalTarget, setNewGoalTarget] = useState<string>('');
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>('savings');
  const [saving, setSaving] = useState<boolean>(false);

  // Carregar metas ao montar componente
  useEffect(() => {
    loadGoals();
  }, []);

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

  const loadGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const fetchedGoals = await goalServices.getGoals(user.id);
      setGoals(fetchedGoals);
      console.log('✅ Metas carregadas:', fetchedGoals.length);
    } catch (error) {
      console.error('❌ Erro ao carregar metas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as metas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async () => {
    if (!user) return;

    const targetAmount = parseFloat(newGoalTarget.replace(/[^0-9.,]/g, '').replace(',', '.'));

    if (!newGoalTitle.trim()) {
      Alert.alert('Erro', 'Digite um título para a meta');
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido para a meta');
      return;
    }

    try {
      setSaving(true);
      const goalData: CreateGoalData = {
        title: newGoalTitle,
        description: newGoalDescription,
        targetAmount,
        category: newGoalCategory,
      };

      await goalServices.createGoal(user.id, goalData);
      Alert.alert('Sucesso', 'Meta criada com sucesso!');
      
      // Resetar form
      setNewGoalTitle('');
      setNewGoalDescription('');
      setNewGoalTarget('');
      setNewGoalCategory('savings');
      setShowCreateModal(false);

      // Recarregar metas
      await loadGoals();
    } catch (error: any) {
      console.error('❌ Erro ao criar meta:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar a meta');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContribution = async () => {
    if (!user || !selectedGoal) return;

    const amount = parseFloat(contributionAmount.replace(/[^0-9.,]/g, '').replace(',', '.'));

    if (!amount || amount <= 0) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    try {
      setSaving(true);
      await goalServices.addContribution(
        selectedGoal.id,
        amount,
        contributionNote.trim() || undefined
      );

      Alert.alert('Sucesso', 'Contribuição adicionada com sucesso!');
      
      // Resetar form
      setContributionAmount('');
      setContributionNote('');
      setShowContributionModal(false);
      setSelectedGoal(null);

      // Recarregar metas
      await loadGoals();
    } catch (error: any) {
      console.error('❌ Erro ao adicionar contribuição:', error);
      Alert.alert('Erro', error.message || 'Não foi possível adicionar contribuição');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoal = (goal: Goal) => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir a meta "${goal.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await goalServices.deleteGoal(goal.id);
              Alert.alert('Sucesso', 'Meta excluída com sucesso!');
              await loadGoals();
            } catch (error) {
              console.error('❌ Erro ao excluir meta:', error);
              Alert.alert('Erro', 'Não foi possível excluir a meta');
            }
          },
        },
      ]
    );
  };

  const openContributionModal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowContributionModal(true);
  };

  const filteredGoals = goals.filter(goal => 
    filter === 'all' ? true : goal.status === filter
  );

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalProgress = goals.length > 0
    ? (goals.reduce((sum, g) => sum + g.currentAmount, 0) / 
       goals.reduce((sum, g) => sum + g.targetAmount, 0)) * 100
    : 0;

  if (loading) {
    return (
      <Layout title="Metas Financeiras" showBackButton={false} showSidebar={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F44336" />
          <Text style={styles.loadingText}>Carregando metas...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Metas Financeiras" showBackButton={false} showSidebar={true}>
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
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="flag" size={64} color="#F44336" />
            <Text style={styles.title}>Metas Financeiras</Text>
            <Text style={styles.subtitle}>
              Defina e acompanhe suas metas
            </Text>
          </View>

          {/* Estatísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Ionicons name="flag-outline" size={24} color="#F44336" />
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{goals.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="play-circle" size={24} color="#4CAF50" />
              <Text style={styles.statLabel}>Ativas</Text>
              <Text style={styles.statValue}>{activeGoals.length}</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
              <Text style={styles.statLabel}>Concluídas</Text>
              <Text style={styles.statValue}>{completedGoals.length}</Text>
            </View>
          </View>

          {/* Progresso Total */}
          {goals.length > 0 && (
            <View style={styles.totalProgressCard}>
              <Text style={styles.totalProgressLabel}>Progresso Total</Text>
              <Text style={styles.totalProgressValue}>
                {totalProgress.toFixed(1)}%
              </Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(totalProgress, 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {/* Botão Criar Meta */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Criar Nova Meta</Text>
          </TouchableOpacity>

          {/* Filtros */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
              onPress={() => setFilter('active')}
            >
              <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
                Ativas
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
              onPress={() => setFilter('completed')}
            >
              <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
                Concluídas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Metas */}
          {filteredGoals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={64} color="#666" />
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Nenhuma meta cadastrada'
                  : `Nenhuma meta ${filter === 'active' ? 'ativa' : 'concluída'}`}
              </Text>
              <Text style={styles.emptySubtext}>
                Crie sua primeira meta financeira
              </Text>
            </View>
          ) : (
            <View style={styles.goalsList}>
              {filteredGoals.map((goal) => {
                const categoryInfo = getCategoryInfo(goal.category);
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const isCompleted = goal.status === 'completed';

                return (
                  <View key={goal.id} style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalTitleRow}>
                        <View
                          style={[
                            styles.categoryIcon,
                            { backgroundColor: categoryInfo.color + '20' },
                          ]}
                        >
                          <Ionicons
                            name={categoryInfo.icon as any}
                            size={20}
                            color={categoryInfo.color}
                          />
                        </View>
                        <View style={styles.goalTitleContainer}>
                          <Text style={styles.goalTitle}>{goal.title}</Text>
                          <Text style={styles.goalCategory}>{categoryInfo.label}</Text>
                        </View>
                      </View>
                      {isCompleted && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                        </View>
                      )}
                    </View>

                    {goal.description && (
                      <Text style={styles.goalDescription}>{goal.description}</Text>
                    )}

                    <View style={styles.goalAmounts}>
                      <Text style={styles.currentAmount}>
                        {formatCurrency(goal.currentAmount)}
                      </Text>
                      <Text style={styles.targetAmount}>
                        de {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { 
                            width: `${Math.min(progress, 100)}%`,
                            backgroundColor: isCompleted ? '#4CAF50' : categoryInfo.color,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.progressText}>{progress.toFixed(1)}% concluído</Text>

                    <View style={styles.goalActions}>
                      {!isCompleted && (
                        <TouchableOpacity
                          style={[styles.actionButton, styles.addButton]}
                          onPress={() => openContributionModal(goal)}
                        >
                          <Ionicons name="add" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>Adicionar</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
                        onPress={() => handleDeleteGoal(goal)}
                      >
                        <Ionicons name="trash" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>Excluir</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Criar Meta */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nova Meta</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Título da Meta</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Comprar um carro"
                placeholderTextColor="#666"
                value={newGoalTitle}
                onChangeText={setNewGoalTitle}
              />

              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descreva sua meta..."
                placeholderTextColor="#666"
                value={newGoalDescription}
                onChangeText={setNewGoalDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Valor da Meta</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={newGoalTarget}
                  onChangeText={setNewGoalTarget}
                />
              </View>

              <Text style={styles.label}>Categoria</Text>
              <View style={styles.categoryGrid}>
                {GOAL_CATEGORIES.map((cat) => {
                  const isSelected = newGoalCategory === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[
                        styles.categoryButton,
                        isSelected && styles.categoryButtonActive,
                        { borderColor: isSelected ? cat.color : '#333' },
                      ]}
                      onPress={() => setNewGoalCategory(cat.value)}
                    >
                      <Ionicons 
                        name={cat.icon as any} 
                        size={isSelected ? 28 : 24} 
                        color={cat.color} 
                      />
                      <Text style={[
                        styles.categoryButtonText,
                        isSelected && styles.categoryButtonTextActive,
                      ]}>
                        {cat.label}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color={cat.color} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleCreateGoal}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>Criar Meta</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Adicionar Contribuição */}
      <Modal
        visible={showContributionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContributionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowContributionModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adicionar Contribuição</Text>
              <TouchableOpacity onPress={() => setShowContributionModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedGoal && (
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.selectedGoalTitle}>{selectedGoal.title}</Text>

                <Text style={styles.label}>Valor</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>R$</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0,00"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    value={contributionAmount}
                    onChangeText={setContributionAmount}
                  />
                </View>

                <Text style={styles.label}>Observação (opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ex: Salário do mês"
                  placeholderTextColor="#666"
                  value={contributionNote}
                  onChangeText={setContributionNote}
                  multiline
                  numberOfLines={2}
                />
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddContribution}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.saveButtonText}>Adicionar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    color: '#999',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  totalProgressCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 16,
  },
  totalProgressLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  totalProgressValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 8,
  },
  createButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#F44336',
    borderColor: '#F44336',
  },
  filterText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  goalsList: {
    gap: 16,
  },
  goalCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  goalCategory: {
    fontSize: 12,
    color: '#999',
  },
  completedBadge: {
    marginLeft: 8,
  },
  goalDescription: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 8,
  },
  currentAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  targetAmount: {
    fontSize: 14,
    color: '#999',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  goalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  selectedGoalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  categoryButtonActive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  categoryButtonText: {
    fontSize: 10,
    color: '#999',
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

export default MetasScreen;
