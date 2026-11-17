import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaguePodium, buildSeasonPodiums } from "./rankingSeason.ts";
import {
  grantDocId,
  resolveActiveBorderAfterRevoke,
  resolveAvatarBadgeDefinition,
  resolveAvatarRingDefinition,
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

const grantedBadges = [
  {
    id: "primeira",
    name: "Primeira",
    meaning: "Significado",
    description: "Descrição",
    icon: "trophy" as const,
    primaryColor: "#8c52ff",
    secondaryColor: "#e7b958",
    borderPreset: "solid-violet" as const,
    isOfficial: true,
    isActive: true,
  },
  {
    id: "segunda",
    name: "Segunda",
    meaning: "Significado",
    description: "Descrição",
    icon: "medal" as const,
    primaryColor: "#8c52ff",
    secondaryColor: "#e7b958",
    borderPreset: "solid-gold" as const,
    isOfficial: true,
    isActive: true,
  },
];

test("foto usa a borda ativa quando ela existe", () => {
  assert.equal(
    resolveAvatarBadgeDefinition(grantedBadges[1], grantedBadges),
    grantedBadges[1],
  );
  assert.equal(
    resolveAvatarRingDefinition(grantedBadges[1]),
    grantedBadges[1],
  );
});

test("borda padrão com insígnias: anel vazio e selo da primeira concedida", () => {
  assert.equal(resolveAvatarRingDefinition(null), null);
  assert.equal(resolveAvatarRingDefinition(undefined), null);
  assert.equal(
    resolveAvatarBadgeDefinition(null, grantedBadges),
    grantedBadges[0],
  );
});

test("troca de borda reflete no anel e no selo", () => {
  assert.equal(
    resolveAvatarRingDefinition(grantedBadges[0]),
    grantedBadges[0],
  );
  assert.equal(
    resolveAvatarBadgeDefinition(grantedBadges[0], grantedBadges),
    grantedBadges[0],
  );
  assert.equal(
    resolveAvatarRingDefinition(grantedBadges[1]),
    grantedBadges[1],
  );
  assert.equal(
    resolveAvatarBadgeDefinition(grantedBadges[1], grantedBadges),
    grantedBadges[1],
  );
  // Voltar para a borda padrão apaga o anel e mantém o selo.
  assert.equal(resolveAvatarRingDefinition(null), null);
  assert.equal(
    resolveAvatarBadgeDefinition(null, grantedBadges),
    grantedBadges[0],
  );
});

test("sem insígnia nenhuma, anel e selo ficam vazios", () => {
  assert.equal(resolveAvatarRingDefinition(null), null);
  assert.equal(resolveAvatarBadgeDefinition(undefined, []), null);
  assert.equal(resolveAvatarBadgeDefinition(null, null), null);
  assert.equal(resolveAvatarBadgeDefinition(null, undefined), null);
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
