import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { isValidConsultationPreferredDay } from "../../utils/consultationScheduling";

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

type Props = {
  day: number | null;
  onChangeDay: (day: number) => void;
  style?: ViewStyle;
};

export const ConsultationPreferredDayPicker: React.FC<Props> = ({
  day,
  onChangeDay,
  style,
}) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selectedDay = isValidConsultationPreferredDay(day) ? day : null;

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: colors.inputBackground,
            borderColor: colors.border,
          },
        ]}
        onPress={() => setOpen(true)}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={[styles.triggerText, { color: colors.text }]}>
          {selectedDay ? `Dia ${selectedDay}` : "Selecionar dia do mês"}
        </Text>
        <Text style={[styles.triggerHint, { color: colors.textSecondary }]}>
          do mês
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.backdrop}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Melhor dia do mês
            </Text>
            <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
              Escolha o dia fixo sugerido para agendar a consultoria.
            </Text>
            <FlatList
              data={DAYS}
              keyExtractor={(item) => String(item)}
              numColumns={7}
              columnWrapperStyle={styles.dayRow}
              contentContainerStyle={styles.dayGrid}
              renderItem={({ item }) => {
                const active = selectedDay === item;
                return (
                  <TouchableOpacity
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.inputBackground,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      onChangeDay(item);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dayCellText,
                        { color: active ? "#fff" : colors.text },
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.closeButton, { borderColor: colors.border }]}
              onPress={() => setOpen(false)}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  triggerHint: {
    fontSize: 13,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  dayGrid: {
    gap: 8,
  },
  dayRow: {
    gap: 8,
    marginBottom: 8,
  },
  dayCell: {
    flex: 1,
    minWidth: 36,
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellText: {
    fontSize: 14,
    fontWeight: "700",
  },
  closeButton: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeButtonText: {
    fontWeight: "600",
  },
});

export default ConsultationPreferredDayPicker;
