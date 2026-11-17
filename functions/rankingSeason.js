export const compareRankingCandidates = (a, b) =>
  b.rankingPoints - a.rankingPoints ||
  String(a.displayName).localeCompare(String(b.displayName), "pt-BR") ||
  String(a.userId).localeCompare(String(b.userId));

export const buildLeaguePodium = (candidates, league) =>
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

export const buildSeasonPodiums = (candidates) => ({
  individual: buildLeaguePodium(candidates, "individual"),
  couple: buildLeaguePodium(candidates, "couple"),
});

export const isAdminUserData = (data) =>
  Boolean(data) && (data.role === "admin" || data.isAdmin === true);

export const isStaffUserData = (data) =>
  Boolean(data) &&
  (data.isAdmin === true ||
    data.role === "admin" ||
    data.role === "consultor" ||
    data.role === "supervisor");

export const userParticipates = (data) => {
  if (!data || data.isActive === false || isStaffUserData(data)) return false;
  if (data.rankingPreference === "participate") return true;
  if (
    data.rankingPreference === "view_only" ||
    data.rankingPreference === "hidden" ||
    data.rankingPreference === "unset"
  ) {
    return false;
  }
  // Legado: antes de rankingPreference, showInRanking=true era participar.
  return data.showInRanking === true;
};

export const displayNameForUser = (userId, data) => {
  if (data?.accountType === "couple") {
    const first = String(data.coupleMember1Name || "").trim();
    const second = String(data.coupleMember2Name || "").trim();
    if (first && second) return `${first} & ${second}`;
    if (first || second) return first || second;
  }
  return String(
    data?.nickname || data?.username || data?.name || data?.email || userId,
  );
};
