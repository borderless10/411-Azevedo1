import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  visible: boolean;
  dayLabel: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ZeroPlanilhaConfirmModal: React.FC<Props> = ({
  visible,
  dayLabel,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="leaf" size={56} color="#4CAF50" />
          </View>

          <Text style={styles.title}>Dia sem gasto?</Text>
          <Text style={styles.message}>
            Ontem ({dayLabel}) você não registrou gastos. Deseja confirmar zero
            na planilha?
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.cancelLabel}>Ainda não</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmButton, loading && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmLabel}>Confirmar zero</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    backgroundColor: "#0f0f10",
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2d2d2d",
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
  },
  message: {
    color: "#ddd",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    color: "#ddd",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});

export default ZeroPlanilhaConfirmModal;
