import type { RankingSeason } from "../types/rankingGamification";

export type CrownPosition = 1 | 2 | 3;

export const CROWN_COLORS: Record<CrownPosition, string> = {
  1: "#e7b958",
  2: "#c0c6d4",
  3: "#cd7f32",
};

export const crownColor = (position: CrownPosition): string =>
  CROWN_COLORS[position];

export const crownLabel = (position: CrownPosition): string =>
  position === 1
    ? "Coroa de ouro"
    : position === 2
      ? "Coroa de prata"
      : "Coroa de bronze";

/**
 * Coroas da temporada: só o pódio da temporada mais recente coroa.
 * Quando o ranking reinicia e uma nova temporada é encerrada, o pódio
 * dela substitui o anterior e as coroas trocam de dono sozinhas.
 * Quem aparece nas duas ligas fica com a melhor posição.
 */
export const buildCrownByUser = (
  seasons: RankingSeason[],
): Map<string, CrownPosition> => {
  const map = new Map<string, CrownPosition>();
  const latest = seasons?.[0];
  if (!latest) return map;
  const entries = [
    ...(latest.podiums?.individual || []),
    ...(latest.podiums?.couple || []),
  ];
  entries.forEach((entry) => {
    if (entry.position !== 1 && entry.position !== 2 && entry.position !== 3) {
      return;
    }
    const position = entry.position as CrownPosition;
    const current = map.get(entry.userId);
    if (!current || position < current) map.set(entry.userId, position);
  });
  return map;
};
