import assert from "node:assert/strict";
import test from "node:test";
import { buildSeasonPodiums } from "./rankingSeason.js";
import {
  grantDocId,
  resolveActiveBorderAfterRevoke,
  decideBadgeRemoval,
  validateBadgeDefinitionInput,
} from "./badgeRules.js";
import {
  remainingSeasonCounter,
  resolvePurgeTargets,
  seasonPeriodLabel,
} from "./rankingPurge.js";
import { buildPublicGamificationProfile } from "./publicGamificationProfile.js";

test("pódio das duas ligas com menos de três em uma", () => {
  const podiums = buildSeasonPodiums([
    { userId: "a", displayName: "Ana", rankingPoints: 9, league: "individual" },
    { userId: "b", displayName: "Bia", rankingPoints: 9, league: "individual" },
    { userId: "c", displayName: "Casal", rankingPoints: 4, league: "couple" },
  ]);
  assert.deepEqual(podiums.individual.map((i) => i.userId), ["a", "b"]);
  assert.equal(podiums.couple.length, 1);
});

test("grant id determinístico e borda revogada cai para padrão", () => {
  assert.equal(grantDocId("u1", "legado-visao"), "u1_legado-visao");
  assert.equal(resolveActiveBorderAfterRevoke("legado-visao", "legado-visao"), null);
  assert.equal(resolveActiveBorderAfterRevoke("guardiao-do-zero", "legado-visao"), "guardiao-do-zero");
});

test("exclusão preserva oficial e histórico", () => {
  assert.equal(decideBadgeRemoval({ isOfficial: true, hasGrantHistory: false }), "reject");
  assert.equal(decideBadgeRemoval({ isOfficial: false, hasGrantHistory: true }), "archive");
  assert.equal(decideBadgeRemoval({ isOfficial: false, hasGrantHistory: false }), "delete");
});

test("definição inválida é rejeitada", () => {
  const result = validateBadgeDefinitionInput({ id: "X!", icon: "camera" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test("rótulo e seleção de edições para purge", () => {
  const seasons = [
    {
      seasonNumber: 1,
      previousCutoffDateKey: null,
      cutoffDateKey: "2026-06-30",
    },
    {
      seasonNumber: 2,
      previousCutoffDateKey: "2026-06-30",
      cutoffDateKey: "2026-10-21",
    },
  ];
  assert.match(seasonPeriodLabel(seasons[0]), /Edição 1/);
  assert.match(seasonPeriodLabel(seasons[1]), /01\/07\/2026 a 21\/10\/2026/);
  const selected = resolvePurgeTargets({
    seasons,
    seasonNumbers: [2, 99],
    deleteAll: false,
  });
  assert.deepEqual(
    selected.targets.map((season) => season.seasonNumber),
    [2],
  );
  assert.deepEqual(selected.missing, [99]);
  assert.equal(remainingSeasonCounter(seasons, [2]), 1);
  assert.equal(remainingSeasonCounter(seasons, [1, 2]), 0);
});

test("reconstrução autoritativa reduz coroas após purge", () => {
  const profile = buildPublicGamificationProfile({
    userId: "u1",
    user: { rankingPreference: "participate", nickname: "Ana" },
    snapshot: { rankingPoints: 0 },
    activeBadgeIds: ["guardiao-do-zero"],
    existing: {
      crownsGold: 2,
      crownsSilver: 1,
      podiumFinishes: [
        { seasonNumber: 1, position: 1, league: "individual", rankingPoints: 10 },
        { seasonNumber: 2, position: 2, league: "individual", rankingPoints: 8 },
      ],
    },
    podiumFinishes: [
      { seasonNumber: 2, position: 2, league: "individual", rankingPoints: 8 },
    ],
  });
  assert.equal(profile.crownsGold, 0);
  assert.equal(profile.crownsSilver, 1);
  assert.equal(profile.podiumFinishes.length, 1);
  assert.deepEqual(profile.activeBadgeIds, ["guardiao-do-zero"]);
});
