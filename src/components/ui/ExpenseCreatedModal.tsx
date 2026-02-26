import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../../utils/currencyUtils";

type Props = {
  visible: boolean;
  amount: number;
  onClose: () => void;
  onViewList?: () => void;
  onAddAnother?: () => void;
};

const ExpenseCreatedModal: React.FC<Props> = ({
  visible,
  amount,
  onClose,
  onViewList,
  onAddAnother,
}) => {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#F44336" />
          </View>

          <Text style={styles.title}>Gasto cadastrado</Text>

          <Text style={styles.amount}>{formatCurrency(amount)}</Text>

          <Text style={styles.message}>
            Seu gasto foi registrado com sucesso.
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (onAddAnother) onAddAnother();
              }}
            >
              <Text style={styles.secondaryLabel}>Adicionar outro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => {
                if (onViewList) onViewList();
                else onClose();
              }}
            >
              <Text style={styles.primaryLabel}>Ver gastos</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeRow} onPress={onClose}>
            <Text style={styles.closeText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  container: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0f0f10",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  iconWrap: {
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  amount: {
    fontSize: 22,
    fontWeight: "800",
    color: "#F44336",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: "#ddd",
    textAlign: "center",
    marginBottom: 18,
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#444",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryLabel: {
    color: "#ddd",
    fontWeight: "700",
    fontSize: 16,
  },
  closeRow: {
    marginTop: 12,
  },
  closeText: {
    color: "#999",
    fontSize: 14,
  },
});

export default ExpenseCreatedModal;
