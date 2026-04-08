import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import MaskedAmount from "./MaskedAmount";

type Props = {
  title: string;
  value: number | string;
  color?: string;
  subtitle?: string;
};

export default function SummaryCard({ title, value, color, subtitle }: Props) {
  const { colors } = useTheme();
  const bgColor = colors.card; // card background
  const border = color || colors.primary;

  return (
    <View
      style={[styles.card, { backgroundColor: bgColor, borderColor: border }]}
    >
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        {title}
      </Text>
      <MaskedAmount value={value} style={styles.value} />
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginHorizontal: 6,
    alignItems: "center",
    minHeight: 110,
    justifyContent: "center",
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 6,
  },
});
