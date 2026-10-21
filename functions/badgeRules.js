export const BADGE_BORDER_PRESETS = [
  "double-violet",
  "split-violet-blue",
  "metal-corners",
  "asymmetric-spark",
  "cold-metal",
  "halo-beacon",
  "gold-legacy",
  "solid-violet",
  "solid-gold",
  "solid-silver",
  "solid-turquoise",
  "solid-coral",
];

export const BADGE_ICONS = [
  "shield-checkmark",
  "scale",
  "lock-closed",
  "key",
  "diamond",
  "flashlight",
  "eye",
  "trophy",
  "medal",
  "flame",
  "star",
  "ribbon",
  "sparkles",
  "heart",
];

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const grantDocId = (userId, badgeId) => `${userId}_${badgeId}`;

export const resolveActiveBorderAfterRevoke = (activeBadgeBorderId, revokedBadgeId) =>
  activeBadgeBorderId === revokedBadgeId ? null : activeBadgeBorderId || null;

export const validateBadgeDefinitionInput = (input = {}) => {
  const errors = [];
  if (!SLUG.test(String(input.id || ""))) errors.push("id inválido");
  if (!String(input.name || "").trim()) errors.push("nome obrigatório");
  if (!String(input.meaning || "").trim()) errors.push("significado obrigatório");
  if (!String(input.description || "").trim()) errors.push("descrição obrigatória");
  if (!BADGE_ICONS.includes(input.icon)) errors.push("ícone não permitido");
  if (!HEX.test(String(input.primaryColor || ""))) errors.push("cor principal inválida");
  if (!HEX.test(String(input.secondaryColor || ""))) errors.push("cor secundária inválida");
  if (!BADGE_BORDER_PRESETS.includes(input.borderPreset)) errors.push("borda não permitida");
  return { valid: errors.length === 0, errors };
};
