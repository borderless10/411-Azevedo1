import { userParticipates } from "./rankingSeason.js";

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizePodium = (entry) => ({
  seasonNumber: safeNumber(entry?.seasonNumber),
  position: safeNumber(entry?.position),
  league: entry?.league === "couple" ? "couple" : "individual",
  rankingPoints: safeNumber(entry?.rankingPoints),
});

const publicDisplayNameForUser = (user) => {
  if (user?.accountType === "couple") {
    const first = String(user.coupleMember1Name || "").trim();
    const second = String(user.coupleMember2Name || "").trim();
    if (first && second) return `${first} & ${second}`;
    if (first || second) return first || second;
  }
  return (
    String(user?.nickname || user?.username || user?.name || "").trim() ||
    "Participante"
  );
};

export const podiumHistoryFromSeasons = (userId, seasons) =>
  (Array.isArray(seasons) ? seasons : [])
    .flatMap((season) =>
      ["individual", "couple"].flatMap((league) =>
        (Array.isArray(season?.podiums?.[league])
          ? season.podiums[league]
          : []
        )
          .filter((entry) => String(entry?.userId || "") === userId)
          .map((entry) =>
            normalizePodium({
              ...entry,
              seasonNumber: season.seasonNumber,
              league,
            }),
          ),
      ),
    )
    .sort((a, b) => a.seasonNumber - b.seasonNumber);

export const mergeSeasonAchievement = (profile, podiumEntry) => {
  const normalized = podiumEntry ? normalizePodium(podiumEntry) : null;
  const podiumFinishes = Array.isArray(profile?.podiumFinishes)
    ? profile.podiumFinishes.map(normalizePodium)
    : [];
  const seasonNumbersParticipated = Array.isArray(
    profile?.seasonNumbersParticipated,
  )
    ? profile.seasonNumbersParticipated.map(safeNumber).filter(Boolean)
    : podiumFinishes.map((entry) => entry.seasonNumber);
  const alreadyRecorded =
    normalized &&
    seasonNumbersParticipated.includes(normalized.seasonNumber);
  if (alreadyRecorded) return profile;
  const hasPodium =
    normalized && normalized.position >= 1 && normalized.position <= 3;

  return {
    ...profile,
    seasonsParticipated: safeNumber(profile?.seasonsParticipated) + 1,
    seasonNumbersParticipated: normalized
      ? [...seasonNumbersParticipated, normalized.seasonNumber]
      : seasonNumbersParticipated,
    crownsGold:
      safeNumber(profile?.crownsGold) +
      (normalized?.position === 1 ? 1 : 0),
    crownsSilver:
      safeNumber(profile?.crownsSilver) +
      (normalized?.position === 2 ? 1 : 0),
    crownsBronze:
      safeNumber(profile?.crownsBronze) +
      (normalized?.position === 3 ? 1 : 0),
    podiumFinishes: hasPodium
      ? [...podiumFinishes, normalized]
      : podiumFinishes,
  };
};

export const buildPublicGamificationProfile = ({
  userId,
  user,
  snapshot = {},
  activeBadgeIds = [],
  existing = {},
  podiumFinishes,
}) => {
  if (!userId || !userParticipates(user)) return null;

  const currentRankingPoints = safeNumber(snapshot?.rankingPoints);
  // Quando podiumFinishes vem da reconstrução pelas edições atuais,
  // ele é a fonte da verdade (purge/histórico). Sem isso, Math.max
  // com o perfil antigo impede as coroas de baixarem após apagar edições.
  const historyIsAuthoritative = Array.isArray(podiumFinishes);
  const history = historyIsAuthoritative
    ? podiumFinishes.map(normalizePodium)
    : Array.isArray(existing?.podiumFinishes)
      ? existing.podiumFinishes.map(normalizePodium)
      : [];
  const crowns = history.reduce(
    (counts, entry) => {
      if (entry.position === 1) counts.gold += 1;
      if (entry.position === 2) counts.silver += 1;
      if (entry.position === 3) counts.bronze += 1;
      return counts;
    },
    { gold: 0, silver: 0, bronze: 0 },
  );
  const podiumMaximum = history.reduce(
    (maximum, entry) => Math.max(maximum, entry.rankingPoints),
    0,
  );
  const seasonNumbersFromHistory = [
    ...new Set(history.map((entry) => entry.seasonNumber)),
  ]
    .map(safeNumber)
    .filter(Boolean);

  return {
    displayName: publicDisplayNameForUser(user),
    photoUrl:
      typeof user?.photoUrl === "string" && user.photoUrl.trim()
        ? user.photoUrl.trim()
        : null,
    league:
      snapshot?.league === "couple" || user?.accountType === "couple"
        ? "couple"
        : "individual",
    isCouple: user?.accountType === "couple",
    currentRankingPoints,
    crownsGold: historyIsAuthoritative
      ? crowns.gold
      : Math.max(safeNumber(existing?.crownsGold), crowns.gold),
    crownsSilver: historyIsAuthoritative
      ? crowns.silver
      : Math.max(safeNumber(existing?.crownsSilver), crowns.silver),
    crownsBronze: historyIsAuthoritative
      ? crowns.bronze
      : Math.max(safeNumber(existing?.crownsBronze), crowns.bronze),
    podiumFinishes: history,
    seasonsParticipated: historyIsAuthoritative
      ? seasonNumbersFromHistory.length
      : Math.max(
          safeNumber(existing?.seasonsParticipated),
          history.length,
        ),
    seasonNumbersParticipated: historyIsAuthoritative
      ? seasonNumbersFromHistory
      : [
          ...new Set([
            ...(Array.isArray(existing?.seasonNumbersParticipated)
              ? existing.seasonNumbersParticipated
              : []),
            ...history.map((entry) => entry.seasonNumber),
          ]),
        ]
          .map(safeNumber)
          .filter(Boolean),
    maxRankingPointsEver: historyIsAuthoritative
      ? Math.max(currentRankingPoints, podiumMaximum)
      : Math.max(
          safeNumber(existing?.maxRankingPointsEver),
          currentRankingPoints,
          podiumMaximum,
        ),
    maxRankingPointsIsPartial: existing?.maxRankingPointsIsPartial !== false,
    activeBadgeBorderId:
      typeof user?.activeBadgeBorderId === "string"
        ? user.activeBadgeBorderId
        : null,
    activeBadgeIds: [
      ...new Set(
        (Array.isArray(activeBadgeIds) ? activeBadgeIds : [])
          .map(String)
          .filter(Boolean),
      ),
    ],
  };
};
