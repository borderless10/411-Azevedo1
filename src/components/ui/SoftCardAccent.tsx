/**
 * Acento visual mínimo nos cards — só código (gradiente), sem PNG neon.
 * Substitui CardWaveBg na Home para um look mais suave.
 */
import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type SoftCardTone = "purple" | "magenta" | "neutral";

type Props = {
  tone?: SoftCardTone;
  /** 0–1; default bem baixo pra não “gritar”. */
  intensity?: number;
  /** `filled` = fundo gradiente mais presente (ações rápidas). */
  strength?: "subtle" | "filled";
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
};

const TONES: Record<
  SoftCardTone,
  { soft: string; edge: string; mid: string; fillA: string; fillB: string }
> = {
  purple: {
    soft: "rgba(185,0,255,0.10)",
    edge: "rgba(185,0,255,0.04)",
    mid: "rgba(185,0,255,0.07)",
    fillA: "rgba(185,0,255,0.14)",
    fillB: "rgba(88,20,140,0.36)",
  },
  magenta: {
    soft: "rgba(255,0,138,0.09)",
    edge: "rgba(255,0,138,0.035)",
    mid: "rgba(255,0,138,0.06)",
    fillA: "rgba(255,0,138,0.13)",
    fillB: "rgba(110,10,70,0.34)",
  },
  neutral: {
    soft: "rgba(164,122,255,0.07)",
    edge: "rgba(164,122,255,0.03)",
    mid: "rgba(164,122,255,0.05)",
    fillA: "rgba(164,122,255,0.11)",
    fillB: "rgba(50,30,90,0.32)",
  },
};

export const SoftCardAccent: React.FC<Props> = ({
  tone = "purple",
  intensity = 0.55,
  strength = "subtle",
  style,
  borderRadius = 14,
}) => {
  const colors = TONES[tone];
  const opacity = Math.max(0.2, Math.min(1, intensity));

  if (strength === "filled") {
    return (
      <View
        pointerEvents="none"
        style={[styles.wrap, { borderRadius, opacity }, style]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <LinearGradient
          colors={[colors.fillB, colors.fillA, "rgba(10,8,18,0.35)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        />
        <LinearGradient
          colors={["transparent", colors.fillA]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.bottom}
        />
      </View>
    );
  }

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { borderRadius, opacity }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={["transparent", colors.edge, colors.soft]}
        locations={[0, 0.45, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      />
      <LinearGradient
        colors={[colors.mid, "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.4 }}
        style={styles.bottom}
      />
    </View>
  );
};

/** Mapeia variantes antigas do CardWaveBg → tom suave. */
export const softToneFromWaveVariant = (
  variant?: string | null,
): SoftCardTone => {
  const key = String(variant || "").toLowerCase();
  if (
    key.includes("magenta") ||
    key.includes("expense") ||
    key.includes("red")
  ) {
    return "magenta";
  }
  if (key.includes("wide") || key.includes("spark") || key.includes("square")) {
    return "neutral";
  }
  return "purple";
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  fill: {
    ...StyleSheet.absoluteFill,
  },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "48%",
  },
});

export default SoftCardAccent;
