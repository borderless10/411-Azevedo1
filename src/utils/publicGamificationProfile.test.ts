import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error O runner nativo com strip-types exige a extensão explícita.
import * as publicProfile from "./publicGamificationProfile.ts";

const {
  canOpenPublicGamificationProfile,
  mapPublicGamificationProfile,
  parseEnsurePublicProfileOutcome,
} = publicProfile;

test("CTA exige usuário único participante", () => {
  assert.equal(
    canOpenPublicGamificationProfile("u1", "participate"),
    true,
  );
  assert.equal(canOpenPublicGamificationProfile("u1", "hidden"), false);
  assert.equal(canOpenPublicGamificationProfile("u1", "view_only"), false);
  assert.equal(canOpenPublicGamificationProfile(null, "participate"), false);
});

test("mapeamento normaliza somente dados públicos", () => {
  const result = mapPublicGamificationProfile("u1", {
    displayName: "Ana",
    currentRankingPoints: 7,
    maxRankingPointsEver: 12,
    crownsGold: 1,
    activeBadgeIds: ["legado"],
    podiumFinishes: [
      {
        seasonNumber: 2,
        position: 1,
        league: "individual",
        rankingPoints: 12,
      },
    ],
  });

  assert.equal(result.userId, "u1");
  assert.equal(result.crownsSilver, 0);
  assert.equal(result.podiumFinishes[0].seasonNumber, 2);
});

test("resposta da garantia sob demanda diferencia available e unavailable", () => {
  assert.deepEqual(parseEnsurePublicProfileOutcome({ status: "unavailable" }), {
    status: "unavailable",
  });
  const available = parseEnsurePublicProfileOutcome({
    status: "available",
    profile: { displayName: "Ana", email: "privado@example.com" },
  });
  assert.equal(available?.status, "available");
  if (available?.status === "available") {
    const mapped = mapPublicGamificationProfile("u1", available.profile);
    assert.equal(mapped.displayName, "Ana");
    assert.equal("email" in mapped, false);
  }
  assert.equal(parseEnsurePublicProfileOutcome({ status: "available" }), null);
  assert.equal(parseEnsurePublicProfileOutcome(null), null);
});
