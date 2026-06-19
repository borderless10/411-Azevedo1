/**
 * Tela de Cadastro de Gasto
 * Suporta 3 tipos: Consumo Moderado, Gasto Acompanhado e Conta
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { Button } from "../../components/ui/Button/Button";
import { CurrencyInput } from "../../components/CurrencyInput";
import DatePicker from "../../components/DatePicker";
import { CategoryPicker } from "../../components/CategoryPicker";
import expenseServices from "../../services/expenseServices";
import { planningServices } from "../../services/planningServices";
import { formatCurrency } from "../../utils/currencyUtils";
import ExpenseCreatedModal from "../../components/ui/ExpenseCreatedModal";
import { creditCardServices } from "../../services/creditCardServices";
import { markBillAsPaid, createBill } from "../../services/billServices";
import { isBillUnpaid } from "../../types/bill";
import { isPayablePlanningBill } from "../../types/planning";
import { CreditCard } from "../../types/creditCard";
import { Bill } from "../../types/planning";

export const AddExpenseScreen = () => {
  const { user } = useAuth();
  const { navigate, params } = useNavigation() as any;

  const navigateToReturnScreen = () => {
    navigate(params?.returnTo || "Home", params?.returnParams);
  };

  // Tipo de gasto
  const [expenseType, setExpenseType] = useState<
    "consumption" | "tracked" | "bill"
  >("consumption");

  // Estado para dados de planejamento
  const [trackedExpenses, setTrackedExpenses] = useState<
    Array<{ id?: string; name: string }>
  >([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Consumo Moderado
  const [consumoValue, setConsumoValue] = useState(0);
  const [consumoDescription, setConsumoDescription] = useState("");
  const [consumoDate, setConsumoDate] = useState<Date>(new Date());
  const [consumoPayment, setConsumoPayment] = useState<"cash" | "card">("cash");
  const [consumoSelectedCardId, setConsumoSelectedCardId] =
    useState<string>("");

  // Gasto Acompanhado
  const [trackedTitle, setTrackedTitle] = useState("");
  const [trackedValue, setTrackedValue] = useState(0);
  const [trackedDate, setTrackedDate] = useState<Date>(
    params?.prefillDate ? new Date(params.prefillDate) : new Date(),
  );
  const [trackedPayment, setTrackedPayment] = useState<
    "cash" | "debit_card" | "credit_card" | "pix" | "other"
  >("cash");
  const [trackedSelectedCardId, setTrackedSelectedCardId] =
    useState<string>("");

  // Conta (Bill)
  const [billSourceMode, setBillSourceMode] = useState<"planned" | "custom">(
    "planned",
  );
  const [billId, setBillId] = useState("");
  const [billCustomTitle, setBillCustomTitle] = useState("");
  const [billAmount, setBillAmount] = useState(0);
  const [billDueDate, setBillDueDate] = useState<Date>(new Date());
  const [billPaymentMethod, setBillPaymentMethod] = useState<
    "cash" | "debit_card" | "credit_card" | "pix"
  >("cash");
  const [billSelectedCardId, setBillSelectedCardId] = useState<string>("");

  // Campos comuns
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [savedValueForModal, setSavedValueForModal] = useState(0);
  const [lastSavedExpenseType, setLastSavedExpenseType] = useState<
    "consumption" | "tracked" | "bill" | null
  >(null);
  const [lastSavedTrackedTitle, setLastSavedTrackedTitle] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar cards e dados de planejamento
  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;
      try {
        setLoadingData(true);

        // Carregar cartões
        const loaded = await creditCardServices.getCreditCards(user.id);
        setCards(loaded.filter((card) => card.isActive !== false));

        // Carregar planejamento
        const planning = await planningServices.getPlanning(user.id);

        // Extrair gastos acompanhados
        if (planning) {
          const tracked = [
            ...(planning.bills || [])
              .filter((b) => b.dailyTracking)
              .map((b) => ({ id: b.id, name: b.name })),
            ...(planning.expectedExpenses || [])
              .filter((e) => e.dailyTracking)
              .map((e) => ({ id: e.id, name: e.source })),
          ];
          setTrackedExpenses(tracked);

          // Extrair contas a serem pagas
          const unpaidBills = (planning.bills || [])
            .filter(isBillUnpaid)
            .filter(isPayablePlanningBill);
          setBills(unpaidBills);
          if (unpaidBills.length === 0) {
            setBillSourceMode("custom");
          }
        } else {
          setBillSourceMode("custom");
        }
      } catch (error) {
        console.warn("Erro ao carregar dados:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, [user?.id]);

  const normalizeBillPaymentMethod = (
    raw?: string,
  ): "cash" | "debit_card" | "credit_card" | "pix" => {
    const normalized = String(raw || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      normalized.includes("card") ||
      normalized.includes("cart") ||
      normalized.includes("credito") ||
      normalized.includes("credit") ||
      normalized.includes("debito") ||
      normalized.includes("debit")
    ) {
      return "credit_card";
    }
    if (normalized.includes("pix")) return "pix";
    return "cash";
  };

  useEffect(() => {
    const prefillExpenseType = String(params?.prefillExpenseType || "");
    if (prefillExpenseType === "bill") {
      setExpenseType("bill");
    } else if (prefillExpenseType === "tracked") {
      setExpenseType("tracked");
    } else if (prefillExpenseType === "consumption") {
      setExpenseType("consumption");
    }
  }, [params?.prefillExpenseType]);

  useEffect(() => {
    const prefillTrackedTitle = String(params?.prefillTrackedTitle || "").trim();
    if (prefillTrackedTitle) {
      setTrackedTitle(prefillTrackedTitle);
    }
  }, [params?.prefillTrackedTitle]);

  useEffect(() => {
    const prefillBillId = String(params?.prefillBillId || "");
    if (!prefillBillId || bills.length === 0) {
      return;
    }

    const selectedBill = bills.find((bill) => bill.id === prefillBillId);
    if (!selectedBill) {
      return;
    }

    setExpenseType("bill");
    selectPlannedBill(selectedBill);
  }, [bills, params?.prefillBillId]);

  // Validação para Consumo Moderado
  const validateConsumoModerado = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (consumoValue <= 0) {
      newErrors.consumoValue = "Valor deve ser maior que zero";
    }
    if (!consumoDescription.trim()) {
      newErrors.consumoDescription = "Descrição é obrigatória";
    } else if (consumoDescription.trim().length < 3) {
      newErrors.consumoDescription =
        "Descrição deve ter pelo menos 3 caracteres";
    }
    if (consumoPayment === "card" && !consumoSelectedCardId) {
      newErrors.consumoCard = "Selecione um cartão";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validação para Gasto Acompanhado
  const validateTrackedExpense = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!trackedTitle) {
      newErrors.trackedTitle = "Selecione um gasto acompanhado";
    }
    if (trackedValue <= 0) {
      newErrors.trackedValue = "Valor deve ser maior que zero";
    }
    if (trackedPayment === "credit_card" && !trackedSelectedCardId) {
      newErrors.trackedCard = "Selecione um cartão";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isPlanningUser =
    user?.role === "user" || user?.role === "cliente_premium";

  const selectPlannedBill = (bill: Bill) => {
    setBillSourceMode("planned");
    setBillCustomTitle("");
    setBillId(bill.id || "");
    setBillAmount(Number(bill.amount) || 0);
    setBillDueDate(
      bill.dueDate ? new Date(bill.dueDate) : new Date(),
    );
    setBillPaymentMethod(
      normalizeBillPaymentMethod(bill.paymentMethod as any),
    );
    setBillSelectedCardId((bill as any).cardId || "");
  };

  const switchToCustomBill = () => {
    setBillSourceMode("custom");
    setBillId("");
  };

  const switchToPlannedBill = () => {
    setBillSourceMode("planned");
    setBillCustomTitle("");
    setBillId("");
  };

  // Validação para Conta
  const validateBill = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (billSourceMode === "planned") {
      if (!billId) {
        newErrors.billId = "Selecione uma conta planejada";
      }
    } else if (!billCustomTitle.trim()) {
      newErrors.billCustomTitle = "Informe o título da conta";
    }
    if (billAmount <= 0) {
      newErrors.billAmount = "Valor deve ser maior que zero";
    }
    if (billPaymentMethod === "credit_card" && !billSelectedCardId) {
      newErrors.billCard = "Selecione um cartão";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar
  const handleSave = async () => {
    setErrors({});

    // Validar conforme tipo
    let isValid = false;
    if (expenseType === "consumption") {
      isValid = validateConsumoModerado();
    } else if (expenseType === "tracked") {
      isValid = validateTrackedExpense();
    } else if (expenseType === "bill") {
      isValid = validateBill();
    }

    if (!isValid) {
      return;
    }

    if (!user) {
      Alert.alert("Erro", "Usuário não autenticado");
      return;
    }

    try {
      setLoading(true);

      if (expenseType === "consumption") {
        // Criar expense como Consumo Moderado
        const expenseData = {
          value: consumoValue,
          description: consumoDescription.trim(),
          date: consumoDate,
          category: "Consumo Moderado",
          paymentMethod: consumoPayment === "card" ? "credit_card" : "cash",
          ...(consumoPayment === "card" && consumoSelectedCardId
            ? { cardId: consumoSelectedCardId }
            : {}),
          isConsumoModerado: true,
        };

        await expenseServices.createExpense(user.id, expenseData);
        setSavedValueForModal(consumoValue);
        setLastSavedExpenseType("consumption");
        setLastSavedTrackedTitle("");
      } else if (expenseType === "tracked") {
        // Criar expense comum mas com descrição do tracked e dailyTracking flag
        const expenseData = {
          value: trackedValue,
          description: trackedTitle,
          date: trackedDate,
          category: "Acompanhamento Diário",
          paymentMethod: trackedPayment,
          isTrackedDaily: true,
          ...(trackedPayment === "credit_card" && trackedSelectedCardId
            ? { cardId: trackedSelectedCardId }
            : {}),
        };

        await expenseServices.createExpense(user.id, expenseData);
        setSavedValueForModal(trackedValue);
        setLastSavedExpenseType("tracked");
        setLastSavedTrackedTitle(trackedTitle);
      } else if (expenseType === "bill") {
        if (billSourceMode === "custom") {
          const title = billCustomTitle.trim();
          let newBillId: string;
          let billDescription = title;

          if (isPlanningUser) {
            const created = await planningServices.addBillByClient(user.id, {
              name: title,
              amount: billAmount,
              dueDate: billDueDate,
              dueDay: billDueDate.getDate(),
              paymentMethod: billPaymentMethod,
            });
            newBillId = created.id!;
            billDescription = created.name;
            await planningServices.markBillAsPaidByClient(user.id, newBillId);
          } else {
            const created = await createBill(user.id, {
              title,
              amount: billAmount,
              dueDate: billDueDate,
            });
            newBillId = created.id;
            billDescription = created.title;
            await markBillAsPaid(newBillId);
          }

          await expenseServices.createExpense(user.id, {
            value: billAmount,
            description: billDescription,
            date: billDueDate,
            category: "Conta",
            paymentMethod: billPaymentMethod,
            sourceBillId: newBillId,
            ...(billPaymentMethod === "credit_card" && billSelectedCardId
              ? { cardId: billSelectedCardId }
              : {}),
          });
        } else {
          const selectedBill = bills.find((bill) => bill.id === billId);
          if (!selectedBill) {
            throw new Error("Conta selecionada não encontrada");
          }

          await expenseServices.createExpense(user.id, {
            value: billAmount,
            description: selectedBill.name,
            date: billDueDate,
            category: "Conta",
            paymentMethod: billPaymentMethod,
            sourceBillId: selectedBill.id,
            ...(billPaymentMethod === "credit_card" && billSelectedCardId
              ? { cardId: billSelectedCardId }
              : {}),
          });

          try {
            await planningServices.markBillAsPaidByClient(user.id, billId);
          } catch {
            await markBillAsPaid(billId);
          }
        }

        setSavedValueForModal(billAmount);
        setLastSavedExpenseType("bill");
        setLastSavedTrackedTitle("");
      }

      setLoading(false);
      setSuccessModalVisible(true);
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      Alert.alert("Erro", error.message || "Erro ao salvar. Tente novamente.");
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigateToReturnScreen();
  };

  const navigateAfterSave = () => {
    if (lastSavedExpenseType === "tracked" && lastSavedTrackedTitle) {
      navigate("CategoryBudget", { trackedTitle: lastSavedTrackedTitle });
      return;
    }

    if (lastSavedExpenseType === "consumption") {
      navigate("Budget");
      return;
    }

    navigateToReturnScreen();
  };

  const handleViewSavedExpense = () => {
    setSuccessModalVisible(false);

    if (lastSavedExpenseType === "tracked" && lastSavedTrackedTitle) {
      navigate("CategoryBudget", { trackedTitle: lastSavedTrackedTitle });
      return;
    }

    if (lastSavedExpenseType === "consumption") {
      navigate("Budget");
      return;
    }

    navigate("ExpenseList");
  };

  const successModalMessage =
    lastSavedExpenseType === "tracked" && lastSavedTrackedTitle
      ? `Registrado no acompanhamento de ${lastSavedTrackedTitle}.`
      : lastSavedExpenseType === "consumption"
        ? "Registrado no consumo moderado do ciclo."
        : "Seu gasto foi registrado com sucesso.";

  const successModalViewLabel =
    lastSavedExpenseType === "tracked"
      ? "Ver histórico"
      : lastSavedExpenseType === "consumption"
        ? "Ver consumo moderado"
        : "Ver gastos";

  return (
    <Layout title="Adicionar Gasto" showBackButton={true} showSidebar={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Seletor de Tipo */}
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeTab,
                  expenseType === "consumption" && styles.typeTabActive,
                ]}
                onPress={() => setExpenseType("consumption")}
              >
                <Ionicons
                  name="wallet"
                  size={20}
                  color={expenseType === "consumption" ? "#8c52ff" : "#999"}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    expenseType === "consumption" && styles.typeTabTextActive,
                  ]}
                >
                  Consumo Moderado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  expenseType === "tracked" && styles.typeTabActive,
                ]}
                onPress={() => setExpenseType("tracked")}
              >
                <Ionicons
                  name="analytics"
                  size={20}
                  color={expenseType === "tracked" ? "#8c52ff" : "#999"}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    expenseType === "tracked" && styles.typeTabTextActive,
                  ]}
                >
                  Gasto Acompanhado
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeTab,
                  expenseType === "bill" && styles.typeTabActive,
                ]}
                onPress={() => setExpenseType("bill")}
              >
                <Ionicons
                  name="document-text"
                  size={20}
                  color={expenseType === "bill" ? "#8c52ff" : "#999"}
                />
                <Text
                  style={[
                    styles.typeTabText,
                    expenseType === "bill" && styles.typeTabTextActive,
                  ]}
                >
                  Conta
                </Text>
              </TouchableOpacity>
            </View>

            {loadingData ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator color="#8c52ff" size="large" />
              </View>
            ) : (
              <>
                {/* Consumo Moderado */}
                {expenseType === "consumption" && (
                  <View style={styles.form}>
                    <View style={styles.header}>
                      <Ionicons name="wallet" size={48} color="#8c52ff" />
                      <Text style={styles.headerSubtitle}>
                        Registre o consumo moderado do ciclo
                      </Text>
                    </View>

                    {errors.consumoValue ? (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color="#ff4d6d"
                        />
                        <Text style={styles.errorText}>
                          {errors.consumoValue}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Descrição *</Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          errors.consumoDescription && styles.inputWrapperError,
                        ]}
                      >
                        <Ionicons
                          name="document-text"
                          size={20}
                          color={errors.consumoDescription ? "#ff4d6d" : "#999"}
                          style={{ marginRight: 12 }}
                        />
                        <TextInput
                          style={styles.input}
                          placeholder="Ex: Mercado, Combustível..."
                          placeholderTextColor="#666"
                          value={consumoDescription}
                          onChangeText={setConsumoDescription}
                          editable={!loading}
                          maxLength={100}
                        />
                      </View>
                      {errors.consumoDescription ? (
                        <Text style={styles.errorTextSmall}>
                          {errors.consumoDescription}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Data</Text>
                      <DatePicker
                        label=""
                        date={consumoDate}
                        onChangeDate={setConsumoDate}
                        maxDate={new Date()}
                        editable={!loading}
                      />
                    </View>

                    <CurrencyInput
                      label="Valor Total"
                      value={consumoValue}
                      onChangeValue={setConsumoValue}
                      error={errors.consumoValue}
                      icon="cash"
                      editable={!loading}
                    />

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Forma de pagamento</Text>
                      <View style={styles.paymentMethodsRow}>
                        {[
                          { id: "cash", label: "Dinheiro", icon: "wallet" },
                          { id: "card", label: "Cartão", icon: "card" },
                        ].map((method) => {
                          const active = consumoPayment === method.id;
                          return (
                            <TouchableOpacity
                              key={method.id}
                              style={[
                                styles.paymentChip,
                                active && styles.paymentChipActive,
                              ]}
                              onPress={() =>
                                setConsumoPayment(method.id as any)
                              }
                            >
                              <Ionicons
                                name={method.icon as any}
                                size={16}
                                color={active ? "#fff" : "#999"}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.paymentChipText,
                                  active && styles.paymentChipTextActive,
                                ]}
                              >
                                {method.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {consumoPayment === "card" && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cartão específico</Text>
                        {cards.length === 0 ? (
                          <Text style={styles.errorTextSmall}>
                            Sem cartões cadastrados
                          </Text>
                        ) : (
                          <View style={styles.paymentMethodsRow}>
                            {cards.map((card) => {
                              const active = consumoSelectedCardId === card.id;
                              return (
                                <TouchableOpacity
                                  key={card.id}
                                  style={[
                                    styles.paymentChip,
                                    active && styles.paymentChipActive,
                                  ]}
                                  onPress={() =>
                                    setConsumoSelectedCardId(card.id)
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.paymentChipText,
                                      active && styles.paymentChipTextActive,
                                    ]}
                                  >
                                    {card.bank} ••••{card.last4}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        {errors.consumoCard ? (
                          <Text style={styles.errorTextSmall}>
                            {errors.consumoCard}
                          </Text>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}

                {/* Gasto Acompanhado */}
                {expenseType === "tracked" && (
                  <View style={styles.form}>
                    <View style={styles.header}>
                      <Ionicons name="analytics" size={48} color="#08c" />
                      <Text style={styles.headerSubtitle}>
                        Registre um gasto com acompanhamento diário
                      </Text>
                    </View>

                    {errors.trackedTitle ? (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color="#ff4d6d"
                        />
                        <Text style={styles.errorText}>
                          {errors.trackedTitle}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>
                        Qual gasto acompanhado? *
                      </Text>
                      {trackedExpenses.length === 0 ? (
                        <View
                          style={[
                            styles.pickerPlaceholder,
                            errors.trackedTitle &&
                              styles.pickerPlaceholderError,
                          ]}
                        >
                          <Text style={styles.pickerPlaceholderLabel}>
                            Nenhum gasto acompanhado cadastrado
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.pickerContainer}>
                          {trackedExpenses.map((expense) => {
                            const active = trackedTitle === expense.name;
                            return (
                              <TouchableOpacity
                                key={expense.id || expense.name}
                                style={[
                                  styles.pickerOption,
                                  active && styles.pickerOptionActive,
                                ]}
                                onPress={() => setTrackedTitle(expense.name)}
                              >
                                <Text
                                  style={[
                                    styles.pickerOptionText,
                                    active && styles.pickerOptionTextActive,
                                  ]}
                                >
                                  {expense.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>

                    {errors.trackedValue ? (
                      <View
                        style={[styles.errorContainer, { marginBottom: 8 }]}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color="#ff4d6d"
                        />
                        <Text style={styles.errorText}>
                          {errors.trackedValue}
                        </Text>
                      </View>
                    ) : null}

                    <CurrencyInput
                      label="Valor"
                      value={trackedValue}
                      onChangeValue={setTrackedValue}
                      error={errors.trackedValue}
                      icon="cash"
                      editable={!loading}
                    />

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Data</Text>
                      <DatePicker
                        label=""
                        date={trackedDate}
                        onChangeDate={setTrackedDate}
                        maxDate={new Date()}
                        editable={!loading}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Forma de pagamento</Text>
                      <View style={styles.paymentMethodsRow}>
                        {[
                          {
                            id: "cash",
                            label: "Dinheiro",
                            icon: "wallet",
                          },
                          {
                            id: "debit_card",
                            label: "Débito",
                            icon: "card",
                          },
                          {
                            id: "credit_card",
                            label: "Crédito",
                            icon: "card",
                          },
                          {
                            id: "pix",
                            label: "PIX",
                            icon: "phone-portrait",
                          },
                        ].map((method) => {
                          const active = trackedPayment === method.id;
                          return (
                            <TouchableOpacity
                              key={method.id}
                              style={[
                                styles.paymentChip,
                                active && styles.paymentChipActive,
                              ]}
                              onPress={() =>
                                setTrackedPayment(method.id as any)
                              }
                            >
                              <Ionicons
                                name={method.icon as any}
                                size={16}
                                color={active ? "#fff" : "#999"}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.paymentChipText,
                                  active && styles.paymentChipTextActive,
                                ]}
                              >
                                {method.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {trackedPayment === "credit_card" && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cartão específico</Text>
                        {cards.length === 0 ? (
                          <Text style={styles.errorTextSmall}>
                            Sem cartões cadastrados
                          </Text>
                        ) : (
                          <View style={styles.paymentMethodsRow}>
                            {cards.map((card) => {
                              const active = trackedSelectedCardId === card.id;
                              return (
                                <TouchableOpacity
                                  key={card.id}
                                  style={[
                                    styles.paymentChip,
                                    active && styles.paymentChipActive,
                                  ]}
                                  onPress={() =>
                                    setTrackedSelectedCardId(card.id)
                                  }
                                >
                                  <Text
                                    style={[
                                      styles.paymentChipText,
                                      active && styles.paymentChipTextActive,
                                    ]}
                                  >
                                    {card.bank} ••••{card.last4}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Conta (Bill) */}
                {expenseType === "bill" && (
                  <View style={styles.form}>
                    <View style={styles.header}>
                      <Ionicons
                        name="document-text"
                        size={48}
                        color="#ff9800"
                      />
                      <Text style={styles.headerSubtitle}>
                        Registre o pagamento de uma conta
                      </Text>
                    </View>

                    {errors.billId || errors.billCustomTitle ? (
                      <View style={styles.errorContainer}>
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color="#ff4d6d"
                        />
                        <Text style={styles.errorText}>
                          {errors.billId || errors.billCustomTitle}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Tipo de conta</Text>
                      <View style={styles.paymentMethodsRow}>
                        <TouchableOpacity
                          style={[
                            styles.paymentChip,
                            billSourceMode === "planned" &&
                              styles.paymentChipActive,
                          ]}
                          onPress={switchToPlannedBill}
                        >
                          <Text
                            style={[
                              styles.paymentChipText,
                              billSourceMode === "planned" &&
                                styles.paymentChipTextActive,
                            ]}
                          >
                            Planejada
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.paymentChip,
                            billSourceMode === "custom" &&
                              styles.paymentChipActive,
                          ]}
                          onPress={switchToCustomBill}
                        >
                          <Text
                            style={[
                              styles.paymentChipText,
                              billSourceMode === "custom" &&
                                styles.paymentChipTextActive,
                            ]}
                          >
                            Outra conta
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {billSourceMode === "planned" ? (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Qual conta? *</Text>
                        {bills.length === 0 ? (
                          <View
                            style={[
                              styles.pickerPlaceholder,
                              errors.billId && styles.pickerPlaceholderError,
                            ]}
                          >
                            <Text style={styles.pickerPlaceholderLabel}>
                              Nenhuma conta planejada pendente. Use &quot;Outra
                              conta&quot; para cadastrar na hora.
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.pickerContainer}>
                            {bills.map((bill) => {
                              const active = billId === bill.id;
                              return (
                                <TouchableOpacity
                                  key={bill.id}
                                  style={[
                                    styles.pickerOption,
                                    active && styles.pickerOptionActive,
                                  ]}
                                  onPress={() => selectPlannedBill(bill)}
                                >
                                  <View style={styles.billOptionContent}>
                                    <Text
                                      style={[
                                        styles.pickerOptionText,
                                        active && styles.pickerOptionTextActive,
                                      ]}
                                    >
                                      {bill.name}
                                    </Text>
                                    <Text
                                      style={[
                                        styles.billOptionAmount,
                                        active && styles.billOptionAmountActive,
                                      ]}
                                    >
                                      {formatCurrency(bill.amount || 0)}
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Título da conta *</Text>
                        <View
                          style={[
                            styles.inputWrapper,
                            errors.billCustomTitle && styles.inputWrapperError,
                          ]}
                        >
                          <Ionicons
                            name="create-outline"
                            size={20}
                            color={
                              errors.billCustomTitle ? "#ff4d6d" : "#999"
                            }
                            style={{ marginRight: 12 }}
                          />
                          <TextInput
                            style={styles.input}
                            placeholder="Ex: Internet, Academia, Condomínio..."
                            placeholderTextColor="#666"
                            value={billCustomTitle}
                            onChangeText={setBillCustomTitle}
                            editable={!loading}
                            maxLength={100}
                          />
                        </View>
                        {errors.billCustomTitle ? (
                          <Text style={styles.errorTextSmall}>
                            {errors.billCustomTitle}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {errors.billAmount ? (
                      <View
                        style={[styles.errorContainer, { marginBottom: 8 }]}
                      >
                        <Ionicons
                          name="alert-circle"
                          size={20}
                          color="#ff4d6d"
                        />
                        <Text style={styles.errorText}>
                          {errors.billAmount}
                        </Text>
                      </View>
                    ) : null}

                    <CurrencyInput
                      label="Valor Pago"
                      value={billAmount}
                      onChangeValue={setBillAmount}
                      error={errors.billAmount}
                      icon="cash"
                      editable={!loading}
                    />

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Data do Pagamento</Text>
                      <DatePicker
                        label=""
                        date={billDueDate}
                        onChangeDate={setBillDueDate}
                        maxDate={new Date()}
                        editable={!loading}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Forma de pagamento</Text>
                      <View style={styles.paymentMethodsRow}>
                        {[
                          {
                            id: "cash",
                            label: "Dinheiro",
                            icon: "wallet",
                          },
                          {
                            id: "debit_card",
                            label: "Débito",
                            icon: "card",
                          },
                          {
                            id: "credit_card",
                            label: "Crédito",
                            icon: "card",
                          },
                          {
                            id: "pix",
                            label: "PIX",
                            icon: "phone-portrait",
                          },
                        ].map((method) => {
                          const active = billPaymentMethod === method.id;
                          return (
                            <TouchableOpacity
                              key={method.id}
                              style={[
                                styles.paymentChip,
                                active && styles.paymentChipActive,
                              ]}
                              onPress={() =>
                                setBillPaymentMethod(method.id as any)
                              }
                            >
                              <Ionicons
                                name={method.icon as any}
                                size={16}
                                color={active ? "#fff" : "#999"}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={[
                                  styles.paymentChipText,
                                  active && styles.paymentChipTextActive,
                                ]}
                              >
                                {method.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    {billPaymentMethod === "credit_card" && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Cartão específico</Text>
                        {cards.length === 0 ? (
                          <Text style={styles.errorTextSmall}>
                            Sem cartões cadastrados
                          </Text>
                        ) : (
                          <View style={styles.paymentMethodsRow}>
                            {cards.map((card) => {
                              const active = billSelectedCardId === card.id;
                              return (
                                <TouchableOpacity
                                  key={card.id}
                                  style={[
                                    styles.paymentChip,
                                    active && styles.paymentChipActive,
                                  ]}
                                  onPress={() => setBillSelectedCardId(card.id)}
                                >
                                  <Text
                                    style={[
                                      styles.paymentChipText,
                                      active && styles.paymentChipTextActive,
                                    ]}
                                  >
                                    {card.bank} ••••{card.last4}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Botões */}
                <View style={styles.buttonContainer}>
                  <Button
                    title="Cancelar"
                    onPress={handleCancel}
                    variant="secondary"
                    icon="close"
                    disabled={loading}
                    style={styles.button}
                  />

                  <Button
                    title="Salvar"
                    onPress={handleSave}
                    variant="success"
                    icon="checkmark"
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                  />
                </View>
              </>
            )}
          </View>
        </ScrollView>

        <ExpenseCreatedModal
          visible={successModalVisible}
          amount={savedValueForModal}
          message={successModalMessage}
          viewListLabel={successModalViewLabel}
          onClose={() => {
            setSuccessModalVisible(false);
            navigateAfterSave();
          }}
          onViewList={handleViewSavedExpense}
          onAddAnother={() => {
            setSuccessModalVisible(false);
          }}
        />
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 8,
  },
  typeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "transparent",
    gap: 6,
  },
  typeTabActive: {
    backgroundColor: "rgba(140, 82, 255, 0.1)",
    borderColor: "#8c52ff",
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
    textAlign: "center",
  },
  typeTabTextActive: {
    color: "#8c52ff",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#bbb",
    textAlign: "center",
    marginTop: 12,
  },
  form: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 109, 0.1)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#ff4d6d",
  },
  errorText: {
    flex: 1,
    color: "#ff4d6d",
    fontSize: 14,
    fontWeight: "500",
  },
  errorTextSmall: {
    color: "#ff4d6d",
    fontSize: 12,
    marginTop: 4,
  },
  paymentMethodsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  paymentChip: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#1a1a1a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentChipActive: {
    backgroundColor: "#8c52ff",
    borderColor: "#8c52ff",
  },
  paymentChipText: {
    color: "#bbb",
    fontSize: 13,
    fontWeight: "600",
  },
  paymentChipTextActive: {
    color: "#fff",
  },
  pickerContainer: {
    gap: 8,
  },
  pickerOption: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#1a1a1a",
    justifyContent: "space-between",
  },
  pickerOptionActive: {
    backgroundColor: "rgba(140, 82, 255, 0.15)",
    borderColor: "#8c52ff",
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#bbb",
  },
  pickerOptionTextActive: {
    color: "#8c52ff",
  },
  billOptionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  billOptionAmount: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999",
  },
  billOptionAmountActive: {
    color: "#8c52ff",
  },
  pickerPlaceholder: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
  },
  pickerPlaceholderError: {
    borderColor: "#ff4d6d",
  },
  pickerPlaceholderLabel: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 12,
  },
  inputWrapperError: {
    borderColor: "#ff4d6d",
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: "#fff",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  button: {
    flex: 1,
  },
});

export default AddExpenseScreen;
