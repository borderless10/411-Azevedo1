import {
  BADGE_BORDER_PRESETS,
  BADGE_ICONS,
  type BadgeDefinitionInput,
} from "../types/rankingGamification.ts";

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const grantDocId = (userId: string, badgeId: string): string =>
  `${userId}_${badgeId}`;

export const resolveActiveBorderAfterRevoke = (
  activeBadgeBorderId: string | null | undefined,
  revokedBadgeId: string,
): string | null =>
  activeBadgeBorderId === revokedBadgeId ? null : activeBadgeBorderId || null;

export const validateBadgeDefinitionInput = (
  input: BadgeDefinitionInput,
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!SLUG.test(input.id || "")) errors.push("id inválido");
  if (!input.name?.trim()) errors.push("nome obrigatório");
  if (!input.meaning?.trim()) errors.push("significado obrigatório");
  if (!input.description?.trim()) errors.push("descrição obrigatória");
  if (!(BADGE_ICONS as readonly string[]).includes(input.icon))
    errors.push("ícone não permitido");
  if (!HEX.test(input.primaryColor || "")) errors.push("cor principal inválida");
  if (!HEX.test(input.secondaryColor || ""))
    errors.push("cor secundária inválida");
  if (!(BADGE_BORDER_PRESETS as readonly string[]).includes(input.borderPreset))
    errors.push("borda não permitida");
  return { valid: errors.length === 0, errors };
};
