import type {
  HistoricalPodiumEntry,
  RankingLeagueId,
} from "../types/rankingGamification";

export type PodiumCandidate = {
  userId: string;
  displayName: string;
  rankingPoints: number;
  league: RankingLeagueId;
  photoUrl?: string | null;
};

export const compareRankingCandidates = (
  a: PodiumCandidate,
  b: PodiumCandidate,
): number =>
  b.rankingPoints - a.rankingPoints ||
  a.displayName.localeCompare(b.displayName, "pt-BR") ||
  a.userId.localeCompare(b.userId);

export const buildLeaguePodium = (
  candidates: PodiumCandidate[],
  league: RankingLeagueId,
): HistoricalPodiumEntry[] =>
  candidates
    .filter((entry) => entry.league === league)
    .sort(compareRankingCandidates)
    .slice(0, 3)
    .map((entry, index) => ({
      position: index + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      rankingPoints: entry.rankingPoints,
      league,
      photoUrl: entry.photoUrl || null,
    }));

export const buildSeasonPodiums = (
  candidates: PodiumCandidate[],
): Record<RankingLeagueId, HistoricalPodiumEntry[]> => ({
  individual: buildLeaguePodium(candidates, "individual"),
  couple: buildLeaguePodium(candidates, "couple"),
});
