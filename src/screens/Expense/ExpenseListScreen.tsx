/**
 * Tela de Listagem de Gastos
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { Button } from "../../components/ui/Button/Button";
import expenseServices from "../../services/expenseServices";
import { Expense } from "../../types/expense";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  formatDateForDisplay,
  formatDateToString,
} from "../../utils/dateUtils";
import {
  getExpenseScopeLabel,
  shouldShowExpenseCategoryTag,
} from "../../utils/expenseScopeUtils";

// ─── helpers de tag ──────────────────────────────────────────────
const PAYMENT_TAG: Record<
  string,
  { label: string; icon: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap; color: string; bg: string }
> = {
  credit_card: { label: "Crédito", icon: "card", color: "#c9b5ff", bg: "#2f214d" },
  debit_card:  { label: "Débito",  icon: "card-outline", color: "#86efac", bg: "#14351f" },
  pix:         { label: "Pix",     icon: "flash", color: "#67e8f9", bg: "#0e2e35" },
  cash:        { label: "Dinheiro",icon: "cash-outline", color: "#fde68a", bg: "#352e10" },
  other:       { label: "Outro",   icon: "ellipsis-horizontal", color: "#aaa", bg: "#222" },
};

const SCOPE_TAG: Record<
  string,
  { color: string; bg: string }
> = {
  "Consumo Moderado":  { color: "#c084fc", bg: "#280a3a" },
  "Acompanhamento":    { color: "#34d399", bg: "#062820" },
  "Conta":             { color: "#f87171", bg: "#300e0e" },
};

const ScopeBadge = ({ expense }: { expense: Expense }) => {
  const scope = getExpenseScopeLabel(expense);
  if (!scope) return null;
  const tag = SCOPE_TAG[scope];
  if (!tag) return null;
  return (
    <View style={[tagStyles.base, { backgroundColor: tag.bg, borderColor: tag.color + "55" }]}>
      <Text style={[tagStyles.text, { color: tag.color }]}>{scope}</Text>
    </View>
  );
};

const CategoryBadge = ({ expense }: { expense: Expense }) => {
  if (!shouldShowExpenseCategoryTag(expense)) return null;
  return (
    <View style={[tagStyles.base, { backgroundColor: "#1a1a1a", borderColor: "#333" }]}>
      <Text style={[tagStyles.text, { color: "#888" }]}>{expense.category}</Text>
    </View>
  );
};

const PaymentBadge = ({ expense }: { expense: Expense }) => {
  const pm = expense.paymentMethod ?? "other";
  const tag = PAYMENT_TAG[pm] ?? PAYMENT_TAG.other;
  return (
    <View style={[tagStyles.base, { backgroundColor: tag.bg, borderColor: tag.color + "55", flexDirection: "row", alignItems: "center", gap: 3 }]}>
      <Ionicons name={tag.icon as any} size={10} color={tag.color} />
      <Text style={[tagStyles.text, { color: tag.color }]}>{tag.label}</Text>
      {expense.paymentMethod === "credit_card" && expense.cardLast4 ? (
        <Text style={[tagStyles.text, { color: tag.color, opacity: 0.7 }]}>••{expense.cardLast4}</Text>
      ) : null}
    </View>
  );
};

const tagStyles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});

export const ExpenseListScreen = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null,
  );
  const [paymentFilter, setPaymentFilter] = useState<
    "all" | "credit_card" | "debit_card" | "cash" | "pix" | "other"
  >("all");

  // Carregar gastos
  const loadExpenses = async () => {
    if (!user) return;

    try {
      console.log("💸 Carregando gastos...");
      const data = await expenseServices.getExpenses(user.id, {
        ...(paymentFilter !== "all" ? { paymentMethod: paymentFilter } : {}),
      });
      setExpenses(data);

      // Calcular total
      const sum = data.reduce((acc, expense) => acc + expense.value, 0);
      setTotal(sum);

      console.log("✅ Gastos carregados:", data.length, "Total:", sum);
    } catch (error) {
      console.error("❌ Erro ao carregar gastos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [user, paymentFilter]);

  // Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  const handleDeleteExpense = (id: string, description: string) => {
    Alert.alert("Excluir gasto", `Deseja excluir o gasto \"${description}\"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingExpenseId(id);
            await expenseServices.deleteExpense(id);
            await loadExpenses();
          } catch (error) {
            console.error("❌ Erro ao excluir gasto:", error);
            Alert.alert("Erro", "Não foi possível excluir o gasto.");
          } finally {
            setDeletingExpenseId(null);
          }
        },
      },
    ]);
  };

  // Agrupar por data
  const groupedByDate = expenses.reduce(
    (acc, expense) => {
      const dateKey = formatDateToString(expense.date);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(expense);
      return acc;
    },
    {} as Record<string, Expense[]>,
  );

  const groupedEntries = Object.entries(groupedByDate).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );

  // Renderizar item
  const renderExpenseItem = (expense: Expense) => (
    <TouchableOpacity
      key={expense.id}
      style={styles.expenseItem}
      onPress={() => navigate("EditExpense", { expenseId: expense.id })}
    >
      <View style={styles.expenseItemLeft}>
        <View style={styles.expenseIconContainer}>
          <Ionicons name="remove-circle" size={24} color="#ff4d6d" />
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription} numberOfLines={1}>
            {expense.description}
          </Text>
          {/* Linha de tags */}
          <View style={styles.tagsRow}>
            <ScopeBadge expense={expense} />
            <PaymentBadge expense={expense} />
            <CategoryBadge expense={expense} />
          </View>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseTime}>
              {formatDateForDisplay(expense.date)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.expenseItemRight}>
        <Text style={styles.expenseValue}>
          -{formatCurrency(expense.value)}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteExpense(expense.id, expense.description)}
          disabled={deletingExpenseId === expense.id}
        >
          {deletingExpenseId === expense.id ? (
            <ActivityIndicator size="small" color="#ff4d6d" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Renderizar grupo de data
  const renderDateGroup = (date: string, dateExpenses: Expense[]) => {
    const dayTotal = dateExpenses.reduce(
      (sum, expense) => sum + expense.value,
      0,
    );
    const [year, month, day] = date.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);

    return (
      <View key={date} style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>
            {formatDateForDisplay(displayDate)}
          </Text>
          <Text style={styles.dateTotal}>-{formatCurrency(dayTotal)}</Text>
        </View>
        <View style={styles.expenseList}>
          {dateExpenses.map(renderExpenseItem)}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <Layout title="Meus Gastos" showBackButton={true} showSidebar={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando gastos...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout title="Meus Gastos" showBackButton={true} showSidebar={false}>
      <View style={styles.container}>
        {/* Header com total */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Gasto</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
              <Text style={styles.totalSubtext}>
                {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigate("AddExpense")}
            >
              <Ionicons name="add-circle" size={32} color="#ff4d6d" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterRow}>
            {[
              { id: "all", label: "Todos" },
              { id: "credit_card", label: "Cartão" },
              { id: "debit_card", label: "Débito" },
              { id: "pix", label: "PIX" },
              { id: "cash", label: "Dinheiro" },
            ].map((item) => {
              const active = paymentFilter === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                  ]}
                  onPress={() => setPaymentFilter(item.id as any)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Lista de gastos */}
        {expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="remove-circle-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhum gasto ainda</Text>
            <Text style={styles.emptySubtext}>
              Comece adicionando seu primeiro gasto
            </Text>
            <Button
              title="Adicionar Gasto"
              onPress={() => navigate("AddExpense")}
              variant="danger"
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
                colors={["#8c52ff"]}
              />
            }
          >
            <View style={styles.content}>
              {groupedEntries.map(([date, dateExpenses]) =>
                renderDateGroup(date, dateExpenses),
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
    color: "#ccc",
  },
  header: {
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ff4d6d",
  },
  totalSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  addButton: {
    marginLeft: 16,
  },
  filterRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#2b2b2b",
  },
  filterChipActive: {
    backgroundColor: "#8c52ff",
    borderColor: "#8c52ff",
  },
  filterChipText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  dateTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ff4d6d",
  },
  expenseList: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  expenseItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  expenseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#3a1a1a",
    borderWidth: 1,
    borderColor: "#ff4d6d40",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 4,
  },
  expenseMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expenseCategory: {
    fontSize: 11,
    color: "#555",
    flexShrink: 1,
  },
  expenseTime: {
    fontSize: 11,
    color: "#555",
  },
  expenseItemRight: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 12,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a1318",
  },
  expenseValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ff4d6d",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ccc",
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  emptyButton: {
    minWidth: 200,
  },
});

export default ExpenseListScreen;
