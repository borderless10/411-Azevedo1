export const RANKING_CACHE_VERSION = 1;
export const RANKING_CACHE_ROW_LIMIT = 200;
export const RANKING_CACHE_TTL_MS = 10 * 60 * 1000;

export type RankingCacheRecord<T> = {
  version: number;
  league: string;
  cutoffDateKey: string | null;
  fetchedAt: number;
  rows: T[];
};

export const rankingCacheKey = (league: string): string =>
  `@visao/ranking-cache/v1/${league}`;

export const prepareRankingCache = <T>(
  league: string,
  cutoffDateKey: string | null,
  rows: T[],
  fetchedAt = Date.now(),
): RankingCacheRecord<T> => ({
  version: RANKING_CACHE_VERSION,
  league,
  cutoffDateKey,
  fetchedAt,
  rows: rows.slice(0, RANKING_CACHE_ROW_LIMIT),
});

export const acceptRankingCache = <T>(
  value: unknown,
  league: string,
): RankingCacheRecord<T> | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as RankingCacheRecord<T>;
  if (record.version !== RANKING_CACHE_VERSION) return null;
  if (record.league !== league || !Array.isArray(record.rows)) return null;
  return record;
};

export const rankingRowsChanged = (
  current: { userId: string; zeroDays: number; photoUrl?: string | null }[],
  next: { userId: string; zeroDays: number; photoUrl?: string | null }[],
): boolean => {
  if (current.length !== next.length) return true;
  return current.some(
    (row, index) =>
      row.userId !== next[index]?.userId ||
      row.zeroDays !== next[index]?.zeroDays ||
      (row.photoUrl || "") !== (next[index]?.photoUrl || ""),
  );
};

export const isRankingCacheExpired = (
  record: { fetchedAt: number },
  now = Date.now(),
): boolean => now - record.fetchedAt > RANKING_CACHE_TTL_MS;
