/**
 * DatePicker (JS fallback) — works on web (input[type=date]) and mobile (modal selector)
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
  date: Date;
  onChangeDate: (date: Date) => void;
  error?: string;
  maxDate?: Date;
  minDate?: Date;
  editable?: boolean;
  style?: ViewStyle;
}

const DatePicker: React.FC<DatePickerProps> = ({
  label = "Data",
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

  const handlePress = () => {
    if (!editable) return;

    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "date";
      input.value = date.toISOString().split("T")[0];

      if (maxDate) input.max = maxDate.toISOString().split("T")[0];
      if (minDate) input.min = minDate.toISOString().split("T")[0];

      input.onchange = (e: any) => {
        const selectedDate = new Date(e.target.value + "T12:00:00");
        onChangeDate(selectedDate);
      };

      input.click();
      return;
    }

    setTempDate(date);
    setShowPicker(true);
  };

  const changeDay = (delta: number) => {
    const d = new Date(tempDate);
    d.setDate(d.getDate() + delta);
    setTempDate(d);
  };

  const changeMonth = (delta: number) => {
    const d = new Date(tempDate);
    d.setMonth(d.getMonth() + delta);
    setTempDate(d);
  };

  const changeYear = (delta: number) => {
    const d = new Date(tempDate);
    d.setFullYear(d.getFullYear() + delta);
    setTempDate(d);
  };

  const handleConfirm = () => {
    setShowPicker(false);
    onChangeDate(tempDate);
  };

  const handleCancel = () => {
    setShowPicker(false);
    setTempDate(date);
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label}>
        <Ionicons name="calendar" size={16} color="#007AFF" /> {label}
      </Text>

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
          color={error ? "#F44336" : "#999"}
          style={styles.inputIcon}
        />
        <Text style={styles.dateText}>{formatDateForDisplay(date)}</Text>
        {error ? (
          <Ionicons
            name="close-circle"
            size={20}
            color="#F44336"
            style={styles.icon}
          />
        ) : (
          <Ionicons
            name="chevron-down"
            size={20}
            color="#999"
            style={styles.icon}
          />
        )}
      </TouchableOpacity>

      {showPicker && Platform.OS !== "web" ? (
        <Modal transparent animationType="fade" visible={showPicker}>
          <View style={styles.backdrop}>
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
        </Modal>
      ) : null}

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
    color: "#ddd",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2b2b2b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputWrapperError: {
    borderColor: "#F44336",
    borderWidth: 2,
  },
  inputWrapperDisabled: {
    backgroundColor: "#111",
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
    color: "#F44336",
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
    backgroundColor: "#0f0f10",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
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
    backgroundColor: "#007AFF",
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
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  modalButtonSecondary: {
    backgroundColor: "#444",
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
