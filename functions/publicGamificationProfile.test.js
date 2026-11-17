import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPublicGamificationProfile,
  mergeSeasonAchievement,
  podiumHistoryFromSeasons,
} from "./publicGamificationProfile.js";

test("perfil público contém somente campos seguros e marca máximo parcial", () => {
  const profile = buildPublicGamificationProfile({
    userId: "u1",
    user: {
      name: "Ana",
      email: "privado@example.com",
      phone: "11999999999",
      rankingPreference: "participate",
      photoUrl: "https://example.com/a.jpg",
      activeBadgeBorderId: "legado",
    },
    snapshot: { rankingPoints: 12, league: "individual" },
    activeBadgeIds: ["legado"],
    existing: { maxRankingPointsEver: 18, maxRankingPointsIsPartial: true },
  });

  assert.equal(profile.displayName, "Ana");
  assert.equal(profile.currentRankingPoints, 12);
  assert.equal(profile.maxRankingPointsEver, 18);
  assert.equal(profile.maxRankingPointsIsPartial, true);
  assert.deepEqual(profile.activeBadgeIds, ["legado"]);
  assert.equal("email" in profile, false);
  assert.equal("phone" in profile, false);
});

test("e-mail nunca é usado como nome público", () => {
  const profile = buildPublicGamificationProfile({
    userId: "u1",
    user: {
      email: "privado@example.com",
      rankingPreference: "participate",
    },
  });

  assert.equal(profile.displayName, "Participante");
  assert.equal(JSON.stringify(profile).includes("privado@example.com"), false);
});

test("perfil não é gerado para hidden, view_only ou avatar sem usuário", () => {
  for (const rankingPreference of ["hidden", "view_only"]) {
    assert.equal(
      buildPublicGamificationProfile({
        userId: "u1",
        user: { rankingPreference },
      }),
      null,
    );
  }
  assert.equal(
    buildPublicGamificationProfile({
      userId: "",
      user: { rankingPreference: "participate" },
    }),
    null,
  );
});

test("fechamento adiciona uma temporada e a coroa correta sem duplicar", () => {
  const initial = {
    seasonsParticipated: 2,
    podiumFinishes: [],
    crownsGold: 0,
    crownsSilver: 0,
    crownsBronze: 0,
  };
  const podium = {
    seasonNumber: 3,
    position: 1,
    league: "individual",
    rankingPoints: 22,
  };
  const once = mergeSeasonAchievement(initial, podium);
  const twice = mergeSeasonAchievement(once, podium);

  assert.equal(once.seasonsParticipated, 3);
  assert.equal(once.crownsGold, 1);
  assert.equal(once.podiumFinishes.length, 1);
  assert.deepEqual(twice, once);
});

test("participação sem pódio também é registrada uma única vez", () => {
  const initial = {
    seasonsParticipated: 0,
    seasonNumbersParticipated: [],
    podiumFinishes: [],
  };
  const once = mergeSeasonAchievement(initial, {
    seasonNumber: 4,
    league: "individual",
    rankingPoints: 5,
  });
  const twice = mergeSeasonAchievement(once, {
    seasonNumber: 4,
    league: "individual",
    rankingPoints: 5,
  });

  assert.equal(once.seasonsParticipated, 1);
  assert.deepEqual(once.podiumFinishes, []);
  assert.deepEqual(twice, once);
});

test("legado showInRanking=true participa; preferência explícita prevalece", () => {
  const legacy = buildPublicGamificationProfile({
    userId: "u1",
    user: { name: "Legado", showInRanking: true },
  });
  assert.equal(legacy.displayName, "Legado");
  for (const rankingPreference of ["view_only", "hidden", "unset"]) {
    assert.equal(
      buildPublicGamificationProfile({
        userId: "u1",
        user: { name: "X", rankingPreference, showInRanking: true },
      }),
      null,
    );
  }
  assert.equal(
    buildPublicGamificationProfile({
      userId: "u1",
      user: { name: "X", showInRanking: false },
    }),
    null,
  );
});

test("backfill usa apenas pódios reais das temporadas existentes", () => {
  const history = podiumHistoryFromSeasons("u1", [
    {
      seasonNumber: 1,
      podiums: {
        individual: [
          { userId: "u1", position: 2, rankingPoints: 14, league: "individual" },
        ],
        couple: [],
      },
    },
    {
      seasonNumber: 2,
      podiums: {
        individual: [],
        couple: [
          { userId: "u1", position: 3, rankingPoints: 9, league: "couple" },
        ],
      },
    },
  ]);

  assert.deepEqual(
    history.map(({ seasonNumber, position }) => ({ seasonNumber, position })),
    [
      { seasonNumber: 1, position: 2 },
      { seasonNumber: 2, position: 3 },
    ],
  );
});
