import type { RankingSeason } from "../types/rankingGamification";

const formatDateKeyBr = (dateKey: string | null | undefined): string | null => {
  if (!dateKey) return null;
  const parts = dateKey.split("-");
  if (parts.length !== 3) return dateKey;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const nextDayKey = (dateKey: string): string | null => {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCDate(date.getUTCDate() + 1);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/** Ex.: Edição 1 (23/03/2026 a 30/06/2026) */
export const rankingSeasonPeriodLabel = (season: RankingSeason): string => {
  const startKey = season.previousCutoffDateKey
    ? nextDayKey(season.previousCutoffDateKey) || season.previousCutoffDateKey
    : null;
  const start = formatDateKeyBr(startKey);
  const end = formatDateKeyBr(season.cutoffDateKey);
  const period =
    start && end
      ? `${start} a ${end}`
      : end
        ? `até ${end}`
        : "período indefinido";
  return `Edição ${season.seasonNumber} (${period})`;
};
