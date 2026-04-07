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
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { userService } from "../../services/userServices";
import type {
  Bill,
  ExpectedItem,
  ConsumptionCategoryRelease,
} from "../../types/planning";
import { formatCurrency } from "../../utils/currencyUtils";
import { CurrencyInput } from "../../components/CurrencyInput";
import { DEFAULT_EXPENSE_CATEGORIES } from "../../types/category";

export const ClientPlanningScreen = () => {
  const { user } = useAuth();
  const { navigate, params } = useNavigation();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const expenseModalMaxHeight = Math.min(
    isWeb ? 760 : 840,
    Math.floor(windowHeight * (isWeb ? 0.82 : 0.86)),
  );
  const expenseModalScrollMaxHeight = Math.max(
    260,
    expenseModalMaxHeight - 250,
  );
  const categoryReleaseModalMaxHeight = Math.min(
    isWeb ? 620 : 720,
    Math.floor(windowHeight * (isWeb ? 0.72 : 0.82)),
  );
  const categoryReleaseModalScrollMaxHeight = Math.max(
    260,
    categoryReleaseModalMaxHeight - 170,
  );
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
  const [billAmountCard, setBillAmountCard] = useState(0);
  const [billAmountCash, setBillAmountCash] = useState(0);
  const [billDueDate, setBillDueDate] = useState("");
  const [billPaymentMethod, setBillPaymentMethod] = useState<"card" | "cash">(
    "cash",
  );
  const [savingBill, setSavingBill] = useState(false);

  const [isIncomeModalVisible, setIsIncomeModalVisible] = useState(false);
  const [incomeSource, setIncomeSource] = useState("");
  const [incomeAmountNumber, setIncomeAmountNumber] = useState<number | null>(
    null,
  );
  const [incomeMonth, setIncomeMonth] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);
  const [activeTab, setActiveTab] = useState<"gastos" | "rendas">("rendas");

  // Expense modal state (gastos gerais)
  const [isExpenseModalVisible, setIsExpenseModalVisible] = useState(false);
  const [expenseSource, setExpenseSource] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseAmountCard, setExpenseAmountCard] = useState(0);
  const [expenseAmountCash, setExpenseAmountCash] = useState(0);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseIsBill, setExpenseIsBill] = useState(false); // if true, create/update a Bill instead
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "income" | "expense" | "bill";
    id: string;
    label: string;
    amount: number;
  } | null>(null);

  // Consumo moderado state + modal
  const [isConsumoModalVisible, setIsConsumoModalVisible] = useState(false);
  const [consumoModeradoValue, setConsumoModeradoValue] = useState<string>("");
  const [consumoModeradoAmountCard, setConsumoModeradoAmountCard] = useState(0);
  const [consumoModeradoAmountCash, setConsumoModeradoAmountCash] = useState(0);
  const [categoryReleases, setCategoryReleases] = useState<
    Record<string, ConsumptionCategoryRelease>
  >({});
  const [isCategoryReleaseModalVisible, setIsCategoryReleaseModalVisible] =
    useState(false);
  const [releaseCategoryName, setReleaseCategoryName] = useState<string>(
    DEFAULT_EXPENSE_CATEGORIES[0]?.name || "Alimentação",
  );
  const [releaseMonthlyLimitValue, setReleaseMonthlyLimitValue] = useState(0);
  const [editingReleaseCategory, setEditingReleaseCategory] = useState<
    string | null
  >(null);
  const [savingReleaseCategory, setSavingReleaseCategory] = useState(false);
  const [savingConsumo, setSavingConsumo] = useState(false);
  const [consumptionCycleLabel, setConsumptionCycleLabel] =
    useState<string>("");
  const [consumptionCycleStatus, setConsumptionCycleStatus] = useState<
    "active" | "closed" | ""
  >("");
  const [consumptionCycleLoading, setConsumptionCycleLoading] = useState(false);
  const [isCycleDurationModalVisible, setIsCycleDurationModalVisible] =
    useState(false);
  const [cycleDurationInput, setCycleDurationInput] = useState<string>("");
  const [cycleDurationAction, setCycleDurationAction] = useState<
    "restart" | "edit"
  >("restart");
  const [
    consumoModeradoCycleDurationDays,
    setConsumoModeradoCycleDurationDays,
  ] = useState<number>(0);

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
          // se o usuário atual for consultor, somente permitir clientes atribuídos
          if (
            user &&
            user.role === "consultor" &&
            (currentClient as any).consultantId !== user.id
          ) {
            Alert.alert(
              "Acesso negado",
              "Você não tem permissão para acessar este cliente.",
            );
            navigate("ClientList");
            return;
          }
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
          const rootCard = Number(planning.consumoModeradoCard || 0);
          const rootCash = Number(planning.consumoModeradoCash || 0);
          if (rootCard !== 0 || rootCash !== 0) {
            setConsumoModeradoAmountCard(rootCard);
            setConsumoModeradoAmountCash(rootCash);
            setConsumoModeradoValue(formatCurrencyValue(rootCard + rootCash));
          } else {
            setConsumoModeradoAmountCard(0);
            setConsumoModeradoAmountCash(
              planning.consumoModerado !== undefined &&
                planning.consumoModerado !== null
                ? Number(planning.consumoModerado)
                : 0,
            );
            setConsumoModeradoValue(
              planning.consumoModerado !== undefined &&
                planning.consumoModerado !== null
                ? formatCurrencyValue(Number(planning.consumoModerado))
                : "",
            );
          }
          setIncomeAmountNumber(null);
          setConsumptionCycleLabel(getPlanningCycleLabel(planning) || "");
          setConsumptionCycleStatus(planning.consumoModeradoCycleStatus || "");
          setConsumoModeradoCycleDurationDays(
            planning.consumoModeradoCycleDurationDays || 0,
          );
          setCategoryReleases(planning.categoryReleases || {});
          return;
        }

        // monthlyIncome removed from UI
        setNotes("");
        setPlannedByCategory({});
        setBills([]);
        setExpectedIncomes([]);
        setExpectedExpenses([]);
        setConsumoModeradoAmountCard(0);
        setConsumoModeradoAmountCash(0);
        setConsumoModeradoValue("");
        setIncomeAmountNumber(null);
        setConsumptionCycleLabel("");
        setConsumptionCycleStatus("");
        setConsumoModeradoCycleDurationDays(0);
        setCategoryReleases({});
      } catch (error) {
        console.warn("Erro ao carregar planning do cliente", error);
      }
    }

    loadPlanning();
  }, [selectedClient]);

  const isCardPayment = (raw?: any) => {
    const pm = String(raw || "").toLowerCase();
    return /card|cart|cartão|credit|debit|cr[eé]dito|d[eé]bito/.test(pm);
  };

  const formatPaymentMethodLabel = (raw?: any) => {
    if (isCardPayment(raw)) return "Cartão";
    if (
      String(raw || "")
        .toLowerCase()
        .includes("split")
    ) {
      return "Cartão + Dinheiro/Pix";
    }
    return "Dinheiro / Pix";
  };

  const resolveSplitAmounts = (item: {
    amount?: number;
    amountCard?: number;
    amountCash?: number;
    paymentMethod?: string;
  }) => {
    const total = Number(item?.amount) || 0;
    const hasExplicitSplit =
      item?.amountCard !== undefined || item?.amountCash !== undefined;
    const explicitCard = Number(item?.amountCard);
    const explicitCash = Number(item?.amountCash);

    if (hasExplicitSplit) {
      const card = Number.isFinite(explicitCard) ? explicitCard : 0;
      const cash = Number.isFinite(explicitCash)
        ? explicitCash
        : Math.max(0, total - card);
      return {
        total: card + cash,
        card,
        cash,
      };
    }

    if (isCardPayment(item?.paymentMethod)) {
      return { total, card: total, cash: 0 };
    }

    return { total, card: 0, cash: total };
  };

  const resolvePlanningConsumptionSplit = () => {
    const total = Number(consumoModeradoValue || 0) || 0;
    const hasExplicitSplit =
      consumoModeradoAmountCard !== 0 || consumoModeradoAmountCash !== 0;

    if (hasExplicitSplit) {
      return {
        total: consumoModeradoAmountCard + consumoModeradoAmountCash,
        card: consumoModeradoAmountCard,
        cash: consumoModeradoAmountCash,
      };
    }

    return { total, card: 0, cash: total };
  };

  const formatCurrencyInput = (value: string) => {
    const raw = String(value || "");
    if (!raw) return "";

    // If the user typed a decimal separator, try to parse it as a decimal number
    if (/[.,]/.test(raw)) {
      let normalized = raw.replace(/[^0-9.,]/g, "");
      const hasComma = normalized.includes(",");
      const hasDot = normalized.includes(".");

      if (hasComma && hasDot) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      } else if (hasComma) {
        normalized = normalized.replace(/\./g, "").replace(",", ".");
      }

      const parsed = parseFloat(normalized);
      if (Number.isNaN(parsed)) return "";
      return parsed.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }

    // No decimal separator: treat input as whole units (e.g. "4500" => 4500.00)
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    const numericValue = Number(digits);
    return numericValue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrencyInput = (value: string) => {
    const raw = String(value || "").trim();
    if (!raw) return 0;

    const cleaned = raw.replace(/[^0-9.,-]/g, "");
    if (!cleaned) return 0;

    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    const decimalSeparatorIndex = Math.max(lastComma, lastDot);

    let normalized = cleaned.replace(/-/g, "");

    if (decimalSeparatorIndex === -1) {
      normalized = normalized.replace(/\D/g, "");
    } else {
      const integerPart = normalized
        .slice(0, decimalSeparatorIndex)
        .replace(/\D/g, "");
      const fractionPart = normalized
        .slice(decimalSeparatorIndex + 1)
        .replace(/\D/g, "");

      if (
        fractionPart.length === 3 &&
        ((lastComma === -1 && lastDot !== -1) ||
          (lastDot === -1 && lastComma !== -1))
      ) {
        normalized = `${integerPart}${fractionPart}`;
      } else if (fractionPart.length === 0) {
        normalized = integerPart;
      } else {
        normalized = `${integerPart}.${fractionPart}`;
      }
    }

    const parsed = parseFloat(normalized);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const formatCurrencyValue = (value: number) => {
    if (!Number.isFinite(value)) return "";
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totals = useMemo(() => {
    const sum = (items?: Array<{ amount?: number }>) =>
      (items || []).reduce(
        (total, item) => total + (Number(item?.amount) || 0),
        0,
      );

    const billBreakdown = (bills || []).map((bill) =>
      resolveSplitAmounts(bill as any),
    );
    const expectedExpenseBreakdown = (expectedExpenses || []).map((item) =>
      resolveSplitAmounts(item as any),
    );
    const consumptionBreakdown = resolvePlanningConsumptionSplit();

    const totalCardExpenses =
      billBreakdown.reduce((total, item) => total + item.card, 0) +
      expectedExpenseBreakdown.reduce((total, item) => total + item.card, 0) +
      consumptionBreakdown.card;

    const totalCashExpenses =
      billBreakdown.reduce((total, item) => total + item.cash, 0) +
      expectedExpenseBreakdown.reduce((total, item) => total + item.cash, 0) +
      consumptionBreakdown.cash +
      Object.values(plannedByCategory || {}).reduce((sumCat, v) => {
        const n = parseCurrencyInput(String(v));
        return sumCat + (Number.isNaN(n) ? 0 : n);
      }, 0);

    const totalConsumoModerado = consumptionBreakdown.total;
    const totalExpectedIncomes = sum(expectedIncomes);
    const totalSpending = totalCashExpenses;
    const expectedSavings = totalExpectedIncomes - totalCashExpenses;

    return {
      totalCardExpenses,
      totalCashExpenses,
      totalConsumoModerado,
      totalExpectedIncomes,
      totalSpending,
      expectedSavings,
    };
  }, [
    bills,
    expectedExpenses,
    expectedIncomes,
    plannedByCategory,
    consumoModeradoValue,
    consumoModeradoAmountCard,
    consumoModeradoAmountCash,
  ]);

  const activeCategoryReleases = useMemo(
    () =>
      Object.values(categoryReleases || {})
        .filter((release) => release.status === "active")
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "pt-BR")),
    [categoryReleases],
  );

  const openCreateReleaseModal = () => {
    setEditingReleaseCategory(null);
    setReleaseCategoryName(
      DEFAULT_EXPENSE_CATEGORIES[0]?.name || "Alimentação",
    );
    setReleaseMonthlyLimitValue(0);
    setIsCategoryReleaseModalVisible(true);
  };

  const openEditReleaseModal = (release: ConsumptionCategoryRelease) => {
    setEditingReleaseCategory(release.categoryName);
    setReleaseCategoryName(release.categoryName);
    setReleaseMonthlyLimitValue(Number(release.monthlyLimit || 0));
    setIsCategoryReleaseModalVisible(true);
  };

  const handleSaveCategoryRelease = async () => {
    if (!user || !selectedClient) return;

    const monthlyLimit = Number(releaseMonthlyLimitValue) || 0;
    if (monthlyLimit <= 0) {
      Alert.alert("Erro", "Informe um limite mensal maior que zero.");
      return;
    }

    const durationDays = consumoModeradoCycleDurationDays || 30;
    const dailyLimit = monthlyLimit / durationDays;

    try {
      setSavingReleaseCategory(true);
      const updatedPlanning = await planningServices.upsertCategoryRelease(
        user.id,
        selectedClient.id,
        {
          categoryName: releaseCategoryName,
          monthlyLimit,
          dailyLimit,
        },
      );

      setCategoryReleases(updatedPlanning?.categoryReleases || {});
      setIsCategoryReleaseModalVisible(false);
      setEditingReleaseCategory(null);
      setReleaseMonthlyLimitValue(0);
    } catch (error) {
      console.error("Erro ao salvar liberação de categoria:", error);
      Alert.alert("Erro", "Não foi possível salvar a categoria liberada.");
    } finally {
      setSavingReleaseCategory(false);
    }
  };

  const handleDeactivateCategoryRelease = async (categoryName: string) => {
    if (!user || !selectedClient) return;
    try {
      const updatedPlanning = await planningServices.deactivateCategoryRelease(
        user.id,
        selectedClient.id,
        categoryName,
      );
      setCategoryReleases(updatedPlanning?.categoryReleases || {});
    } catch (error) {
      console.error("Erro ao desativar categoria liberada:", error);
      Alert.alert("Erro", "Não foi possível desativar a categoria.");
    }
  };

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
            const parsed = parseCurrencyInput(value);

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

      const amount = parseCurrencyInput(newBillAmount);

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
    setBillAmountCard(0);
    setBillAmountCash(0);
    setBillDueDate("");
    setBillPaymentMethod("cash");
  };

  const handleCreateBillModal = async () => {
    if (!user || !selectedClient || !billTitle) return;
    try {
      setSavingBill(true);

      // tentar extrair dia do vencimento DD/MM/YYYY
      let dueDay: number | undefined = undefined;
      if (billDueDate) {
        const parts = billDueDate.replace(/[^0-9]/g, "").padEnd(8, "0");
        const day = parseInt(parts.substring(0, 2));
        if (!Number.isNaN(day) && day >= 1 && day <= 31) dueDay = day;
      }

      const amountCard = Number(billAmountCard) || 0;
      const amountCash = Number(billAmountCash) || 0;
      const amount = amountCard + amountCash;
      const paymentMethod =
        amountCard > 0 && amountCash > 0
          ? "split"
          : amountCard > 0
            ? "card"
            : "cash";

      if (editingBillId) {
        const updated = await planningServices.updateBill(
          user.id,
          selectedClient.id,
          editingBillId,
          {
            name: billTitle,
            amount,
            amountCard,
            amountCash,
            dueDay,
            notes: billDescription,
            paymentMethod,
          } as any,
        );
        if (updated) {
          setBills((c) => c.map((b) => (b.id === updated.id ? updated : b)));
        }
        setEditingBillId(null);
      } else {
        const created = await planningServices.addBill(
          user.id,
          selectedClient.id,
          {
            name: billTitle,
            amount,
            amountCard,
            amountCash,
            dueDay,
            notes: billDescription,
            paymentMethod,
          } as any,
        );
        setBills((c) => [...c, created]);
      }

      setIsBillModalVisible(false);
      resetBillForm();
    } catch (error) {
      console.error("Erro ao criar conta via modal:", error);
      Alert.alert("Erro", "Não foi possível criar a conta");
    } finally {
      setSavingBill(false);
    }
  };

  const handleBillAmountChange = (value: string) => {
    setBillAmount(formatCurrencyInput(value));
  };

  const handleExpenseAmountChange = (value: string) => {
    setExpenseAmount(formatCurrencyInput(value));
  };

  const handleConsumoAmountChange = (value: string) => {
    setConsumoModeradoValue(formatCurrencyInput(value));
  };

  const handleCreateIncomeModal = async () => {
    const amount = incomeAmountNumber || 0;
    if (!user || !selectedClient || !incomeSource || amount <= 0) return;
    try {
      setSavingIncome(true);

      if (editingIncomeId) {
        const updated = await planningServices.updateExpectedIncome(
          user.id,
          selectedClient.id,
          editingIncomeId,
          {
            source: incomeSource,
            amount,
            expectedMonth: incomeMonth || undefined,
            notes: undefined,
          } as any,
        );
        if (updated) {
          setExpectedIncomes((c) =>
            c.map((i) => (i.id === updated.id ? updated : i)),
          );
        }
        setEditingIncomeId(null);
      } else {
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
      }

      setIsIncomeModalVisible(false);
      setIncomeSource("");
      setIncomeAmountNumber(null);
      setIncomeMonth("");
    } catch (error) {
      console.error("Erro ao criar renda via modal:", error);
      Alert.alert("Erro", "Não foi possível criar a renda esperada");
    } finally {
      setSavingIncome(false);
    }
  };

  const handleCreateExpenseModal = async () => {
    if (!user || !selectedClient || !expenseSource) return;
    try {
      setSavingExpense(true);
      const amountCard = Number(expenseAmountCard) || 0;
      const amountCash = Number(expenseAmountCash) || 0;
      const amount = amountCard + amountCash;
      const paymentMethod =
        amountCard > 0 && amountCash > 0
          ? "split"
          : amountCard > 0
            ? "card"
            : "cash";

      if (expenseIsBill) {
        // create or update bill
        if (editingBillId) {
          const updated = await planningServices.updateBill(
            user.id,
            selectedClient.id,
            editingBillId,
            {
              name: expenseSource,
              amount,
              amountCard,
              amountCash,
              paymentMethod,
              notes: "",
            } as any,
          );
          if (updated) {
            setBills((c) => c.map((b) => (b.id === updated.id ? updated : b)));
          }
          setEditingBillId(null);
        } else {
          const created = await planningServices.addBill(
            user.id,
            selectedClient.id,
            {
              name: expenseSource,
              amount,
              amountCard,
              amountCash,
              paymentMethod,
              notes: "",
            } as any,
          );
          setBills((c) => [...c, created]);
        }
      } else {
        // expected expense (general)
        if (editingExpenseId) {
          const updated = await planningServices.updateExpectedExpense(
            user.id,
            selectedClient.id,
            editingExpenseId,
            {
              source: expenseSource,
              amount,
              amountCard,
              amountCash,
              expectedMonth: expenseDate || undefined,
              paymentMethod,
            } as any,
          );
          if (updated) {
            setExpectedExpenses((c) =>
              c.map((e) => (e.id === updated.id ? updated : e)),
            );
          }
          setEditingExpenseId(null);
        } else {
          const created = await planningServices.addExpectedExpense(
            user.id,
            selectedClient.id,
            {
              source: expenseSource,
              amount,
              amountCard,
              amountCash,
              expectedMonth: expenseDate || undefined,
              paymentMethod,
              notes: undefined,
            } as any,
          );
          setExpectedExpenses((c) => [...c, created]);
        }
      }

      setIsExpenseModalVisible(false);
      setExpenseSource("");
      setExpenseAmount("");
      setExpenseAmountCard(0);
      setExpenseAmountCash(0);
      setExpenseDate("");
      setExpenseIsBill(false);
      setEditingExpenseId(null);
      setEditingBillId(null);
    } catch (err) {
      console.error("Erro ao criar/atualizar gasto:", err);
      Alert.alert("Erro", "Não foi possível salvar o gasto");
    } finally {
      setSavingExpense(false);
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

  const handleDeleteExpectedExpense = async (id: string) => {
    if (!user || !selectedClient) return;
    try {
      await planningServices.deleteExpectedExpense(
        user.id,
        selectedClient.id,
        id,
      );
      setExpectedExpenses((c) => c.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Erro ao deletar gasto esperado:", error);
      Alert.alert("Erro", "Não foi possível remover o gasto");
    }
  };

  const handleOpenDeleteConfirm = (
    kind: "income" | "expense" | "bill",
    item: { id?: string; source?: string; name?: string; amount?: number },
  ) => {
    if (!item.id) return;
    setDeleteTarget({
      kind,
      id: item.id,
      label:
        item.source ||
        item.name ||
        (kind === "income"
          ? "Renda esperada"
          : kind === "bill"
            ? "Conta"
            : "Gasto esperado"),
      amount: Number(item.amount) || 0,
    });
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const target = deleteTarget;
    setDeleteConfirmVisible(false);
    setDeleteTarget(null);

    if (target.kind === "income") {
      await handleDeleteExpectedIncome(target.id);
      return;
    }

    if (target.kind === "bill") {
      await handleDeleteBill(target.id);
      return;
    }

    await handleDeleteExpectedExpense(target.id);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmVisible(false);
    setDeleteTarget(null);
  };

  const handleSaveConsumoModerado = async () => {
    if (!user || !selectedClient) return;
    try {
      setSavingConsumo(true);
      const amountCard = Number(consumoModeradoAmountCard) || 0;
      const amountCash = Number(consumoModeradoAmountCash) || 0;
      const value = amountCard + amountCash;

      await planningServices.updatePlanning(user.id, selectedClient.id, {
        consumoModerado: value,
        consumoModeradoCard: amountCard,
        consumoModeradoCash: amountCash,
      });

      setConsumoModeradoValue(formatCurrencyValue(value));
      setIsConsumoModalVisible(false);
    } catch (err) {
      console.error("Erro ao salvar consumo moderado:", err);
      Alert.alert("Erro", "Não foi possível salvar o consumo moderado");
    } finally {
      setSavingConsumo(false);
    }
  };

  const openCycleDurationModal = (action: "restart" | "edit") => {
    setCycleDurationAction(action);
    setCycleDurationInput(
      action === "edit" && consumoModeradoCycleDurationDays > 0
        ? String(consumoModeradoCycleDurationDays)
        : "",
    );
    setIsCycleDurationModalVisible(true);
  };

  const handleSaveCycleDuration = async () => {
    if (!user || !selectedClient) return;
    try {
      const durationDays = parseInt(cycleDurationInput, 10);
      if (isNaN(durationDays) || durationDays <= 0) {
        Alert.alert("Erro", "Informe uma duração válida em dias");
        return;
      }
      setConsumptionCycleLoading(true);
      const updated =
        cycleDurationAction === "restart"
          ? await planningServices.restartConsumptionCycle(
              user.id,
              selectedClient.id,
              durationDays,
            )
          : await planningServices.updatePlanning(user.id, selectedClient.id, {
              consumoModeradoCycleDurationDays: durationDays,
            });
      setConsumptionCycleLabel(getPlanningCycleLabel(updated) || "");
      setConsumptionCycleStatus(updated?.consumoModeradoCycleStatus || "");
      setConsumoModeradoCycleDurationDays(
        updated?.consumoModeradoCycleDurationDays || 0,
      );
      setIsCycleDurationModalVisible(false);
      Alert.alert(
        "Sucesso",
        cycleDurationAction === "restart"
          ? "Ciclo renovado com sucesso"
          : "Duração do ciclo atual atualizada com sucesso",
      );
    } catch (error) {
      console.error("Erro ao reiniciar ciclo de consumo:", error);
      Alert.alert(
        "Erro",
        cycleDurationAction === "restart"
          ? "Não foi possível renovar o ciclo"
          : "Não foi possível atualizar a duração do ciclo",
      );
    } finally {
      setConsumptionCycleLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout
        title="Planejamento do Cliente"
        showBackButton={true}
        showSidebar={false}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Layout>
    );
  }

  if (!selectedClient) {
    return (
      <Layout
        title="Planejamento do Cliente"
        showBackButton={true}
        showSidebar={false}
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
      showSidebar={false}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.cycleCard}>
          <Text style={styles.cycleCardTitle}>Ciclo de Consumo Moderado</Text>
          <Text style={styles.cycleCardText}>
            {consumptionCycleLabel
              ? `Período atual: ${consumptionCycleLabel}`
              : "Nenhum ciclo iniciado ainda."}
          </Text>
          <Text style={styles.cycleCardText}>
            Status:{" "}
            {consumptionCycleStatus === "active"
              ? "Ativo"
              : consumptionCycleStatus === "closed"
                ? "Encerrado"
                : "Não iniciado"}
          </Text>
          {consumoModeradoCycleDurationDays > 0 && (
            <>
              <Text style={styles.cycleCardText}>
                Duração: {consumoModeradoCycleDurationDays} dias
              </Text>
              <Text style={styles.cycleCardText}>
                Meta diária:{" "}
                {formatCurrency(
                  (consumoModeradoAmountCard + consumoModeradoAmountCash) /
                    consumoModeradoCycleDurationDays,
                )}
              </Text>
            </>
          )}
          <View style={styles.cycleActionsRow}>
            <TouchableOpacity
              style={styles.cycleActionButton}
              onPress={() => openCycleDurationModal("restart")}
              disabled={consumptionCycleLoading}
            >
              {consumptionCycleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cycleActionText}>Reiniciar ciclo</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cycleActionButton}
              onPress={() => openCycleDurationModal("edit")}
              disabled={consumptionCycleLoading}
            >
              {consumptionCycleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.cycleActionText}>Editar duração</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
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
        </View>

        {activeTab === "gastos" && (
          <View style={styles.tabPanel}>
            <View style={{ marginBottom: 8 }}>
              <View style={styles.highlightCardFull}>
                <Text style={styles.highlightLabel}>Total Gastos</Text>
                <Text style={styles.highlightValue}>
                  {formatCurrency(totals.totalSpending)}
                </Text>
              </View>

              <View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
                <View style={[styles.highlightCardSmall, { flex: 1 }]}>
                  <Text style={styles.highlightLabelSmall}>
                    Gastos no Cartão
                  </Text>
                  <Text style={styles.highlightValueSmall}>
                    {formatCurrency(totals.totalCardExpenses)}
                  </Text>
                </View>
                <View style={[styles.highlightCardSmall, { flex: 1 }]}>
                  <Text style={styles.highlightLabelSmall}>
                    Consumo Moderado
                  </Text>
                  <Text style={styles.highlightValueSmall}>
                    {formatCurrency(totals.totalConsumoModerado)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => setIsConsumoModalVisible(true)}
                >
                  <Text style={styles.saveButtonText}>Consumo moderado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => {
                    setExpenseSource("");
                    setExpenseAmount("");
                    setExpenseDate("");
                    setExpenseIsBill(false);
                    setEditingExpenseId(null);
                    setEditingBillId(null);
                    setIsExpenseModalVisible(true);
                  }}
                >
                  <Text style={styles.saveButtonText}>Cadastrar Gasto</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sectionBlock}>
              <View style={styles.releaseSectionHeader}>
                <Text style={styles.label}>Categorias liberadas</Text>
                <TouchableOpacity
                  style={styles.addReleaseButton}
                  onPress={openCreateReleaseModal}
                >
                  <Text style={styles.addReleaseButtonText}>
                    Liberar categoria
                  </Text>
                </TouchableOpacity>
              </View>

              {activeCategoryReleases.length === 0 ? (
                <Text style={styles.emptyListText}>
                  Nenhuma categoria liberada para Consumo Moderado.
                </Text>
              ) : (
                activeCategoryReleases.map((release) => (
                  <View key={release.categoryName} style={styles.releaseCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.releaseTitle}>
                        {release.categoryName}
                      </Text>
                      <Text style={styles.releaseMeta}>
                        Limite mensal: {formatCurrency(release.monthlyLimit)}
                      </Text>
                      <Text style={styles.releaseMeta}>
                        Meta diária: {formatCurrency(release.dailyLimit)}
                      </Text>
                    </View>

                    <View style={styles.releaseActions}>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: "#8c52ff" },
                        ]}
                        onPress={() => openEditReleaseModal(release)}
                      >
                        <Ionicons name="pencil" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: "#ff6666" },
                        ]}
                        onPress={() =>
                          handleDeactivateCategoryRelease(release.categoryName)
                        }
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
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
                      <Text style={{ color: "#ccc", marginTop: 6 }}>
                        Método: {formatPaymentMethodLabel(bill.paymentMethod)}
                      </Text>
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
                        { backgroundColor: "#8c52ff" },
                      ]}
                      onPress={() => {
                        // edit bill
                        setBillTitle(bill.name || "");
                        setBillDescription(bill.notes || "");
                        const split = resolveSplitAmounts(bill as any);
                        setBillAmount(formatCurrencyValue(split.total));
                        setBillAmountCard(split.card);
                        setBillAmountCash(split.cash);
                        setBillPaymentMethod(
                          split.card > 0 && split.cash > 0
                            ? ("cash" as any)
                            : isCardPayment(bill.paymentMethod)
                              ? "card"
                              : "cash",
                        );
                        setBillDueDate(
                          bill.dueDate
                            ? (bill.dueDate as any).toLocaleDateString("pt-BR")
                            : bill.dueDay
                              ? String(bill.dueDay)
                              : "",
                        );
                        setEditingBillId(bill.id || null);
                        setIsBillModalVisible(true);
                      }}
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ff6666" },
                      ]}
                      onPress={() =>
                        handleOpenDeleteConfirm("bill", {
                          id: bill.id,
                          name: bill.name,
                          amount: bill.amount,
                        })
                      }
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
                  <View
                    key={item.id}
                    style={[
                      styles.billCard,
                      { backgroundColor: "#0f0f11", borderColor: "#222" },
                    ]}
                  >
                    <View style={styles.billHeader}>
                      <View style={styles.billInfo}>
                        <Text style={styles.billTitle}>{item.source}</Text>
                        {item.notes ? (
                          <Text style={styles.billDescription}>
                            {item.notes}
                          </Text>
                        ) : null}
                        <Text style={{ color: "#ccc", marginTop: 6 }}>
                          Método: {formatPaymentMethodLabel(item.paymentMethod)}
                        </Text>
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
                          { backgroundColor: "#8c52ff" },
                        ]}
                        onPress={() => {
                          // edit expected expense
                          setExpenseSource(item.source || "");
                          const split = resolveSplitAmounts(item as any);
                          setExpenseAmount(formatCurrencyValue(split.total));
                          setExpenseAmountCard(split.card);
                          setExpenseAmountCash(split.cash);
                          setExpenseDate(item.expectedMonth || "");
                          setExpenseIsBill(false);
                          setEditingExpenseId(item.id || null);
                          setIsExpenseModalVisible(true);
                        }}
                      >
                        <Ionicons name="pencil" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          { backgroundColor: "#ff6666" },
                        ]}
                        onPress={() =>
                          handleOpenDeleteConfirm("expense", {
                            id: item.id,
                            source: item.source,
                            amount: item.amount,
                          })
                        }
                      >
                        <Ionicons name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
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
                        { backgroundColor: "#8c52ff" },
                      ]}
                      onPress={() => {
                        setIncomeSource(item.source || "");
                        setIncomeAmountNumber(Number(item.amount || 0));
                        setIncomeMonth(item.expectedMonth || "");
                        setEditingIncomeId(item.id || null);
                        setIsIncomeModalVisible(true);
                      }}
                    >
                      <Ionicons name="pencil" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#ff6666" },
                      ]}
                      onPress={() => handleOpenDeleteConfirm("income", item)}
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
                    <CurrencyInput
                      label="Cartão"
                      value={billAmountCard}
                      onChangeValue={setBillAmountCard}
                      placeholder="Ex: 150,00"
                      editable={!savingBill}
                      icon="card"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <CurrencyInput
                      label="Dinheiro / Pix"
                      value={billAmountCash}
                      onChangeValue={setBillAmountCash}
                      placeholder="Ex: 150,00"
                      editable={!savingBill}
                      icon="wallet"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Total calculado</Text>
                    <Text style={styles.totalPreviewText}>
                      {formatCurrency(billAmountCard + billAmountCash)}
                    </Text>
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

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Forma de pagamento</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.paymentChip,
                          billPaymentMethod === "cash" &&
                            styles.paymentChipActive,
                        ]}
                        onPress={() => setBillPaymentMethod("cash")}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            billPaymentMethod === "cash" &&
                              styles.paymentChipTextActive,
                          ]}
                        >
                          Dinheiro / Pix
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentChip,
                          billPaymentMethod === "card" &&
                            styles.paymentChipActive,
                        ]}
                        onPress={() => setBillPaymentMethod("card")}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            billPaymentMethod === "card" &&
                              styles.paymentChipTextActive,
                          ]}
                        >
                          Cartão
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 12 }]}
                  onPress={handleCreateBillModal}
                  disabled={savingBill}
                >
                  {savingBill ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Cadastrar Conta</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Adicionar Renda (consultor) */}
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
                  <Text style={[styles.modalTitle]}>
                    {editingIncomeId ? "Editar Renda" : "Cadastrar Renda"}
                  </Text>
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
                    <CurrencyInput
                      label="Valor *"
                      value={incomeAmountNumber || 0}
                      onChangeValue={setIncomeAmountNumber}
                      placeholder="Ex: 1.500,00"
                      editable={!savingIncome}
                      icon="cash"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Mês previsto (opcional)
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={incomeMonth}
                      onChangeText={setIncomeMonth}
                      placeholder="YYYY-MM ou MM/YYYY"
                      placeholderTextColor="#777"
                    />
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 12 }]}
                  onPress={handleCreateIncomeModal}
                  disabled={savingIncome}
                >
                  {savingIncome ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingIncomeId ? "Atualizar Renda" : "Cadastrar Renda"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Adicionar Gasto (geral) */}
      <Modal
        visible={isExpenseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsExpenseModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.expenseModalAvoidingView}
        >
          <TouchableOpacity
            style={styles.expenseModalOverlay}
            activeOpacity={1}
            onPress={() => setIsExpenseModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.modalContent,
                  styles.expenseModalContent,
                  { maxHeight: expenseModalMaxHeight },
                  { backgroundColor: "#0a0a0a" },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle]}>
                    {editingExpenseId ? "Editar Gasto" : "Cadastrar Gasto"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsExpenseModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={[
                    styles.expenseModalScroll,
                    { maxHeight: expenseModalScrollMaxHeight },
                  ]}
                  contentContainerStyle={styles.expenseModalScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Título *</Text>
                    <TextInput
                      style={styles.input}
                      value={expenseSource}
                      onChangeText={setExpenseSource}
                      placeholder="Ex: Mercado"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <CurrencyInput
                      label="Cartão"
                      value={expenseAmountCard}
                      onChangeValue={setExpenseAmountCard}
                      placeholder="Ex: 150,00"
                      editable={!savingExpense}
                      icon="card"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <CurrencyInput
                      label="Dinheiro / Pix"
                      value={expenseAmountCash}
                      onChangeValue={setExpenseAmountCash}
                      placeholder="Ex: 150,00"
                      editable={!savingExpense}
                      icon="wallet"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Total calculado</Text>
                    <Text style={styles.totalPreviewText}>
                      {formatCurrency(expenseAmountCard + expenseAmountCash)}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Data</Text>
                    <TextInput
                      style={styles.input}
                      value={expenseDate}
                      onChangeText={setExpenseDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#777"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.lastInputGroup]}>
                    <Text style={styles.inputLabel}>Tipo</Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.paymentChip,
                          expenseIsBill && styles.paymentChipActive,
                        ]}
                        onPress={() => setExpenseIsBill(true)}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            expenseIsBill && styles.paymentChipTextActive,
                          ]}
                        >
                          Conta / Fixo
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.paymentChip,
                          !expenseIsBill && styles.paymentChipActive,
                        ]}
                        onPress={() => setExpenseIsBill(false)}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            !expenseIsBill && styles.paymentChipTextActive,
                          ]}
                        >
                          Gasto geral
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 8 }]}
                  onPress={handleCreateExpenseModal}
                  disabled={savingExpense}
                >
                  {savingExpense ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingExpenseId ? "Atualizar Gasto" : "Salvar Gasto"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={isCategoryReleaseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCategoryReleaseModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsCategoryReleaseModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.modalContent,
                  styles.categoryReleaseModalContent,
                  {
                    backgroundColor: "#0a0a0a",
                    maxHeight: categoryReleaseModalMaxHeight,
                    width: isWeb ? "94%" : "84%",
                    maxWidth: isWeb ? 560 : 390,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingReleaseCategory
                      ? "Editar categoria liberada"
                      : "Liberar categoria"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsCategoryReleaseModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={[
                    styles.categoryReleaseModalScroll,
                    { maxHeight: categoryReleaseModalScrollMaxHeight },
                  ]}
                  contentContainerStyle={
                    styles.categoryReleaseModalScrollContent
                  }
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Categoria *</Text>
                    <View style={styles.categoryGrid}>
                      {DEFAULT_EXPENSE_CATEGORIES.map((category) => {
                        const isActive = releaseCategoryName === category.name;
                        return (
                          <TouchableOpacity
                            key={category.name}
                            style={[
                              styles.categoryChip,
                              isActive && styles.categoryChipActive,
                              editingReleaseCategory &&
                                editingReleaseCategory !== category.name &&
                                styles.categoryChipDisabled,
                            ]}
                            disabled={
                              !!editingReleaseCategory &&
                              editingReleaseCategory !== category.name
                            }
                            onPress={() =>
                              setReleaseCategoryName(category.name)
                            }
                          >
                            <Text
                              style={[
                                styles.categoryChipText,
                                isActive && styles.categoryChipTextActive,
                              ]}
                            >
                              {category.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <CurrencyInput
                      label="Limite mensal *"
                      value={releaseMonthlyLimitValue}
                      onChangeValue={setReleaseMonthlyLimitValue}
                      placeholder="Ex: 450,00"
                      editable={!savingReleaseCategory}
                      icon="wallet"
                    />
                    <Text style={styles.releaseHintText}>
                      A meta diária será calculada pela duração atual do ciclo.
                    </Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 12 }]}
                  onPress={handleSaveCategoryRelease}
                  disabled={savingReleaseCategory}
                >
                  {savingReleaseCategory ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {editingReleaseCategory
                        ? "Atualizar categoria"
                        : "Liberar categoria"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Consumo Moderado */}
      <Modal
        visible={isConsumoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsConsumoModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsConsumoModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { backgroundColor: "#0a0a0a" }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle]}>
                    Registrar Consumo Moderado
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsConsumoModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <CurrencyInput
                    label="Cartão"
                    value={consumoModeradoAmountCard}
                    onChangeValue={setConsumoModeradoAmountCard}
                    placeholder="Ex: 150,00"
                    editable={!savingConsumo}
                    icon="card"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <CurrencyInput
                    label="Dinheiro / Pix"
                    value={consumoModeradoAmountCash}
                    onChangeValue={setConsumoModeradoAmountCash}
                    placeholder="Ex: 150,00"
                    editable={!savingConsumo}
                    icon="wallet"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Total calculado</Text>
                  <Text style={styles.totalPreviewText}>
                    {formatCurrency(
                      consumoModeradoAmountCard + consumoModeradoAmountCash,
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 12 }]}
                  onPress={handleSaveConsumoModerado}
                  disabled={savingConsumo}
                >
                  {savingConsumo ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Salvar Consumo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Duração do Ciclo */}
      <Modal
        visible={isCycleDurationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCycleDurationModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsCycleDurationModalVisible(false)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { backgroundColor: "#0a0a0a" }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle]}>
                    {cycleDurationAction === "restart"
                      ? "Renovar Ciclo"
                      : "Editar Duração do Ciclo"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsCycleDurationModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Quantos dias o ciclo deve durar?
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: 30"
                    placeholderTextColor="#666"
                    value={cycleDurationInput}
                    onChangeText={setCycleDurationInput}
                    keyboardType="number-pad"
                    editable={!consumptionCycleLoading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, { marginTop: 12 }]}
                  onPress={handleSaveCycleDuration}
                  disabled={consumptionCycleLoading}
                >
                  {consumptionCycleLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {cycleDurationAction === "restart"
                        ? "Renovar Ciclo"
                        : "Salvar Duração"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCancelDelete}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[styles.modalContent, { backgroundColor: "#0a0a0a" }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Confirmar exclusão</Text>
                  <TouchableOpacity onPress={handleCancelDelete}>
                    <Ionicons name="close" size={24} color="#bbb" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.deleteConfirmText}>
                  {deleteTarget
                    ? `Deseja excluir ${deleteTarget.kind === "income" ? "a renda" : "o gasto"} “${deleteTarget.label}” no valor de ${formatCurrency(deleteTarget.amount)}?`
                    : "Deseja confirmar esta exclusão?"}
                </Text>

                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmButton, styles.cancelButton]}
                    onPress={handleCancelDelete}
                  >
                    <Text style={styles.deleteConfirmButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteConfirmButton, styles.deleteButton]}
                    onPress={handleConfirmDelete}
                  >
                    <Text style={styles.deleteConfirmButtonText}>Excluir</Text>
                  </TouchableOpacity>
                </View>
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
  cycleCard: {
    backgroundColor: "#121218",
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  cycleCardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  cycleCardText: {
    color: "#b9b0d1",
    fontSize: 13,
    marginBottom: 4,
  },
  cycleActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  cycleActionButton: {
    flex: 1,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cycleActionButtonSecondary: {
    backgroundColor: "#1a1a1f",
    borderWidth: 1,
    borderColor: "#8c52ff",
  },
  cycleActionText: {
    color: "#fff",
    fontWeight: "700",
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
  highlightCardFull: {
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#8c52ff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
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
  highlightCardSmall: {
    backgroundColor: "#0f0f11",
    borderWidth: 1,
    borderColor: "#6b46c1",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  highlightLabelSmall: {
    color: "#b89aff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  highlightValueSmall: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyListText: {
    color: "#9a9a9a",
    fontSize: 13,
    marginBottom: 12,
  },
  sectionBlock: {
    marginTop: 12,
  },
  releaseSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  addReleaseButton: {
    backgroundColor: "#8c52ff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addReleaseButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  releaseCard: {
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#11101a",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  releaseTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  releaseMeta: {
    color: "#b9b0d1",
    fontSize: 12,
    marginBottom: 2,
  },
  releaseActions: {
    flexDirection: "row",
    gap: 8,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#444",
    backgroundColor: "#141414",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  categoryChipActive: {
    borderColor: "#8c52ff",
    backgroundColor: "#2d1a58",
  },
  categoryChipDisabled: {
    opacity: 0.45,
  },
  categoryChipText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#fff",
  },
  releaseHintText: {
    color: "#999",
    fontSize: 12,
    marginTop: -6,
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
  categoryReleaseModalContent: {
    width: "94%",
    maxWidth: 560,
    alignSelf: "center",
    overflow: "hidden",
    padding: 16,
    flexShrink: 1,
  },
  categoryReleaseModalScroll: {
    flexGrow: 0,
  },
  categoryReleaseModalScrollContent: {
    paddingBottom: 2,
  },
  expenseModalContent: {
    width: "94%",
    maxWidth: 560,
    padding: 16,
    alignSelf: "center",
    overflow: "hidden",
    marginVertical: 0,
  },
  expenseModalAvoidingView: {
    flex: 1,
    width: "100%",
  },
  expenseModalOverlay: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  expenseModalScroll: {},
  expenseModalScrollContent: {
    paddingBottom: 0,
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
  lastInputGroup: {
    marginBottom: 0,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#fff",
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
  deleteConfirmText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#1a1a1f",
    borderWidth: 1,
    borderColor: "#333",
  },
  deleteButton: {
    backgroundColor: "#ff6666",
  },
  deleteConfirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  paymentChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentChipActive: {
    backgroundColor: "#6b46c1",
    borderColor: "#6b46c1",
  },
  paymentChipText: {
    color: "#ddd",
    fontWeight: "700",
  },
  paymentChipTextActive: {
    color: "#fff",
  },
  bottomSpacer: {
    height: 140,
  },
  totalPreviewText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
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
