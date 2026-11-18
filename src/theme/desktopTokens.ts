/**
 * Tokens da composição desktop Visão (software financeiro, não app esticado).
 */
import { premium } from "./visaoPremium";

export const desktop = {
  bg: premium.bg,
  surface: "#12101A",
  surfaceElevated: "#1A1626",
  surfaceHover: "#221C30",
  purple: premium.purple,
  magenta: premium.magenta,
  cyan: "#3D9BFF",
  success: "#34D399",
  danger: "#F87171",
  text: premium.text,
  textSecondary: premium.textSecondary,
  textMuted: "#7A7488",
  border: "rgba(190,130,255,0.18)",
  borderStrong: "rgba(185,0,255,0.4)",
  glowPurple: "rgba(185,0,255,0.22)",
  glowMagenta: "rgba(255,0,138,0.2)",
  glowCyan: "rgba(61,155,255,0.18)",
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  sidebarWidth: 248,
  /** Trilho colapsado (só ícones) no desktop web. */
  sidebarRailWidth: 72,
  headerHeight: 56,
  pagePadX: 28,
  pagePadY: 20,
} as const;

export type DesktopGlowVariant =
  | "income"
  | "expense"
  | "savings"
  | "balance"
  | "neutral"
  | "magenta";

export const desktopGlowAccent: Record<
  DesktopGlowVariant,
  { border: string; glow: string; soft: string }
> = {
  income: {
    border: "rgba(185,0,255,0.28)",
    glow: "rgba(185,0,255,0.1)",
    soft: "rgba(185,0,255,0.07)",
  },
  expense: {
    border: "rgba(255,0,138,0.28)",
    glow: "rgba(255,0,138,0.09)",
    soft: "rgba(255,0,138,0.06)",
  },
  savings: {
    border: "rgba(164,122,255,0.26)",
    glow: "rgba(164,122,255,0.08)",
    soft: "rgba(164,122,255,0.05)",
  },
  balance: {
    border: "rgba(61,155,255,0.26)",
    glow: "rgba(61,155,255,0.08)",
    soft: "rgba(61,155,255,0.05)",
  },
  neutral: {
    border: desktop.border,
    glow: "rgba(255,255,255,0.03)",
    soft: "rgba(255,255,255,0.02)",
  },
  magenta: {
    border: "rgba(255,0,138,0.28)",
    glow: "rgba(255,0,138,0.09)",
    soft: "rgba(255,0,138,0.06)",
  },
};
