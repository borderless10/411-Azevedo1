/**
 * Card desktop com glow via código (gradients/bordas) — sem PNG decorativo.
 */
import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  desktop,
  desktopGlowAccent,
  type DesktopGlowVariant,
} from "../../theme/desktopTokens";

type Props = {
  children: ReactNode;
  variant?: DesktopGlowVariant;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export const DesktopGlowCard: React.FC<Props> = ({
  children,
  variant = "neutral",
  style,
  contentStyle,
}) => {
  const accent = desktopGlowAccent[variant];
  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: accent.border,
          shadowColor: accent.glow,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={["transparent", accent.soft, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cornerGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[accent.soft, "transparent"]}
        start={{ x: 0.5, y: 1 }}
        end={{ x: 0.5, y: 0.35 }}
        style={styles.bottomGlow}
        pointerEvents="none"
      />
      <View style={[styles.inner, contentStyle]}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: desktop.surface,
    borderRadius: desktop.radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
    ...Platform.select({
      web: {
        boxShadow: "0 0 24px rgba(185,0,255,0.12)",
      } as object,
      default: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 14,
        elevation: 4,
      },
    }),
  },
  cornerGlow: {
    ...StyleSheet.absoluteFill,
    opacity: 0.9,
  },
  bottomGlow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  inner: {
    position: "relative",
    zIndex: 1,
    padding: desktop.space.lg,
  },
});

export default DesktopGlowCard;
