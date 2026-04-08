import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import MaskedAmount from "./MaskedAmount";

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
        <MaskedAmount value={value as number | string} style={styles.value} />
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
