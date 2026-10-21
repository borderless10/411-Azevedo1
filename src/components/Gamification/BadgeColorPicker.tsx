import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const QUICK = [
  "#8c52ff",
  "#c084fc",
  "#4f8ff7",
  "#16b8a6",
  "#e7b958",
  "#ff6b5e",
  "#4b5563",
  "#d7dde8",
  "#1f3a93",
  "#ffffff",
];

const hslToHex = (hue: number, saturation: number, lightness: number): string => {
  const s = saturation / 100;
  const l = lightness / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x];
  const channel = (value: number) =>
    Math.round((value + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
};

export const BadgeColorPicker = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) => {
  const matrix = useMemo(
    () =>
      [0, 40, 80, 140, 200, 260, 310].flatMap((hue) =>
        [42, 62].map((lightness) => hslToHex(hue, 70, lightness)),
      ),
    [],
  );
  const colors = [...QUICK, ...matrix.filter((color) => !QUICK.includes(color))];

  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrap}>
        {colors.map((color) => {
          const selected = value.toLowerCase() === color.toLowerCase();
          return (
            <TouchableOpacity
              key={`${label}-${color}`}
              accessibilityLabel={`${label} ${color}`}
              onPress={() => onChange(color)}
              style={[
                styles.swatch,
                { backgroundColor: color },
                selected && styles.selected,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: { marginBottom: 8 },
  label: { color: "#aaa", fontSize: 12, fontWeight: "700", marginBottom: 8 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  selected: { borderWidth: 3, borderColor: "#fff" },
});
