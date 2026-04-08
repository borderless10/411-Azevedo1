import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { useNavigation } from "../../routes/NavigationContext";
import { creditCardServices } from "../../services/creditCardServices";
import {
  CreditCard,
  CreditCardInvoiceSummary,
  CreateCreditCardData,
} from "../../types/creditCard";
import { addMonths } from "../../utils/dateUtils";
import { toInvoiceKey } from "../../utils/creditCardUtils";
import {
  applyCurrencyMask,
  formatCurrency,
  parseCurrency,
} from "../../utils/currencyUtils";

const toDay = (value: string): number =>
  Number(String(value).replace(/\D/g, "").slice(0, 2));

// Mask for expiry MM/YYYY
const toMonthYearMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

// Mask that keeps only day (DD)
const toDayMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 2);
  return digits;
};

export const CardsScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { params } = useNavigation() as any;
  const clientId = params?.clientId;

  // Determine which userId to use: clientId when managing client cards (consultant), or user.id for own cards
  const targetUserId = clientId || user?.id;

  // Consultant is managing a client's cards
  const isConsultorManaging = !!clientId && user?.role === "consultor";

  // Only consultants managing a specific client can create/edit/delete cards
  const canEdit = isConsultorManaging;

  const [cards, setCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<CreditCardInvoiceSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [selectedCardId, setSelectedCardId] = useState<string>("all");
  const [selectedWindow, setSelectedWindow] = useState<
    "current" | "next" | "all"
  >("current");

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);

  const [bank, setBank] = useState<string>("");
  const [last4, setLast4] = useState<string>("");
  const [bestDay, setBestDay] = useState<string>("");
  const [cardDueDay, setCardDueDay] = useState<string>("");
  const [invoiceDueDay, setInvoiceDueDay] = useState<string>("");
  const [limit, setLimit] = useState<string>("");

  const currentInvoiceKey = toInvoiceKey(new Date());
  const nextInvoiceKey = toInvoiceKey(addMonths(new Date(), 1));

  const loadData = async () => {
    if (!targetUserId) return;

    try {
      setLoading(true);
      const [loadedCards, loadedInvoices] = await Promise.all([
        creditCardServices.getCreditCards(targetUserId),
        creditCardServices.getInvoiceSummaries(targetUserId),
      ]);
      setCards(loadedCards);
      setInvoices(loadedInvoices);
    } catch (error) {
      console.error("Erro ao carregar cartões/faturas", error);
      Alert.alert("Erro", "Não foi possível carregar os cartões");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetUserId]);

  const summary = useMemo(() => {
    const currentTotal = invoices
      .filter((invoice) => invoice.invoiceKey === currentInvoiceKey)
      .reduce((acc, invoice) => acc + invoice.total, 0);

    const nextTotal = invoices
      .filter((invoice) => invoice.invoiceKey === nextInvoiceKey)
      .reduce((acc, invoice) => acc + invoice.total, 0);

    return {
      currentTotal,
      nextTotal,
    };
  }, [invoices, currentInvoiceKey, nextInvoiceKey]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      if (selectedCardId !== "all" && invoice.cardId !== selectedCardId) {
        return false;
      }

      if (selectedWindow === "current") {
        return invoice.invoiceKey === currentInvoiceKey;
      }

      if (selectedWindow === "next") {
        return invoice.invoiceKey === nextInvoiceKey;
      }

      return true;
    });
  }, [
    invoices,
    selectedCardId,
    selectedWindow,
    currentInvoiceKey,
    nextInvoiceKey,
  ]);

  const resetForm = () => {
    setBank("");
    setLast4("");
    setBestDay("");
    setCardDueDay("");
    setInvoiceDueDay("");
    setLimit("R$ 0,00");
    setEditingCard(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (card: CreditCard) => {
    setEditingCard(card);
    setBank(card.bank);
    setLast4(card.last4);
    setBestDay(`${String(card.bestDay).padStart(2, "0")}`);
    setCardDueDay(
      `${String(card.cardExpiryMonth || 1).padStart(2, "0")}/${String(card.cardExpiryYear || new Date().getFullYear()).slice(0, 4)}`,
    );
    setInvoiceDueDay(`${String(card.invoiceDueDay).padStart(2, "0")}`);
    setLimit(applyCurrencyMask(String(Math.round(card.limit * 100))));
    setModalVisible(true);
  };

  const handleSaveCard = async () => {
    if (!targetUserId) return;

    try {
      // parse cardDueDay as MM/YYYY (expiry)
      const parts = cardDueDay.replace(/\s/g, "").split("/");
      const parsedExpiryMonth = Number(parts[0]) || 1;
      const parsedExpiryYear = Number(parts[1]) || new Date().getFullYear();

      const payload: CreateCreditCardData = {
        bank,
        last4,
        bestDay: toDay(bestDay),
        cardDueDay: 1,
        cardExpiryMonth: parsedExpiryMonth,
        cardExpiryYear: parsedExpiryYear,
        invoiceDueDay: toDay(invoiceDueDay),
        limit: parseCurrency(limit),
      };

      if (editingCard) {
        await creditCardServices.updateCreditCard(editingCard.id, payload);
      } else {
        await creditCardServices.createCreditCard(targetUserId, payload);
      }

      setModalVisible(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Não foi possível salvar o cartão");
    }
  };

  const handleDeleteCard = async (card: CreditCard) => {
    Alert.alert(
      "Excluir cartão",
      `Deseja remover o cartão ${card.bank} ••••${card.last4}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await creditCardServices.deleteCreditCard(card.id);
              if (selectedCardId === card.id) {
                setSelectedCardId("all");
              }
              await loadData();
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir o cartão");
            }
          },
        },
      ],
    );
  };

  return (
    <Layout
      title={isConsultorManaging ? "Cartões do Cliente" : "Cartões"}
      showBackButton={true}
      showSidebar={false}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
          <View style={[styles.summaryRow]}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.textSecondary }}>
                Faturas do mês atual
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(summary.currentTotal)}
              </Text>
            </View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.textSecondary }}>
                Faturas do próximo mês
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {formatCurrency(summary.nextTotal)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {isConsultorManaging ? "Cartões do Cliente" : "Meus cartões"}
              </Text>
              {canEdit && (
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={openCreateModal}
                >
                  <Text style={styles.smallButtonText}>Adicionar</Text>
                </TouchableOpacity>
              )}
            </View>

            {cards.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                Nenhum cartão cadastrado.
              </Text>
            ) : (
              cards.map((card) => (
                <View
                  key={card.id}
                  style={[styles.cardRow, { borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {card.bank} ••••{card.last4}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                      Melhor dia: {card.bestDay} | Venc. cartão: dia{" "}
                      {card.cardDueDay}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                      Venc. fatura: dia {card.invoiceDueDay}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
                      Limite: {formatCurrency(card.limit)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    {canEdit && (
                      <>
                        <TouchableOpacity onPress={() => openEditModal(card)}>
                          <Text
                            style={{ color: colors.primary, fontWeight: "700" }}
                          >
                            Editar
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteCard(card)}
                        >
                          <Text style={{ color: "#ff4d6d", fontWeight: "700" }}>
                            Excluir
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>

          <View
            style={[
              styles.section,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Faturas e gastos por cartão
            </Text>

            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedWindow === "current" && {
                    backgroundColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => setSelectedWindow("current")}
              >
                <Text
                  style={{
                    color: selectedWindow === "current" ? "#fff" : colors.text,
                  }}
                >
                  Mês atual
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedWindow === "next" && {
                    backgroundColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => setSelectedWindow("next")}
              >
                <Text
                  style={{
                    color: selectedWindow === "next" ? "#fff" : colors.text,
                  }}
                >
                  Próximo mês
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedWindow === "all" && {
                    backgroundColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => setSelectedWindow("all")}
              >
                <Text
                  style={{
                    color: selectedWindow === "all" ? "#fff" : colors.text,
                  }}
                >
                  Histórico
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  selectedCardId === "all" && {
                    backgroundColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
                onPress={() => setSelectedCardId("all")}
              >
                <Text
                  style={{
                    color: selectedCardId === "all" ? "#fff" : colors.text,
                  }}
                >
                  Todas juntas
                </Text>
              </TouchableOpacity>
              {cards.map((card) => (
                <TouchableOpacity
                  key={`chip-${card.id}`}
                  style={[
                    styles.chip,
                    selectedCardId === card.id && {
                      backgroundColor: colors.primary,
                    },
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setSelectedCardId(card.id)}
                >
                  <Text
                    style={{
                      color: selectedCardId === card.id ? "#fff" : colors.text,
                    }}
                  >
                    {card.bank} ••••{card.last4}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {loading ? (
              <Text style={{ color: colors.textSecondary }}>
                Carregando faturas...
              </Text>
            ) : filteredInvoices.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                Nenhuma fatura para o filtro selecionado.
              </Text>
            ) : (
              filteredInvoices.map((invoice) => (
                <View
                  key={`${invoice.cardId}-${invoice.invoiceKey}`}
                  style={[styles.invoiceCard, { borderColor: colors.border }]}
                >
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {invoice.cardLabel}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    Fatura: {invoice.invoiceLabel} | Vencimento:{" "}
                    {invoice.dueDate.toLocaleDateString("pt-BR")}
                  </Text>
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                      marginTop: 4,
                    }}
                  >
                    Total: {formatCurrency(invoice.total)} (
                    {invoice.expenseCount} gasto
                    {invoice.expenseCount === 1 ? "" : "s"})
                  </Text>

                  <View style={{ marginTop: 8 }}>
                    {invoice.expenses.map((expense) => (
                      <View key={expense.id} style={styles.expenseRow}>
                        <Text
                          style={{ color: colors.textSecondary, flex: 1 }}
                          numberOfLines={1}
                        >
                          {expense.description}
                        </Text>
                        <Text
                          style={{
                            color: colors.textSecondary,
                            marginHorizontal: 8,
                          }}
                        >
                          {expense.date.toLocaleDateString("pt-BR")}
                        </Text>
                        <Text style={{ color: colors.text }}>
                          {formatCurrency(expense.amount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={Keyboard.dismiss}
            />
            <View
              style={[
                styles.modalCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ScrollView
                style={{ maxHeight: "80%" }}
                contentContainerStyle={{ paddingBottom: 6 }}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {editingCard ? "Editar Cartão" : "Novo Cartão"}
                </Text>

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Banco
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={bank}
                  onChangeText={setBank}
                  placeholder="Ex: Nubank"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  4 dígitos finais
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={last4}
                  onChangeText={(value) =>
                    setLast4(value.replace(/\D/g, "").slice(0, 4))
                  }
                  keyboardType="numeric"
                  placeholder="1234"
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Melhor dia
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={bestDay}
                  onChangeText={(value) => setBestDay(toDayMask(value))}
                  keyboardType="numeric"
                  placeholder="DD"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Vencimento do cartão (MM/AAAA)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={cardDueDay}
                  onChangeText={(value) =>
                    setCardDueDay(toMonthYearMask(value))
                  }
                  keyboardType="numeric"
                  placeholder="MM/YYYY"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Vencimento da fatura
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={invoiceDueDay}
                  onChangeText={(value) => setInvoiceDueDay(toDayMask(value))}
                  keyboardType="numeric"
                  placeholder="DD"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />

                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  Limite
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={limit}
                  onChangeText={(value) => setLimit(applyCurrencyMask(value))}
                  keyboardType="numeric"
                  placeholder="R$ 0,00"
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { backgroundColor: colors.border },
                  ]}
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text
                    style={[styles.smallButtonText, { color: colors.text }]}
                  >
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.smallButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleSaveCard}
                >
                  <Text style={styles.smallButtonText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryValue: { marginTop: 8, fontWeight: "700", fontSize: 18 },
  section: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  smallButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  smallButtonText: { color: "#fff", fontWeight: "700" },
  cardRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    flexDirection: "row",
    gap: 8,
  },
  cardTitle: { fontWeight: "700", fontSize: 14 },
  cardActions: {
    justifyContent: "space-between",
    alignItems: "flex-end",
    minWidth: 62,
  },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  invoiceCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  label: { marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  checkboxRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
});

export default CardsScreen;
