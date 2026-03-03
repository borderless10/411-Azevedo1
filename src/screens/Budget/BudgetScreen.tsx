/**
 * Tela de Controle de Orçamento Mensal
 */

import React, { useState, useRef, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { formatCurrency } from "../../utils/currencyUtils";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation } from "../../routes/NavigationContext";
import {
  budgetServices,
  getCurrentMonthYear,
} from "../../services/budgetServices";
import expenseServices from "../../services/expenseServices";
import {
  getFirstDayOfMonth,
  getStartOfDay,
  getEndOfDay,
  addDays,
} from "../../utils/dateUtils";
import { DailyExpense } from "../../types/budget";
import {
  requestNotificationPermissions,
  scheduleDailyExpenseReminder,
  cancelDailyExpenseReminder,
} from "../../services/notificationServices";

export const BudgetScreen = () => {
  const { user } = useAuth();
  const { currentScreen } = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [monthlyBudget, setMonthlyBudget] = useState<string>("");
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempValue, setTempValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [zeroConfirmedDays, setZeroConfirmedDays] = useState<number[]>([]);

  // Calcular dias do mês atual
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonthYear = getCurrentMonthYear();
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  ).getDate();

  // Calcular média diária ideal
  const budgetValue =
    parseFloat(monthlyBudget.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
  const idealDailyAverage = budgetValue / daysInMonth;

  // Calcular total gasto e média real
  const totalSpent = dailyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const daysPassed = dailyExpenses.length;
  const actualDailyAverage = daysPassed > 0 ? totalSpent / daysPassed : 0;

  // Status da média (se está acima ou abaixo do ideal)
  const isOverBudget =
    actualDailyAverage > idealDailyAverage && budgetValue > 0;

  const getPerformanceIndicator = () => {
    if (budgetValue <= 0) {
      return {
        label: "Sem meta definida",
        detail: "Defina seu orçamento mensal para gerar sua meta diária.",
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
        color: "#F44336",
        icon: "trending-up" as const,
      };
    }

    if (difference < -tolerance) {
      return {
        label: "Abaixo da meta",
        detail: `${formatCurrency(Math.abs(difference))} abaixo da meta diária.`,
        color: "#4CAF50",
        icon: "trending-down" as const,
      };
    }

    return {
      label: "Dentro da meta",
      detail: "Sua média diária está alinhada com a meta definida.",
      color: "#FF9800",
      icon: "checkmark-circle" as const,
    };
  };

  const performanceIndicator = getPerformanceIndicator();

  // Carregar dados do Firebase ao montar componente
  useEffect(() => {
    if (currentScreen === "Budget" && user) {
      loadBudgetData();
      setupNotifications();
    }
  }, [currentScreen, user]);

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

  const loadBudgetData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const budget = await budgetServices.getCurrentBudget(user.id);

      if (budget) {
        setMonthlyBudget(budget.monthlyBudget.toString());
        setZeroConfirmedDays(budget.zeroConfirmedDays || []);

        // Tentar preencher dailyExpenses a partir dos gastos reais do mês
        try {
          const today = new Date();
          const start = getFirstDayOfMonth(today);
          const end = getEndOfDay(today);

          const expenses = await expenseServices.getExpenses(user.id, {
            startDate: start,
            endDate: end,
          });

          const map = new Map<number, number>();
          let cursor = getStartOfDay(start);
          while (cursor <= getStartOfDay(today)) {
            map.set(cursor.getDate(), 0);
            cursor = addDays(cursor, 1);
          }

          expenses.forEach((exp) => {
            const dayNum = new Date(exp.date).getDate();
            const prev = map.get(dayNum) ?? 0;
            const val =
              typeof exp.value === "number"
                ? exp.value
                : parseFloat(String(exp.value)) || 0;
            map.set(dayNum, prev + val);
          });

          const computed: DailyExpense[] = [];
          Array.from(map.entries()).forEach(([day, amt]) => {
            computed.push({ day, amount: amt });
          });
          computed.sort((a, b) => a.day - b.day);

          // Se o orçamento já tinha valores manuais salvos, mesclar (priorizar gastos reais quando > 0)
          const merged =
            (budget.dailyExpenses || []).length > 0
              ? ((): DailyExpense[] => {
                  const byDay = new Map<number, number>();
                  computed.forEach((d) => byDay.set(d.day, d.amount));
                  (budget.dailyExpenses || []).forEach((d) => {
                    const existing = byDay.get(d.day) ?? 0;
                    // Priorizar valor real se houver (>0), caso contrário usar valor manual salvo
                    byDay.set(d.day, existing > 0 ? existing : d.amount);
                  });
                  const out: DailyExpense[] = [];
                  Array.from(byDay.entries()).forEach(([day, amount]) =>
                    out.push({ day, amount }),
                  );
                  return out.sort((a, b) => a.day - b.day);
                })()
              : computed;

          setDailyExpenses(merged);
        } catch (err) {
          console.error("❌ [BUDGET] Erro ao agregar gastos do mês:", err);
          setDailyExpenses(budget.dailyExpenses || []);
        }

        console.log("✅ Orçamento carregado do Firebase");
      } else {
        console.log("⚠️ Nenhum orçamento encontrado para este mês");
        setZeroConfirmedDays([]);
      }
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
        const hasExpenseToday = dailyExpenses.some(
          (expense) => expense.day === currentDay,
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

  const saveMonthlyBudget = async (value: string) => {
    if (!user) return;

    const numValue =
      parseFloat(value.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

    try {
      setSaving(true);
      await budgetServices.updateMonthlyBudget(
        user.id,
        currentMonthYear,
        numValue,
      );
      console.log("✅ Orçamento mensal salvo no Firebase");
    } catch (error) {
      console.error("❌ Erro ao salvar orçamento mensal:", error);
      Alert.alert("Erro", "Não foi possível salvar o orçamento");
    } finally {
      setSaving(false);
    }
  };

  const handleBudgetChange = (value: string) => {
    setMonthlyBudget(value);
  };

  const handleBudgetBlur = () => {
    saveMonthlyBudget(monthlyBudget);
  };

  const handleSaveExpense = async (day: number) => {
    if (!user) return;

    const value =
      parseFloat(tempValue.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

    if (value < 0) {
      Alert.alert("Erro", "O valor não pode ser negativo");
      return;
    }

    // Verificar se é o primeiro gasto do dia atual
    const isFirstExpenseToday =
      day === currentDay && !dailyExpenses.some((e) => e.day === currentDay);

    try {
      setSaving(true);

      // Atualizar localmente
      const existingIndex = dailyExpenses.findIndex((item) => item.day === day);
      let updatedExpenses: DailyExpense[];

      if (existingIndex >= 0) {
        updatedExpenses = [...dailyExpenses];
        updatedExpenses[existingIndex] = { day, amount: value };
      } else {
        updatedExpenses = [...dailyExpenses, { day, amount: value }].sort(
          (a, b) => a.day - b.day,
        );
      }

      setDailyExpenses(updatedExpenses);

      // Salvar no Firebase
      await budgetServices.updateDailyExpense(
        user.id,
        currentMonthYear,
        day,
        value,
      );
      console.log("✅ Gasto diário salvo no Firebase");

      // Se o dia tinha zero confirmado e agora recebeu valor > 0, remover da contagem local
      if (value > 0) {
        setZeroConfirmedDays((prev) => prev.filter((d) => d !== day));
      }

      // Se for o primeiro gasto de hoje, cancelar o lembrete das 21h
      if (isFirstExpenseToday) {
        await cancelDailyExpenseReminder();
        console.log("🔕 Lembrete diário cancelado (gasto registrado)");
      }

      setEditingDay(null);
      setTempValue("");
    } catch (error) {
      console.error("❌ Erro ao salvar gasto diário:", error);
      Alert.alert("Erro", "Não foi possível salvar o gasto");
    } finally {
      setSaving(false);
    }
  };

  const handleEditDay = (day: number) => {
    const existing = dailyExpenses.find((item) => item.day === day);
    setEditingDay(day);
    setTempValue(existing ? existing.amount.toString() : "");
  };

  const getDayExpense = (day: number): number => {
    const expense = dailyExpenses.find((item) => item.day === day);
    return expense ? expense.amount : 0;
  };

  if (loading) {
    return (
      <Layout
        title="Controle de Orçamento"
        showBackButton={false}
        showSidebar={true}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando orçamento...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Consumo Moderado" showBackButton={false} showSidebar={true}>
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
            <Ionicons name="wallet-outline" size={64} color="#007AFF" />
            <Text style={styles.title}>Orçamento Mensal</Text>
            <Text style={styles.subtitle}>
              Controle quanto você pode gastar por dia
            </Text>
            {saving && (
              <View style={styles.savingIndicator}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.savingText}>Salvando...</Text>
              </View>
            )}
          </View>

          {/* Meta Mensal */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              💰 Quanto você pode gastar este mês?
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#666"
                keyboardType="numeric"
                value={monthlyBudget}
                onChangeText={handleBudgetChange}
                onBlur={handleBudgetBlur}
              />
            </View>
            {budgetValue > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Média ideal por dia:</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(idealDailyAverage)}
                </Text>
              </View>
            )}
          </View>

          {/* Estatísticas */}
          {budgetValue > 0 && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Ionicons name="calendar-outline" size={24} color="#007AFF" />
                <Text style={styles.statLabel}>Dias no mês</Text>
                <Text style={styles.statValue}>{daysInMonth}</Text>
              </View>

              <View style={styles.statCard}>
                <Ionicons name="cash-outline" size={24} color="#4CAF50" />
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
                  color={isOverBudget ? "#F44336" : "#4CAF50"}
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
                  {zeroConfirmedDays.length}
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
                {Array.from({ length: currentDay }, (_, i) => {
                  const day = i + 1;
                  const expense = getDayExpense(day);
                  const isEditing = editingDay === day;
                  const isZeroConfirmed = zeroConfirmedDays.includes(day);

                  return (
                    <View
                      key={day}
                      style={[
                        styles.dayRow,
                        isZeroConfirmed && styles.dayRowZeroConfirmed,
                      ]}
                    >
                      <View style={styles.dayInfo}>
                        <Text style={styles.dayNumber}>Dia {day}</Text>
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
                              color="#4CAF50"
                            />
                            <Text style={styles.zeroConfirmedText}>
                              Zero confirmado
                            </Text>
                          </View>
                        )}
                      </View>

                      {isEditing ? (
                        <View style={styles.editContainer}>
                          <Text style={styles.currencySymbol}>R$</Text>
                          <TextInput
                            style={styles.dayInput}
                            placeholder="0,00"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={tempValue}
                            onChangeText={setTempValue}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => handleSaveExpense(day)}
                          >
                            <Ionicons name="checkmark" size={20} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => {
                              setEditingDay(null);
                              setTempValue("");
                            }}
                          >
                            <Ionicons name="close" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.editIconButton}
                          onPress={() => handleEditDay(day)}
                        >
                          <Ionicons name="pencil" size={18} color="#007AFF" />
                        </TouchableOpacity>
                      )}
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
                Defina seu orçamento mensal para começar
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>
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
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  savingText: {
    fontSize: 12,
    color: "#4CAF50",
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
    color: "#4CAF50",
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
    borderColor: "#F44336",
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
    color: "#F44336",
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
    color: "#4CAF50",
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
    borderColor: "#007AFF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  editIconButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F44336",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
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

export default BudgetScreen;
