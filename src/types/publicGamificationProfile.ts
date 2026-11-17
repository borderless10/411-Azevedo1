import type { RankingLeagueId } from "./rankingGamification";

export interface PublicPodiumFinish {
  seasonNumber: number;
  position: 1 | 2 | 3;
  league: RankingLeagueId;
  rankingPoints: number;
}

export interface PublicGamificationProfile {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  league: RankingLeagueId;
  isCouple: boolean;
  currentRankingPoints: number;
  crownsGold: number;
  crownsSilver: number;
  crownsBronze: number;
  podiumFinishes: PublicPodiumFinish[];
  seasonsParticipated: number;
  maxRankingPointsEver: number;
  maxRankingPointsIsPartial: boolean;
  activeBadgeBorderId: string | null;
  activeBadgeIds: string[];
  updatedAt: Date | null;
}
