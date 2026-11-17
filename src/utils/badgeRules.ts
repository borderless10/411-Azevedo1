import {
  BADGE_BORDER_PRESETS,
  BADGE_ICONS,
  type BadgeDefinition,
  type BadgeDefinitionInput,
} from "../types/rankingGamification.ts";

const HEX = /^#[0-9a-fA-F]{6}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const grantDocId = (userId: string, badgeId: string): string =>
  `${userId}_${badgeId}`;

/**
 * Anel em volta da foto: só a borda ativa escolhida pelo usuário.
 * Borda padrão (sem borda ativa) significa anel padrão, mesmo que o
 * usuário tenha insígnias concedidas.
 */
export const resolveAvatarRingDefinition = (
  activeBorderDefinition: BadgeDefinition | null | undefined,
): BadgeDefinition | null => activeBorderDefinition || null;

/**
 * Selo no canto inferior direito da foto: prefere a insígnia da borda
 * ativa e, sem borda ativa, usa a primeira da lista de concedidas.
 */
export const resolveAvatarBadgeDefinition = (
  activeBorderDefinition: BadgeDefinition | null | undefined,
  grantedBadges: readonly BadgeDefinition[] | null | undefined,
): BadgeDefinition | null =>
  activeBorderDefinition || grantedBadges?.[0] || null;

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

export const decideBadgeRemoval = ({
  isOfficial,
  hasGrantHistory,
}: {
  isOfficial: boolean;
  hasGrantHistory: boolean;
}): "reject" | "archive" | "delete" => {
  if (isOfficial) return "reject";
  if (hasGrantHistory) return "archive";
  return "delete";
};
