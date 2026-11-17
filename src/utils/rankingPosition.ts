/**
 * Posição no ranking: a tela ordena por pontos (desc) e a posição é o
 * índice na lista + 1. Empatados seguem a ordem devolvida pelo Firestore.
 */

export const resolveRankingPosition = (
  orderedUserIds: string[],
  userId?: string | null,
): number | null => {
  if (!userId) return null;
  const index = orderedUserIds.indexOf(userId);
  return index === -1 ? null : index + 1;
};

export const rankingPositionLabel = (
  position?: number | null,
): string | null => {
  if (position == null || !Number.isInteger(position) || position <= 0) {
    return null;
  }
  return String(position);
};

export const rankingPositionFontSize = (
  position?: number | null,
): number => {
  const label = rankingPositionLabel(position);
  if (!label) return 11;
  if (label.length <= 1) return 11;
  if (label.length === 2) return 9;
  return 7;
};
