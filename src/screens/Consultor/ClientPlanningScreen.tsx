/**
 * Tela (esqueleto) para que o consultor crie/edite o planejamento do cliente
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { planningServices } from "../../services/planningServices";
import { userService } from "../../services/userServices";
import type { Bill, ExpectedItem } from "../../types/planning";
import { getCategoriesByType } from "../../types/category";
import { formatCurrency } from "../../utils/currencyUtils";

export const ClientPlanningScreen = () => {
  const { user } = useAuth();
  const { navigate, params } = useNavigation();
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plannedByCategory, setPlannedByCategory] = useState<
    Record<string, string>
  >({});
  const [bills, setBills] = useState<Bill[]>([]);
  const [expectedIncomes, setExpectedIncomes] = useState<ExpectedItem[]>([]);
  const [expectedExpenses, setExpectedExpenses] = useState<ExpectedItem[]>([]);
  const [newBillName, setNewBillName] = useState("");
  const [newBillAmount, setNewBillAmount] = useState("");
  const [addingBill, setAddingBill] = useState(false);
  // Modal states for creating bills/incomes
  const [isBillModalVisible, setIsBillModalVisible] = useState(false);
  const [billTitle, setBillTitle] = useState("");
  const [billDescription, setBillDescription] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");
  const [savingBill, setSavingBill] = useState(false);

  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeMonth, setIncomeMonth] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);
  const [activeTab, setActiveTab] = useState<"gastos" | "rendas">("gastos");

  useEffect(() => {
    async function init() {
      if (!params?.clientId) {
        navigate("ClientList");
        return;
      }

      try {
        setLoading(true);
        const currentClient = await userService.getUserById(params.clientId);
        if (currentClient) {
          setSelectedClient(currentClient);
          return;
        }

        Alert.alert("Erro", "Cliente não encontrado");
        navigate("ClientList");
      } catch (error) {
        console.warn("Erro ao carregar cliente do planejamento", error);
        Alert.alert("Erro", "Não foi possível carregar o cliente");
        navigate("ClientList");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate, params?.clientId]);

  useEffect(() => {
    async function loadPlanning() {
      if (!selectedClient) return;

      try {
        const planning = await planningServices.getPlanning(selectedClient.id);

        if (planning) {
          // monthlyIncome removed from UI; ignore planning.monthlyIncome
          setNotes(planning.notes || "");
          setPlannedByCategory(
            planning.plannedByCategory
              ? Object.fromEntries(
                  Object.entries(planning.plannedByCategory).map(
                    ([key, value]) => [key, String(value)],
                  ),
                )
              : {},
          );
          setBills(planning.bills || []);
          setExpectedIncomes(planning.expectedIncomes || []);
          setExpectedExpenses(planning.expectedExpenses || []);
          return;
        }

        // monthlyIncome removed from UI
        setNotes("");
        setPlannedByCategory({});
        setBills([]);
        setExpectedIncomes([]);
        setExpectedExpenses([]);
      } catch (error) {
        console.warn("Erro ao carregar planning do cliente", error);
      }
    }

    loadPlanning();
  }, [selectedClient]);

  const totals = useMemo(() => {
    const sum = (items?: Array<{ amount?: number }>) =>
      (items || []).reduce(
        (total, item) => total + (Number(item?.amount) || 0),
        0,
      );

    const totalBills = sum(bills);
    const totalExpectedExpenses = sum(expectedExpenses);
    const totalExpectedIncomes = sum(expectedIncomes);
    // sum plannedByCategory values (they are stored as strings in UI)
    const totalByCategory = Object.values(plannedByCategory || {}).reduce(
      (sumCat, v) => {
        const n = parseFloat(
          String(v)
            .replace(/[^0-9.,]/g, "")
            .replace(",", "."),
        );
        return sumCat + (Number.isNaN(n) ? 0 : n);
      },
      0,
    );
    const totalSpending = totalBills + totalExpectedExpenses + totalByCategory;
    const expectedSavings = totalExpectedIncomes - totalSpending;

    return {
      totalBills,
      totalExpectedExpenses,
      totalExpectedIncomes,
      totalSpending,
      expectedSavings,
    };
  }, [bills, expectedExpenses, expectedIncomes]);

  const handleSave = async () => {
    if (!user || !selectedClient) {
      Alert.alert("Erro", "Cliente não disponível para salvar o planejamento");
      return;
    }
    try {
      setSaving(true);

      const payload: any = {
        consultantId: user.id,
        notes,
      };

      if (Object.keys(plannedByCategory).length > 0) {
        payload.plannedByCategory = Object.fromEntries(
          Object.entries(plannedByCategory).map(([key, value]) => {
            const parsed = parseFloat(
              value.replace(/[^0-9.,]/g, "").replace(",", "."),
            );

            return [key, Number.isNaN(parsed) ? 0 : parsed];
          }),
        );
      }

      await planningServices.savePlanning(user.id, selectedClient.id, payload);

      const refreshedPlanning = await planningServices.getPlanning(
        selectedClient.id,
      );
      setBills(refreshedPlanning?.bills || []);
      setExpectedIncomes(refreshedPlanning?.expectedIncomes || []);
      setExpectedExpenses(refreshedPlanning?.expectedExpenses || []);

      Alert.alert("Sucesso", "Planejamento salvo para o cliente");
    } catch (error) {
      console.error("Erro ao salvar planejamento:", error);
      Alert.alert("Erro", "Não foi possível salvar o planejamento");
    } finally {
      setSaving(false);
    }
  };

  const handleAddBill = async () => {
    if (!user || !selectedClient || !newBillName || !newBillAmount) return;

    try {
      setAddingBill(true);

      const amount =
        parseFloat(newBillAmount.replace(/[^0-9.,]/g, "").replace(",", ".")) ||
        0;

      const created = await planningServices.addBill(
        user.id,
        selectedClient.id,
        {
          name: newBillName,
          amount,
        } as Bill,
      );

      setBills((current) => [...current, created]);
      setNewBillName("");
      setNewBillAmount("");
    } catch (error) {
      console.error("Erro ao adicionar bill:", error);
      Alert.alert("Erro", "Não foi possível adicionar conta");
    } finally {
      setAddingBill(false);
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!user || !selectedClient) return;

    try {
      await planningServices.deleteBill(user.id, selectedClient.id, id);
      setBills((current) => current.filter((bill) => bill.id !== id));
    } catch (error) {
      console.error("Erro ao deletar bill:", error);
      Alert.alert("Erro", "Não foi possível remover conta");
    }
  };

  // ----- Modal handlers (usar modal semelhante ao fluxo de Contas) -----
  const resetBillForm = () => {
    setBillTitle("");
    setBillDescription("");
    setBillAmount("");
    setBillDueDate("");
  };

  const handleCreateBillModal = async () => {
    if (!user || !selectedClient || !billTitle || !billAmount) return;
    try {
      setSavingBill(true);

      // tentar extrair dia do vencimento DD/MM/YYYY
      let dueDay: number | undefined = undefined;
      if (billDueDate) {
        const parts = billDueDate.replace(/[^0-9]/g, "").padEnd(8, "0");
        const day = parseInt(parts.substring(0, 2));
        if (!Number.isNaN(day) && day >= 1 && day <= 31) dueDay = day;
      }

      const amount =
        parseFloat(billAmount.replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;

      const created = await planningServices.addBill(
        user.id,
        selectedClient.id,
        {
          name: billTitle,
          amount,
          dueDay,
          notes: billDescription,
        } as any,
      );

      setBills((c) => [...c, created]);
      setIsBillModalVisible(false);
      resetBillForm();
    } catch (error) {
      console.error("Erro ao criar conta via modal:", error);
      Alert.alert("Erro", "Não foi possível criar a conta");
    } finally {
      setSavingBill(false);
    }
  };

  const handleCreateIncomeModal = async () => {
    if (!user || !selectedClient || !incomeSource || !incomeAmount) return;
    try {
      setSavingIncome(true);
      const amount =
        parseFloat(incomeAmount.replace(/[^0-9.,]/g, "").replace(",", ".")) ||
        0;

      const created = await planningServices.addExpectedIncome(
        user.id,
        selectedClient.id,
        {
          source: incomeSource,
          amount,
          expectedMonth: incomeMonth || undefined,
          notes: undefined,
        } as any,
      );

      setExpectedIncomes((c) => [...c, created]);
      setIsIncomeModalVisible(false);
      setIncomeSource("");
      setIncomeAmount("");
      setIncomeMonth("");
    } catch (error) {
      console.error("Erro ao criar renda via modal:", error);
      Alert.alert("Erro", "Não foi possível criar a renda esperada");
    } finally {
      setSavingIncome(false);
    }
  };

  const handleDeleteExpectedIncome = async (id: string) => {
    if (!user || !selectedClient) return;
    try {
      await planningServices.deleteExpectedIncome(
        user.id,
        selectedClient.id,
        id,
      );
      setExpectedIncomes((c) => c.filter((i) => i.id !== id));
    } catch (error) {
      console.error("Erro ao deletar renda esperada:", error);
      Alert.alert("Erro", "Não foi possível remover a renda esperada");
    }
  };

  if (loading) {
    return (
      <Layout
        title="Planejamento do Cliente"
        showBackButton={true}
        showSidebar={true}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
        </View>
      </Layout>
    );
  }

  if (!selectedClient) {
    return (
      <Layout
        title="Planejamento do Cliente"
        showBackButton={true}
        showSidebar={true}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Nenhum cliente disponível</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Planejamento do Cliente"
      showBackButton={true}
      showSidebar={true}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "gastos" && styles.tabActive]}
            onPress={() => setActiveTab("gastos")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "gastos" && styles.tabTextActive,
              ]}
            >
              Gastos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "rendas" && styles.tabActive]}
            onPress={() => setActiveTab("rendas")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "rendas" && styles.tabTextActive,
              ]}
            >
              Rendas
            </Text>
          </TouchableOpacity>
        </View>

        {/* categoriesSection moved into Gastos tab */}

        {activeTab === "gastos" && (
          <View style={styles.tabPanel}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Gastos esperados</Text>
              <Text style={styles.highlightValue}>
                {formatCurrency(totals.totalSpending)}
              </Text>
            </View>

            <View style={styles.categoriesSection}>
              <Text style={styles.label}>Valores por categoria (despesa)</Text>
              {getCategoriesByType("expense").map((cat) => (
                <View key={cat.name} style={styles.categoryRow}>
                  <Text style={styles.categoryLabel}>{cat.name}</Text>
                  <TextInput
                    style={styles.categoryInput}
                    placeholder="0,00"
                    placeholderTextColor="#777"
                    keyboardType="numeric"
                    value={plannedByCategory[cat.name] ?? ""}
                    onChangeText={(value) =>
                      setPlannedByCategory((current) => ({
                        ...current,
                        [cat.name]: value,
                      }))
                    }
                  />
                </View>
              ))}
            </View>

            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setIsBillModalVisible(true)}
              >
                <Text style={styles.saveButtonText}>Cadastrar Conta</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Contas / Despesas fixas</Text>
            {bills.length === 0 ? (
              <Text style={styles.emptyListText}>Nenhuma conta adicionada</Text>
            ) : (
              bills.map((bill) => (
                <View
                  key={bill.id}
                  style={[
                    styles.billCard,
                    { backgroundColor: "#0f0f11", borderColor: "#222" },
                  ]}
                >
                  <View style={styles.billHeader}>
                    <View style={styles.billInfo}>
                      <Text style={styles.billTitle}>{bill.name}</Text>
                      {bill.notes ? (
                        <Text style={styles.billDescription}>{bill.notes}</Text>
                      ) : null}
                    </View>
                    <View>
                      <Text style={styles.billAmount}>
                        {formatCurrency(Number(bill.amount) || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ff6666" },
                      ]}
                      onPress={() => handleDeleteBill(bill.id!)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {expectedExpenses.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.label}>Gastos esperados</Text>
                {expectedExpenses.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {item.source || "Outros"}
                    </Text>
                    <Text style={styles.itemAmount}>
                      {formatCurrency(Number(item.amount) || 0)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Comentário</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações sobre gastos..."
              placeholderTextColor="#777"
              multiline
            />
          </View>
        )}

        {activeTab === "rendas" && (
          <View style={styles.tabPanel}>
            <View style={styles.highlightCard}>
              <Text style={styles.highlightLabel}>Rendas esperadas</Text>
              <Text style={styles.highlightValue}>
                {formatCurrency(totals.totalExpectedIncomes)}
              </Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => setIsIncomeModalVisible(true)}
              >
                <Text style={styles.saveButtonText}>Cadastrar Renda</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Rendas esperadas</Text>
            {expectedIncomes.length === 0 ? (
              <Text style={styles.emptyListText}>
                Nenhuma renda esperada cadastrada
              </Text>
            ) : (
              expectedIncomes.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.billCard,
                    { backgroundColor: "#0f0f11", borderColor: "#222" },
                  ]}
                >
                  <View style={styles.billHeader}>
                    <View style={styles.billInfo}>
                      <Text style={styles.billTitle}>
                        {item.source || "Outros"}
                      </Text>
                      {item.notes ? (
                        <Text style={styles.billDescription}>{item.notes}</Text>
                      ) : null}
                    </View>
                    <View>
                      <Text style={styles.billAmount}>
                        {formatCurrency(Number(item.amount) || 0)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.billActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ff6666" },
                      ]}
                      onPress={() => handleDeleteExpectedIncome(item.id!)}
                    >
                      <Ionicons name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            <Text style={[styles.label, { marginTop: 12 }]}>Comentário</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Observações sobre rendas..."
              placeholderTextColor="#777"
              multiline
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.primarySaveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Salvando..." : "Salvar Planejamento"}
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Modal Adicionar Conta (reaproveita padrão da tela de Contas) */}
      <Modal
        visible={isBillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsBillModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsBillModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { backgroundColor: "#0a0a0a" }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle]}>Nova Conta</Text>
                  <TouchableOpacity
                    onPress={() => setIsBillModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Título *</Text>
                    <TextInput
                      style={styles.input}
                      value={billTitle}
                      onChangeText={setBillTitle}
                      placeholder="Ex: Conta de Luz"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Descrição</Text>
                    <TextInput
                      style={styles.input}
                      value={billDescription}
                      onChangeText={setBillDescription}
                      placeholder="Detalhes opcionais"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Valor *</Text>
                    <TextInput
                      style={styles.input}
                      value={billAmount}
                      onChangeText={setBillAmount}
                      placeholder="Ex: 150.00"
                      placeholderTextColor="#777"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data de Vencimento</Text>
                    <TextInput
                      style={styles.input}
                      value={billDueDate}
                      onChangeText={setBillDueDate}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor="#777"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, { marginTop: 8 }]}
                    onPress={handleCreateBillModal}
                    disabled={savingBill}
                  >
                    {savingBill ? (
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

      {/* Modal Adicionar Renda */}
      <Modal
        visible={isIncomeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsIncomeModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsIncomeModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { backgroundColor: "#0a0a0a" }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle]}>Nova Renda</Text>
                  <TouchableOpacity
                    onPress={() => setIsIncomeModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Fonte *</Text>
                    <TextInput
                      style={styles.input}
                      value={incomeSource}
                      onChangeText={setIncomeSource}
                      placeholder="Ex: Salário"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Valor *</Text>
                    <TextInput
                      style={styles.input}
                      value={incomeAmount}
                      onChangeText={setIncomeAmount}
                      placeholder="Ex: 2000.00"
                      placeholderTextColor="#777"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Mês esperado (YYYY-MM)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={incomeMonth}
                      onChangeText={setIncomeMonth}
                      placeholder="2026-03"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.saveButton, { marginTop: 8 }]}
                    onPress={handleCreateIncomeModal}
                    disabled={savingIncome}
                  >
                    {savingIncome ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Cadastrar Renda</Text>
                    )}
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.fixedSummary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Rendas esperadas</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totals.totalExpectedIncomes)}
            </Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Gastos esperados</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(totals.totalSpending)}
            </Text>
          </View>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Poupança esperada</Text>
            <Text
              style={[
                styles.summaryValue,
                totals.expectedSavings >= 0
                  ? styles.positiveValue
                  : styles.negativeValue,
              ]}
            >
              {formatCurrency(totals.expectedSavings)}
            </Text>
          </View>
        </View>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#ccc",
  },
  tabsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#0d0d0d",
  },
  tabActive: {
    backgroundColor: "#8c52ff",
  },
  tabText: {
    color: "#bbb",
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#fff",
  },
  label: {
    color: "#fff",
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  notesInput: {
    height: 120,
  },
  categoriesSection: {
    marginTop: 12,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryLabel: {
    color: "#fff",
    flex: 1,
    marginRight: 8,
  },
  categoryInput: {
    width: 120,
    backgroundColor: "#0a0a0a",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
  },
  tabPanel: {
    marginTop: 16,
  },
  highlightCard: {
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#8c52ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  highlightLabel: {
    color: "#b89aff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  highlightValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  sectionBlock: {
    marginTop: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  itemName: {
    color: "#fff",
    flex: 1,
    marginRight: 12,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemAmount: {
    color: "#ccc",
    fontWeight: "600",
  },
  removeText: {
    color: "#ff6666",
    marginLeft: 12,
  },
  emptyListText: {
    color: "#999",
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  billCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  billInfo: {
    flex: 1,
    marginRight: 12,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#fff",
  },
  billDescription: {
    fontSize: 14,
    color: "#ccc",
  },
  billActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  billAmount: {
    color: "#ccc",
    fontWeight: "700",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "96%",
    maxWidth: 700,
    borderRadius: 16,
    padding: 20,
    maxHeight: "92%",
    minWidth: 320,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff",
  },
  billNameInput: {
    flex: 1,
    marginRight: 8,
    marginBottom: 0,
  },
  billAmountInput: {
    width: 110,
    marginBottom: 0,
  },
  saveButton: {
    backgroundColor: "#8c52ff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  primarySaveButton: {
    backgroundColor: "#8c52ff",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 140,
  },
  fixedSummary: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryBlock: {
    flex: 1,
    marginRight: 8,
  },
  summaryLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  positiveValue: {
    color: "#4caf50",
  },
  negativeValue: {
    color: "#ff6666",
  },
});

export default ClientPlanningScreen;
