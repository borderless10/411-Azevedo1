import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DECIMAL_INPUT_KEYBOARD,
  parseCurrency,
  sanitizeDecimalInput,
} from "../../utils/currencyUtils";

type Props = {
  visible: boolean;
  dayLabel: string;
  loading?: boolean;
  onConfirmZero: () => void;
  onConfirmExpense: (amount: number) => void;
  onCancel: () => void;
};

const ZeroPlanilhaConfirmModal: React.FC<Props> = ({
  visible,
  dayLabel,
  loading = false,
  onConfirmZero,
  onConfirmExpense,
  onCancel,
}) => {
  const [step, setStep] = useState<"question" | "amount">("question");
  const [amountText, setAmountText] = useState("");
  const [amountError, setAmountError] = useState("");

  useEffect(() => {
    if (visible) {
      setStep("question");
      setAmountText("");
      setAmountError("");
    }
  }, [visible, dayLabel]);

  const handleSaveExpense = () => {
    const amount = parseCurrency(amountText);
    if (amount <= 0) {
      setAmountError("");
      onConfirmZero();
      return;
    }
    setAmountError("");
    onConfirmExpense(amount);
  };

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={step === "question" ? "help-circle" : "cash"}
              size={56}
              color="#8c52ff"
            />
          </View>

          {step === "question" ? (
            <>
              <Text style={styles.title}>Houve gasto?</Text>
              <Text style={styles.message}>
                No dia {dayLabel} você não registrou gastos na planilha.
              </Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.noButton, loading && styles.buttonDisabled]}
                  onPress={onConfirmZero}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.noLabel}>Não</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.yesButton, loading && styles.buttonDisabled]}
                  onPress={() => setStep("amount")}
                  disabled={loading}
                >
                  <Text style={styles.yesLabel}>Sim</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={onCancel}
                disabled={loading}
              >
                <Text style={styles.dismissLabel}>Agora não</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Qual foi o gasto?</Text>
              <Text style={styles.message}>
                Informe o valor gasto no dia {dayLabel}. Use 0 para registrar
                zero na planilha.
              </Text>

              <TextInput
                style={[styles.input, amountError ? styles.inputError : null]}
                value={amountText}
                onChangeText={(text) => {
                  setAmountText(sanitizeDecimalInput(text));
                  if (amountError) setAmountError("");
                }}
                placeholder="0,00"
                placeholderTextColor="#6b6480"
                keyboardType={DECIMAL_INPUT_KEYBOARD}
                autoFocus
              />
              {amountError ? (
                <Text style={styles.errorText}>{amountError}</Text>
              ) : null}

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.noButton, loading && styles.buttonDisabled]}
                  onPress={() => {
                    setStep("question");
                    setAmountError("");
                  }}
                  disabled={loading}
                >
                  <Text style={styles.noLabel}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.yesButton, loading && styles.buttonDisabled]}
                  onPress={handleSaveExpense}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.yesLabel}>Salvar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#0e0c14",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2040",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 10,
  },
  iconWrap: {
    marginBottom: 10,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    color: "#a89fc0",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#1a1528",
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 10,
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputError: {
    borderColor: "#ff4d6d",
  },
  errorText: {
    color: "#ff4d6d",
    fontSize: 13,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  noButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  noLabel: {
    color: "#a89fc0",
    fontSize: 15,
    fontWeight: "700",
  },
  yesButton: {
    flex: 1,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  yesLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  dismissButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  dismissLabel: {
    color: "#6b6480",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default ZeroPlanilhaConfirmModal;
