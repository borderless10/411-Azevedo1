import assert from "node:assert/strict";
import test from "node:test";
import { buildSeasonPodiums } from "./rankingSeason.js";
import {
  grantDocId,
  resolveActiveBorderAfterRevoke,
  validateBadgeDefinitionInput,
} from "./badgeRules.js";

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

test("definição inválida é rejeitada", () => {
  const result = validateBadgeDefinitionInput({ id: "X!", icon: "camera" });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});
