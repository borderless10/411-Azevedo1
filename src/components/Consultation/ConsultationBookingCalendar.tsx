import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { isValidConsultationPreferredDay } from "../../utils/consultationScheduling";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type Props = {
  day: number | null;
  onChangeDay: (day: number) => void;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const sameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export const ConsultationBookingCalendar: React.FC<Props> = ({
  day,
  onChangeDay,
}) => {
  const { colors } = useTheme();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => startOfMonth(today));
  const selectedDay = isValidConsultationPreferredDay(day) ? day : null;

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const lead = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const items: Array<number | null> = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
    while (items.length % 7 !== 0) items.push(null);
    return items;
  }, [cursor]);

  const monthName = cursor.toLocaleDateString("pt-BR", { month: "long" });
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${cursor.getFullYear()}`;

  const shiftMonth = (delta: number) => {
    setCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + delta, 1),
    );
  };

  return (
    <View
      style={[
        styles.calendar,
        { backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => shiftMonth(-1)}
          style={styles.navButton}
          accessibilityLabel="Mês anterior"
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => shiftMonth(1)}
          style={styles.navButton}
          accessibilityLabel="Próximo mês"
        >
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label) => (
          <Text
            key={label}
            style={[styles.weekday, { color: colors.textSecondary }]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (cell === null) {
            return <View key={`empty-${index}`} style={styles.cell} />;
          }
          const selected = selectedDay === cell;
          const isToday =
            sameMonth(cursor, today) && today.getDate() === cell;
          return (
            <TouchableOpacity
              key={`${cursor.getFullYear()}-${cursor.getMonth()}-${cell}`}
              style={styles.cell}
              onPress={() => onChangeDay(cell)}
            >
              <View
                style={[
                  styles.day,
                  selected && { backgroundColor: colors.primary },
                  isToday && !selected && styles.today,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: selected ? "#fff" : colors.text },
                    isToday && !selected && { color: colors.primary },
                  ]}
                >
                  {cell}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendar: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  day: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  today: {
    borderWidth: 1,
    borderColor: "#8c52ff",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ConsultationBookingCalendar;
