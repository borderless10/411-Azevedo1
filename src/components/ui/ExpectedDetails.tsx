import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { formatCurrency } from "../../utils/currencyUtils";
import { useTheme } from "../../contexts/ThemeContext";

type Item = {
  label: string;
  value: number;
  percent?: number;
};

const ExpectedDetails: React.FC<{
  items: Item[];
  onSeeMore?: () => void;
}> = ({ items, onSeeMore }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {items && items.length > 0 ? (
        items.map((it, idx) => (
          <View key={it.label + idx} style={styles.row}>
            <Text
              style={[styles.label, { color: colors.text }]}
              numberOfLines={1}
            >
              {it.label}
            </Text>
            <View style={styles.valueWrap}>
              <Text style={[styles.value, { color: colors.text }]}>
                {formatCurrency(it.value)}
              </Text>
              {typeof it.percent === "number" && (
                <Text style={[styles.percent, { color: colors.textSecondary }]}>
                  {" "}
                  ({Math.round(it.percent)}%)
                </Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          Sem detalhes disponíveis
        </Text>
      )}

      {onSeeMore && (
        <TouchableOpacity style={styles.moreButton} onPress={onSeeMore}>
          <Text style={[styles.moreText, { color: colors.primary }]}>
            Ver mais
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 6,
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: { fontSize: 14, color: "#333", flex: 1, marginRight: 8 },
  valueWrap: { flexDirection: "row", alignItems: "center" },
  value: { fontSize: 14, fontWeight: "600", color: "#111" },
  percent: { fontSize: 12, color: "#666", marginLeft: 6 },
  moreButton: { marginTop: 6, alignSelf: "flex-end" },
  moreText: { color: "#8c52ff", fontWeight: "600" },
  empty: { color: "#666", fontSize: 13 },
});

export default ExpectedDetails;
