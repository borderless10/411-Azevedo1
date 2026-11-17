import type {
  PublicGamificationProfile,
  PublicPodiumFinish,
} from "../types/publicGamificationProfile";
import type { RankingPreference } from "../types/auth";

const safeNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const canOpenPublicGamificationProfile = (
  userId?: string | null,
  rankingPreference?: RankingPreference | null,
): boolean =>
  Boolean(userId) &&
  (rankingPreference === undefined ||
    rankingPreference === null ||
    rankingPreference === "participate");

const mapPodiumFinish = (value: unknown): PublicPodiumFinish | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const seasonNumber = safeNumber(data.seasonNumber);
  const position = safeNumber(data.position);
  if (!seasonNumber || position < 1 || position > 3) return null;
  return {
    seasonNumber,
    position: position as 1 | 2 | 3,
    league: data.league === "couple" ? "couple" : "individual",
    rankingPoints: safeNumber(data.rankingPoints),
  };
};

export type EnsurePublicProfileOutcome =
  | { status: "available"; profile: Record<string, unknown> }
  | { status: "unavailable" };

export const parseEnsurePublicProfileOutcome = (
  value: unknown,
): EnsurePublicProfileOutcome | null => {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.status === "unavailable") return { status: "unavailable" };
  if (
    data.status === "available" &&
    data.profile &&
    typeof data.profile === "object"
  ) {
    return {
      status: "available",
      profile: data.profile as Record<string, unknown>,
    };
  }
  return null;
};

export const mapPublicGamificationProfile = (
  userId: string,
  data: Record<string, unknown>,
): PublicGamificationProfile => ({
  userId,
  displayName: String(data.displayName || "Participante"),
  photoUrl:
    typeof data.photoUrl === "string" && data.photoUrl.trim()
      ? data.photoUrl
      : null,
  league: data.league === "couple" ? "couple" : "individual",
  isCouple: data.isCouple === true,
  currentRankingPoints: safeNumber(data.currentRankingPoints),
  crownsGold: safeNumber(data.crownsGold),
  crownsSilver: safeNumber(data.crownsSilver),
  crownsBronze: safeNumber(data.crownsBronze),
  podiumFinishes: (Array.isArray(data.podiumFinishes)
    ? data.podiumFinishes
    : []
  )
    .map(mapPodiumFinish)
    .filter((entry): entry is PublicPodiumFinish => Boolean(entry)),
  seasonsParticipated: safeNumber(data.seasonsParticipated),
  maxRankingPointsEver: safeNumber(data.maxRankingPointsEver),
  maxRankingPointsIsPartial: data.maxRankingPointsIsPartial !== false,
  activeBadgeBorderId:
    typeof data.activeBadgeBorderId === "string"
      ? data.activeBadgeBorderId
      : null,
  activeBadgeIds: (Array.isArray(data.activeBadgeIds)
    ? data.activeBadgeIds
    : []
  )
    .map(String)
    .filter(Boolean),
  updatedAt:
    data.updatedAt &&
    typeof (data.updatedAt as { toDate?: unknown }).toDate === "function"
      ? (data.updatedAt as { toDate: () => Date }).toDate()
      : null,
});
