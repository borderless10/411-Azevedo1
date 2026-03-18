import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  title: string;
  value?: string | number;
  note?: string;
  small?: boolean;
};

export default function DetailCard({ title, value, note, small }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {value !== undefined ? (
        <Text style={[styles.value, { color: colors.text }]}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </Text>
      ) : null}
      {note ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
  },
  note: {
    marginTop: 6,
    fontSize: 13,
  },
});
