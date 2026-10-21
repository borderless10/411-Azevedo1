import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaguePodium, buildSeasonPodiums } from "./rankingSeason.ts";
import {
  grantDocId,
  resolveActiveBorderAfterRevoke,
  validateBadgeDefinitionInput,
} from "./badgeRules.ts";

test("ordena por pontos, nome e UID com desempate determinístico", () => {
  const podium = buildLeaguePodium(
    [
      { userId: "b", displayName: "Bia", rankingPoints: 10, league: "individual" },
      { userId: "a", displayName: "Ana", rankingPoints: 10, league: "individual" },
      { userId: "c", displayName: "Caio", rankingPoints: 12, league: "individual" },
      { userId: "d", displayName: "Duda", rankingPoints: 1, league: "individual" },
    ],
    "individual",
  );
  assert.deepEqual(
    podium.map((item) => item.userId),
    ["c", "a", "b"],
  );
  assert.equal(podium[0].position, 1);
});

test("separa ligas e aceita pódio com menos de três", () => {
  const podiums = buildSeasonPodiums([
    { userId: "1", displayName: "Um", rankingPoints: 5, league: "couple" },
    { userId: "2", displayName: "Dois", rankingPoints: 7, league: "individual" },
  ]);
  assert.equal(podiums.individual.length, 1);
  assert.equal(podiums.couple.length, 1);
  assert.equal(podiums.couple[0].userId, "1");
});

test("concessão usa ID determinístico sem duplicar", () => {
  assert.equal(grantDocId("user1", "legado-visao"), "user1_legado-visao");
});

test("revogar a borda ativa volta ao padrão; outra borda permanece", () => {
  assert.equal(resolveActiveBorderAfterRevoke("legado-visao", "legado-visao"), null);
  assert.equal(
    resolveActiveBorderAfterRevoke("guardiao-do-zero", "legado-visao"),
    "guardiao-do-zero",
  );
});

test("valida definição de insígnia personalizada", () => {
  assert.equal(
    validateBadgeDefinitionInput({
      id: "nova-insignia",
      name: "Nova",
      meaning: "Feito marcante",
      description: "Descrição",
      icon: "trophy",
      primaryColor: "#8c52ff",
      secondaryColor: "#e7b958",
      borderPreset: "solid-violet",
    }).valid,
    true,
  );
  assert.equal(
    validateBadgeDefinitionInput({
      id: "Inválida!",
      name: "",
      meaning: "",
      description: "",
      icon: "camera",
      primaryColor: "roxo",
      secondaryColor: "#fff",
      borderPreset: "neon",
    }).valid,
    false,
  );
});
