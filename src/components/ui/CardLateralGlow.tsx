/**
 * Glow lateral premium — meio-termo entre filete neon e seda suave.
 */

import React, { useId } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type GlowVariant = "purple" | "magenta";

interface CardLateralGlowProps {
  variant?: GlowVariant;
}

const COLORS: Record<
  GlowVariant,
  { core: string; soft: string; edge: string; deep: string }
> = {
  purple: {
    core: "#B900FF",
    soft: "#E6C4FF",
    edge: "#D58BFF",
    deep: "#8B00FF",
  },
  magenta: {
    core: "#FF008A",
    soft: "#FFB3D9",
    edge: "#FF6BC0",
    deep: "#E00078",
  },
};

export const CardLateralGlow: React.FC<CardLateralGlowProps> = ({
  variant = "purple",
}) => {
  const uid = useId().replace(/:/g, "");
  const c = COLORS[variant];
  const mist = `mist-${uid}`;
  const bloom = `bloom-${uid}`;
  const silkBody = `silkBody-${uid}`;
  const silkLine = `silkLine-${uid}`;
  const rim = `rim-${uid}`;

  return (
    <View
      pointerEvents="none"
      style={styles.wrap}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 160"
        preserveAspectRatio="none"
      >
        <Defs>
          {/* Neblina lateral (sem corte seco) */}
          <LinearGradient id={mist} x1="0" y1="0.5" x2="1" y2="0.5">
            <Stop offset="0%" stopColor={c.core} stopOpacity="0.38" />
            <Stop offset="16%" stopColor={c.deep} stopOpacity="0.24" />
            <Stop offset="38%" stopColor={c.soft} stopOpacity="0.09" />
            <Stop offset="62%" stopColor={c.core} stopOpacity="0.02" />
            <Stop offset="100%" stopColor={c.core} stopOpacity="0" />
          </LinearGradient>

          {/* Bloom no meio-baixo da esquerda */}
          <RadialGradient id={bloom} cx="6%" cy="70%" rx="52%" ry="62%">
            <Stop offset="0%" stopColor={c.core} stopOpacity="0.62" />
            <Stop offset="28%" stopColor={c.deep} stopOpacity="0.3" />
            <Stop offset="58%" stopColor={c.soft} stopOpacity="0.1" />
            <Stop offset="100%" stopColor={c.core} stopOpacity="0" />
          </RadialGradient>

          <LinearGradient id={silkBody} x1="0" y1="0.9" x2="0.75" y2="0.15">
            <Stop offset="0%" stopColor={c.core} stopOpacity="0.42" />
            <Stop offset="45%" stopColor={c.soft} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={c.core} stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id={silkLine} x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0%" stopColor={c.edge} stopOpacity="0.7" />
            <Stop offset="50%" stopColor={c.soft} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={c.soft} stopOpacity="0" />
          </LinearGradient>

          <LinearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={c.soft} stopOpacity="0.45" />
            <Stop offset="25%" stopColor={c.edge} stopOpacity="0.9" />
            <Stop offset="60%" stopColor={c.core} stopOpacity="1" />
            <Stop offset="100%" stopColor={c.core} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>

        <Rect x="0" y="0" width="200" height="160" fill={`url(#${mist})`} />
        <Rect x="0" y="0" width="200" height="160" fill={`url(#${bloom})`} />

        {/* Seda / fumaça em S (mais leve) */}
        <Path
          d="M -6 170
             C 22 152, 34 132, 28 108
             C 22 84, 46 72, 60 58
             C 74 44, 70 24, 54 12
             C 76 20, 94 42, 86 66
             C 78 90, 102 104, 118 114
             C 90 128, 44 150, -6 170 Z"
          fill={`url(#${silkBody})`}
          opacity={0.78}
        />

        {/* Fios finos (wispy) */}
        <Path
          d="M 5 148
             C 26 134, 34 116, 28 98
             C 22 80, 44 70, 56 58
             C 68 46, 66 28, 52 16"
          stroke={`url(#${silkLine})`}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          opacity={0.8}
        />
        <Path
          d="M 8 140
             C 24 128, 30 112, 26 96
             C 22 80, 40 72, 50 62
             C 60 52, 62 38, 54 26
             C 72 40, 80 62, 72 80
             C 66 96, 84 106, 98 114"
          stroke={c.soft}
          strokeWidth={1.1}
          fill="none"
          strokeLinecap="round"
          opacity={0.32}
        />
        <Path
          d="M 4 154
             C 20 144, 26 130, 22 116
             C 18 102, 32 94, 42 86"
          stroke={c.edge}
          strokeWidth={0.9}
          fill="none"
          strokeLinecap="round"
          opacity={0.28}
        />

        {/* Filete neon (mais fino, com halo suave) */}
        <Path
          d="M 20 3
             C 11 3, 3.2 9.5, 3.2 20
             L 3.2 140
             C 3.2 150.5, 11 157, 22 157"
          stroke={c.core}
          strokeWidth={5.5}
          fill="none"
          strokeLinecap="round"
          opacity={0.16}
        />
        <Path
          d="M 20 3
             C 11 3, 3.2 9.5, 3.2 20
             L 3.2 140
             C 3.2 150.5, 11 157, 22 157"
          stroke={`url(#${rim})`}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.95}
        />
        <Path
          d="M 20 3
             C 11 3, 3.2 9.5, 3.2 20
             L 3.2 140
             C 3.2 150.5, 11 157, 22 157"
          stroke="#FFFFFF"
          strokeWidth={0.55}
          fill="none"
          strokeLinecap="round"
          opacity={0.28}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    borderRadius: 18,
  },
});

export default CardLateralGlow;
