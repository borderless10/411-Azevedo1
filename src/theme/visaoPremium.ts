/**
 * Tokens visuais Premium Visão (referência Home · novembro/2026).
 * Fonte única para tema dark e componentes compartilhados.
 */

export const premium = {
  bg: "#07050D",
  surface: "#171321",
  surfaceElevated: "#21172D",
  purple: "#B900FF",
  purpleBright: "#8B00FF",
  purpleSoft: "#8c52ff",
  magenta: "#FF008A",
  magentaSoft: "#ff4d6d",
  text: "#F8F7FC",
  textSecondary: "#AAA5B5",
  border: "rgba(190,130,255,0.25)",
  borderStrong: "rgba(185,0,255,0.45)",
  glowPurple: "rgba(185,0,255,0.35)",
  glowMagenta: "rgba(255,0,138,0.32)",
  chart: ["#B900FF", "#FF008A", "#FF8A3D", "#3D9BFF", "#A47AFF", "#FF6B8A"],
} as const;

/** Aliases de hex legados → tokens premium (migração visual do app). */
export const legacyColorMap: Record<string, string> = {
  "#000": premium.bg,
  "#000000": premium.bg,
  "#0a0a0a": premium.bg,
  "#07050d": premium.bg,
  "#121212": premium.bg,
  "#0f0f0f": premium.bg,
  "#1a1a1a": premium.surface,
  "#161616": premium.surface,
  "#14101f": premium.surface,
  "#1a1528": premium.surface,
  "#1a1525": premium.surface,
  "#151020": premium.surface,
  "#2a2a2a": premium.surfaceElevated,
  "#2a2040": premium.surfaceElevated,
  "#333333": premium.surfaceElevated,
  "#333": premium.surfaceElevated,
  "#3a3a3a": premium.surfaceElevated,
  "#8c52ff": premium.purple,
  "#ff4d6d": premium.magenta,
};

export const premiumCardShadow = {
  shadowColor: premium.purple,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 16,
  elevation: 6,
} as const;
