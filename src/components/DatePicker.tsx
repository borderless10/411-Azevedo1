/**
 * DatePicker (JS fallback)
 * - Web: input[type=date] anexado ao document.body + showPicker()
 *   (input solto sem estar no DOM falha, principalmente dentro de Modal)
 * - Native: seletor em Modal
 */

import React, { useMemo, useState } from "react";
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
import { useDesktopWeb } from "../utils/desktopWeb";

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

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

const atNoon = (value: Date) => {
  const next = new Date(value);
  next.setHours(12, 0, 0, 0);
  return next;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isOutOfRange = (day: Date, minDate?: Date, maxDate?: Date) => {
  const noon = atNoon(day);
  if (minDate && noon < atNoon(minDate)) return true;
  if (maxDate && noon > atNoon(maxDate)) return true;
  return false;
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
  const isDesktop = useDesktopWeb();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(date);
  const [cursor, setCursor] = useState<Date>(date);

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
      openCalendarModal();
    }
  };

  const openCalendarModal = () => {
    const next = clampDate(date, minDate, maxDate);
    setTempDate(next);
    setCursor(next);
    setShowPicker(true);
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
    if (Platform.OS === "web" && isDesktop) {
      // Defer mínimo: deixa o evento do TouchableOpacity terminar antes
      // de montar o input nativo (senão o overlay pai ainda “ouve” o click).
      setTimeout(() => openWebNativeDateInput(), 0);
      return;
    }
    openCalendarModal();
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1, 12);
    const monthEnd = new Date(next.getFullYear(), next.getMonth() + 1, 0, 12);
    if (delta > 0 && maxDate && atNoon(next) > atNoon(maxDate)) return;
    if (delta < 0 && minDate && atNoon(monthEnd) < atNoon(minDate)) return;
    setCursor(next);
  };

  const monthLabel = useMemo(() => {
    const label = cursor.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [cursor]);

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<Date | null> = Array.from(
      { length: firstWeekday },
      () => null,
    );
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day, 12));
    }
    return cells;
  }, [cursor]);

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
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleCancel}
      />
      <View style={styles.modalContainer}>
        <Text style={styles.modalTitle}>Selecionar data</Text>

        <View style={styles.monthHeader}>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => shiftMonth(-1)}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => shiftMonth(1)}
          >
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((label, index) => (
            <Text key={`${label}-${index}`} style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarCells.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }
            const disabled = isOutOfRange(day, minDate, maxDate);
            const selected = isSameDay(day, tempDate);
            const today = isSameDay(day, new Date());
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={styles.dayCell}
                disabled={disabled}
                onPress={() => setTempDate(atNoon(day))}
              >
                <View
                  style={[
                    styles.dayBubble,
                    selected && styles.dayBubbleSelected,
                    today && !selected && styles.dayBubbleToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.dayTextSelected,
                      disabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
  monthHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  smallButton: {
    backgroundColor: "#B900FF",
    padding: 8,
    borderRadius: 8,
  },
  weekRow: {
    width: "100%",
    flexDirection: "row",
  },
  weekday: {
    width: "14.28%",
    textAlign: "center",
    color: "#a89fc0",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  daysGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBubbleSelected: {
    backgroundColor: "#B900FF",
  },
  dayBubbleToday: {
    borderWidth: 1,
    borderColor: "rgba(185,0,255,0.7)",
  },
  dayText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
    includeFontPadding: false,
  },
  dayTextSelected: {
    color: "#fff",
    fontWeight: "800",
  },
  dayTextDisabled: {
    color: "rgba(255,255,255,0.28)",
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
