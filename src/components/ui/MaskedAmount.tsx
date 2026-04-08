import React from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { formatCurrency } from "../../utils/currencyUtils";
import { useShowValues } from "../../contexts/ShowValuesContext";
import { useTheme } from "../../contexts/ThemeContext";

type Props = {
  value?: number | string;
  style?: TextStyle | TextStyle[];
  placeholder?: string;
};

export default function MaskedAmount({ value, style, placeholder }: Props) {
  const { showValues } = useShowValues();
  const { colors } = useTheme();

  if (value === undefined || value === null) return null;

  const formatted = typeof value === "number" ? formatCurrency(value) : value;

  if (!showValues) {
    return (
      <Text style={[styles.mask, style, { color: colors.text }]}>
        {placeholder ?? "R$ •••"}
      </Text>
    );
  }

  return (
    <Text style={[styles.value, style, { color: colors.text }]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  value: {
    fontSize: 16,
    fontWeight: "800",
  },
  mask: {
    fontSize: 16,
    fontWeight: "800",
    opacity: 0.7,
  },
});
