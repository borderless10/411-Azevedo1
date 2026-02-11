/**
 * Tela de Contas a Pagar
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout } from '../../components/Layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigation } from '../../routes/NavigationContext';
import { formatCurrency } from '../../utils/currencyUtils';
import {
  createBill,
  getBills,
  updateBill,
  markBillAsPaid,
  deleteBill,
  updateOverdueBills,
} from '../../services/billServices';
import {
  scheduleBillNotification,
  cancelBillNotification,
  requestNotificationPermissions,
} from '../../services/notificationServices';
import { Bill } from '../../types/bill';

export const BillsScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { currentScreen } = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  // Form estados
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (currentScreen === 'Bills' && user) {
      loadBills();
      requestNotificationPermissions();
    }
  }, [currentScreen, user]);

  const loadBills = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await updateOverdueBills(user.id);
      const data = await getBills(user.id);
      setBills(data);
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as contas');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBill = async () => {
    if (!user || !title || !amount || !dueDate) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSaving(true);

      // Converter data DD/MM/YYYY para Date
      const [day, month, year] = dueDate.split('/');
      const dueDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      if (isNaN(dueDateObj.getTime())) {
        Alert.alert('Erro', 'Data inválida. Use o formato DD/MM/YYYY');
        return;
      }

      const amountValue = parseFloat(amount.replace(/[^0-9.,]/g, '').replace(',', '.'));

      const newBill = await createBill(user.id, {
        title,
        description: description || undefined,
        amount: amountValue,
        dueDate: dueDateObj,
      });

      // Agendar notificação
      const notificationId = await scheduleBillNotification(
        newBill.id,
        title,
        amountValue,
        dueDateObj
      );

      if (notificationId) {
        await updateBill(newBill.id, { notificationId });
      }

      Alert.alert('Sucesso', 'Conta cadastrada com sucesso!');
      setIsModalVisible(false);
      resetForm();
      loadBills();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      Alert.alert('Erro', 'Não foi possível criar a conta');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    Alert.alert(
      'Confirmar Pagamento',
      `Marcar "${bill.title}" como paga?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await markBillAsPaid(bill.id);
              if (bill.notificationId) {
                await cancelBillNotification(bill.id);
              }
              loadBills();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível marcar como paga');
            }
          },
        },
      ]
    );
  };

  const handleDeleteBill = async (bill: Bill) => {
    Alert.alert(
      'Confirmar Exclusão',
      `Excluir "${bill.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (bill.notificationId) {
                await cancelBillNotification(bill.id);
              }
              await deleteBill(bill.id);
              loadBills();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a conta');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setDueDate('');
  };

  const handleDateChange = (text: string) => {
    // Remover todos os caracteres não numéricos
    const numbers = text.replace(/[^0-9]/g, '');
    
    // Se está vazio, limpar o campo
    if (numbers.length === 0) {
      setDueDate('');
      return;
    }
    
    // Aplicar máscara DD/MM/YYYY
    let formatted = '';
    
    if (numbers.length <= 2) {
      formatted = numbers;
    } else if (numbers.length <= 4) {
      formatted = numbers.substring(0, 2) + '/' + numbers.substring(2);
    } else {
      formatted = numbers.substring(0, 2) + '/' + numbers.substring(2, 4) + '/' + numbers.substring(4, 8);
    }
    
    setDueDate(formatted);
  };

  const getFilteredBills = () => {
    if (filter === 'all') return bills;
    return bills.filter((bill) => bill.status === filter);
  };

  const formatDate = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'overdue':
        return colors.danger;
      default:
        return colors.warning;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paga';
      case 'overdue':
        return 'Vencida';
      default:
        return 'Pendente';
    }
  };

  const filteredBills = getFilteredBills();
  const totalPending = bills
    .filter((b) => b.status === 'pending')
    .reduce((sum, b) => sum + b.amount, 0);
  const totalOverdue = bills
    .filter((b) => b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <Layout title="Contas" showBackButton={false} showSidebar={true}>
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Carregando contas...
          </Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Contas" showBackButton={false} showSidebar={true}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Resumo */}
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={24} color={colors.warning} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Pendentes</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>
                {formatCurrency(totalPending)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Vencidas</Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>
                {formatCurrency(totalOverdue)}
              </Text>
            </View>
          </View>

          {/* Filtros */}
          <View style={styles.filterContainer}>
            {['all', 'pending', 'overdue', 'paid'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterButton,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setFilter(f as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    { color: colors.text },
                    filter === f && { color: '#fff' },
                  ]}
                >
                  {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'overdue' ? 'Vencidas' : 'Pagas'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lista de Contas */}
          {filteredBills.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Nenhuma conta {filter !== 'all' ? getStatusLabel(filter).toLowerCase() : 'cadastrada'}
              </Text>
            </View>
          ) : (
            filteredBills.map((bill) => (
              <View
                key={bill.id}
                style={[styles.billCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.billHeader}>
                  <View style={styles.billInfo}>
                    <Text style={[styles.billTitle, { color: colors.text }]}>{bill.title}</Text>
                    {bill.description && (
                      <Text style={[styles.billDescription, { color: colors.textSecondary }]}>
                        {bill.description}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(bill.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(bill.status) }]}>
                      {getStatusLabel(bill.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.billDetails}>
                  <View style={styles.billDetailItem}>
                    <Ionicons name="cash-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.billAmount, { color: colors.text }]}>
                      {formatCurrency(bill.amount)}
                    </Text>
                  </View>
                  <View style={styles.billDetailItem}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.billDate, { color: colors.textSecondary }]}>
                      Vence: {formatDate(bill.dueDate)}
                    </Text>
                  </View>
                </View>

                {bill.status === 'pending' || bill.status === 'overdue' ? (
                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.success }]}
                      onPress={() => handleMarkAsPaid(bill)}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Pagar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.danger }]}
                      onPress={() => handleDeleteBill(bill)}
                    >
                      <Ionicons name="trash" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.danger, flex: 1 }]}
                      onPress={() => handleDeleteBill(bill)}
                    >
                      <Ionicons name="trash" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </Animated.View>
      </ScrollView>

      {/* Botão Adicionar */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Modal Adicionar Conta */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Nova Conta</Text>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Título *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Ex: Conta de Luz"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Descrição</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Detalhes opcionais"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Valor *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="Ex: 150.00"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.text }]}>Data de Vencimento *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                      value={dueDate}
                      onChangeText={handleDateChange}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleCreateBill}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Cadastrar Conta</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  billCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billInfo: {
    flex: 1,
    marginRight: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  billDescription: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  billDetails: {
    gap: 8,
  },
  billDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  billAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  billDate: {
    fontSize: 14,
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BillsScreen;
