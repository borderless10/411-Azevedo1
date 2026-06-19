import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { Ionicons } from "@expo/vector-icons";
import { creditCardServices } from "../../services/creditCardServices";
import {
  CreateCreditCardData,
  CreditCard,
} from "../../types/creditCard";
import {
  applyCurrencyMask,
  parseCurrency,
} from "../../utils/currencyUtils";

const toDay = (value: string): number =>
  Number(String(value).replace(/\D/g, "").slice(0, 2));

const toMonthYearMask = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const toDayMask = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 2);

interface CreditCardFormModalProps {
  visible: boolean;
  userId: string;
  editingCard?: CreditCard | null;
  onClose: () => void;
  onSaved: (card: CreditCard) => void;
}

export const CreditCardFormModal: React.FC<CreditCardFormModalProps> = ({
  visible,
  userId,
  editingCard = null,
  onClose,
  onSaved,
}) => {
  const [bank, setBank] = useState("");
  const [last4, setLast4] = useState("");
  const [bestDay, setBestDay] = useState("");
  const [cardDueDay, setCardDueDay] = useState("");
  const [invoiceDueDay, setInvoiceDueDay] = useState("");
  const [limit, setLimit] = useState("R$ 0,00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    if (editingCard) {
      setBank(editingCard.bank);
      setLast4(editingCard.last4);
      setBestDay(String(editingCard.bestDay).padStart(2, "0"));
      setCardDueDay(
        `${String(editingCard.cardExpiryMonth || 1).padStart(2, "0")}/${String(editingCard.cardExpiryYear || new Date().getFullYear())}`,
      );
      setInvoiceDueDay(String(editingCard.invoiceDueDay).padStart(2, "0"));
      setLimit(applyCurrencyMask(String(Math.round(editingCard.limit * 100))));
      return;
    }

    setBank("");
    setLast4("");
    setBestDay("");
    setCardDueDay("");
    setInvoiceDueDay("");
    setLimit("R$ 0,00");
  }, [visible, editingCard]);

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
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
        onSaved({ ...editingCard, ...payload });
      } else {
        const created = await creditCardServices.createCreditCard(userId, payload);
        onSaved(created);
      }
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Não foi possível salvar o cartão");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingCard ? "Editar cartão" : "Cadastrar cartão"}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close" size={24} color="#bbb" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Banco *</Text>
                  <TextInput
                    style={styles.input}
                    value={bank}
                    onChangeText={setBank}
                    placeholder="Ex: Nubank"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>4 dígitos finais *</Text>
                  <TextInput
                    style={styles.input}
                    value={last4}
                    onChangeText={(value) =>
                      setLast4(value.replace(/\D/g, "").slice(0, 4))
                    }
                    keyboardType="numeric"
                    placeholder="1234"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Melhor dia *</Text>
                  <TextInput
                    style={styles.input}
                    value={bestDay}
                    onChangeText={(value) => setBestDay(toDayMask(value))}
                    keyboardType="numeric"
                    placeholder="DD"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Vencimento do cartão (MM/AAAA) *
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={cardDueDay}
                    onChangeText={(value) => setCardDueDay(toMonthYearMask(value))}
                    keyboardType="numeric"
                    placeholder="MM/AAAA"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Vencimento da fatura *</Text>
                  <TextInput
                    style={styles.input}
                    value={invoiceDueDay}
                    onChangeText={(value) => setInvoiceDueDay(toDayMask(value))}
                    keyboardType="numeric"
                    placeholder="DD (1 a 28)"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>

                <View style={[styles.inputGroup, styles.lastInputGroup]}>
                  <Text style={styles.inputLabel}>Limite *</Text>
                  <TextInput
                    style={styles.input}
                    value={limit}
                    onChangeText={(value) => setLimit(applyCurrencyMask(value))}
                    keyboardType="numeric"
                    placeholder="R$ 0,00"
                    placeholderTextColor="#777"
                    editable={!saving}
                  />
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingCard ? "Salvar alterações" : "Cadastrar cartão"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    padding: 16,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  inputGroup: { marginBottom: 12 },
  lastInputGroup: { marginBottom: 4 },
  inputLabel: {
    color: "#bbb",
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    backgroundColor: "#121212",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: "#fff", fontWeight: "700" },
});

export default CreditCardFormModal;
