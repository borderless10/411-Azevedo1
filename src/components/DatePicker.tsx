/**
 * DatePicker (JS fallback)
 * - Web: input[type=date] anexado ao document.body + showPicker()
 *   (input solto sem estar no DOM falha, principalmente dentro de Modal)
 * - Native: seletor em Modal
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatDateForDisplay } from "../utils/dateUtils";

interface DatePickerProps {
  label?: string;
  showLabel?: boolean;
  date: Date;
  onChangeDate: (date: Date) => void;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
  editable?: boolean;
  style?: ViewStyle;
}

const toInputValue = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const clampDate = (value: Date, minDate?: Date, maxDate?: Date) => {
  const next = new Date(value);
  next.setHours(12, 0, 0, 0);
  if (minDate) {
    const min = new Date(minDate);
    min.setHours(12, 0, 0, 0);
    if (next < min) return min;
  }
  if (maxDate) {
    const max = new Date(maxDate);
    max.setHours(12, 0, 0, 0);
    if (next > max) return max;
  }
  return next;
};

const DatePicker: React.FC<DatePickerProps> = ({
  label = "Data",
  showLabel = true,
  date,
  onChangeDate,
  error,
  maxDate = new Date(),
  minDate,
  editable = true,
  style,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(date);

  const openWebNativeDateInput = () => {
    if (typeof document === "undefined") {
      setTempDate(clampDate(date, minDate, maxDate));
      setShowPicker(true);
      return;
    }

    const input = document.createElement("input");
    input.type = "date";
    input.value = toInputValue(date);
    if (maxDate) input.max = toInputValue(maxDate);
    if (minDate) input.min = toInputValue(minDate);

    // Crítico: precisa estar no DOM. Sem isso o calendário não abre
    // (ainda mais dentro de Modal do RN Web).
    input.style.position = "fixed";
    input.style.left = "50%";
    input.style.top = "45%";
    input.style.transform = "translate(-50%, -50%)";
    input.style.opacity = "0.01";
    input.style.zIndex = "2147483647";
    input.style.width = "280px";
    input.style.height = "40px";
    input.style.border = "0";
    input.style.padding = "0";
    input.style.margin = "0";
    input.style.background = "transparent";

    // Se o campo está dentro de um Modal (ex.: Renovar Ciclo), o
    // ModalFocusTrap do react-native-web mantém foco preso na subárvore DOM
    // do modal ativo. Como este <input> nativo é anexado fora dela, o foco
    // dado por input.focus() é imediatamente "roubado" de volta pelo modal
    // (ele acha que o foco "escapou"), fechando o seletor de data assim que
    // abre. Anexar dentro do modal ativo (role="dialog") mantém o input
    // "contido" e evita esse roubo de foco.
    const activeDialog = document.querySelector('[role="dialog"]');
    const mountNode = activeDialog || document.body;
    mountNode.appendChild(input);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      try {
        input.remove();
      } catch {
        // ignore
      }
    };

    input.addEventListener("change", () => {
      if (input.value) {
        onChangeDate(
          clampDate(new Date(`${input.value}T12:00:00`), minDate, maxDate),
        );
      }
      cleanup();
    });
    input.addEventListener("cancel", cleanup);
    input.addEventListener("blur", () => {
      setTimeout(cleanup, 500);
    });

    // Foco + showPicker no mesmo gesto do usuário.
    input.focus();
    try {
      if (typeof (input as any).showPicker === "function") {
        (input as any).showPicker();
      } else {
        input.click();
      }
    } catch {
      cleanup();
      // Fallback: seletor custom (também no web).
      setTempDate(clampDate(date, minDate, maxDate));
      setShowPicker(true);
    }
  };

  const handlePress = (event?: any) => {
    if (!editable) return;
    // Evita que o clique suba para overlays de Modal (ex.: Renovar Ciclo)
    // e feche o modal pai no web assim que o calendário abre.
    try {
      event?.stopPropagation?.();
      event?.nativeEvent?.stopPropagation?.();
      event?.preventDefault?.();
    } catch {
      // ignore
    }
    if (Platform.OS === "web") {
      // Defer mínimo: deixa o evento do TouchableOpacity terminar antes
      // de montar o input nativo (senão o overlay pai ainda “ouve” o click).
      setTimeout(() => openWebNativeDateInput(), 0);
      return;
    }
    setTempDate(clampDate(date, minDate, maxDate));
    setShowPicker(true);
  };

  const changeDay = (delta: number) => {
    const d = new Date(tempDate);
    d.setDate(d.getDate() + delta);
    setTempDate(clampDate(d, minDate, maxDate));
  };

  const changeMonth = (delta: number) => {
    const d = new Date(tempDate);
    d.setMonth(d.getMonth() + delta);
    setTempDate(clampDate(d, minDate, maxDate));
  };

  const changeYear = (delta: number) => {
    const d = new Date(tempDate);
    d.setFullYear(d.getFullYear() + delta);
    setTempDate(clampDate(d, minDate, maxDate));
  };

  const handleConfirm = () => {
    setShowPicker(false);
    onChangeDate(clampDate(tempDate, minDate, maxDate));
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempDate(date);
  };

  const pickerBody = (
    <View style={styles.backdrop}>
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={handleCancel}
      />
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Selecionar data</Text>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeDay(-1)}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.pickerText}>{tempDate.getDate()}</Text>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeDay(1)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeMonth(-1)}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.pickerText}>
            {tempDate.toLocaleString(undefined, { month: "long" })}
          </Text>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.pickerRow}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeYear(-1)}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.pickerText}>{tempDate.getFullYear()}</Text>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => changeYear(1)}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalButtonSecondary}
            onPress={handleCancel}
          >
            <Text style={styles.modalButtonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalButtonPrimary}
            onPress={handleConfirm}
          >
            <Text style={styles.modalButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {showLabel ? (
        <Text style={styles.label}>
          <Ionicons name="calendar" size={16} color="#B900FF" /> {label}
        </Text>
      ) : null}

      <TouchableOpacity
        style={[
          styles.inputWrapper,
          error ? styles.inputWrapperError : null,
          !editable ? styles.inputWrapperDisabled : null,
        ]}
        onPress={handlePress}
        disabled={!editable}
      >
        <Ionicons
          name="calendar-outline"
          size={20}
          color={error ? "#FF008A" : "#a89fc0"}
          style={styles.inputIcon}
        />
        <Text style={styles.dateText}>{formatDateForDisplay(date)}</Text>
        {error ? (
          <Ionicons
            name="close-circle"
            size={20}
            color="#FF008A"
            style={styles.icon}
          />
        ) : (
          <Ionicons
            name="chevron-down"
            size={20}
            color="#a89fc0"
            style={styles.icon}
          />
        )}
      </TouchableOpacity>

      {/* Modal próprio — no web só entra como fallback se showPicker falhar */}
      <Modal
        transparent
        animationType="fade"
        visible={showPicker}
        onRequestClose={handleCancel}
      >
        {pickerBody}
      </Modal>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a89fc0",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#21172D",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#21172D",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputWrapperError: {
    borderColor: "#FF008A",
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: "#21172D",
  },
  inputIcon: {
    marginRight: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  icon: {
    marginLeft: 8,
  },
  errorText: {
    color: "#FF008A",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0e0c14",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    zIndex: 2,
  },
  modalTitle: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 12,
    fontWeight: "700",
  },
  pickerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  smallButton: {
    backgroundColor: "#B900FF",
    padding: 8,
    borderRadius: 8,
  },
  pickerText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    marginTop: 16,
    width: "100%",
    justifyContent: "space-between",
  },
  modalButtonPrimary: {
    backgroundColor: "#B900FF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalButtonSecondary: {
    backgroundColor: "#21172D",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default DatePicker;
