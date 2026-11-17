import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCrownByUser,
  crownColor,
  crownLabel,
} from "./crowns.ts";
import type { RankingSeason } from "../types/rankingGamification";

const season = (
  seasonNumber: number,
  individual: [string, number][],
  couple: [string, number][] = [],
): RankingSeason => ({
  seasonNumber,
  previousCutoffDateKey: null,
  cutoffDateKey: "2026-10-21",
  endedAt: new Date(2026, 9, 21),
  resetBy: "admin",
  podiums: {
    individual: individual.map(([userId, position]) => ({
      position: position as 1 | 2 | 3,
      userId,
      displayName: userId,
      rankingPoints: 10,
      league: "individual" as const,
      photoUrl: null,
    })),
    couple: couple.map(([userId, position]) => ({
      position: position as 1 | 2 | 3,
      userId,
      displayName: userId,
      rankingPoints: 10,
      league: "couple" as const,
      photoUrl: null,
    })),
  },
});

test("só o pódio da temporada mais recente coroa", () => {
  const crowns = buildCrownByUser([
    season(2, [["ana", 1], ["bia", 2], ["caio", 3]]),
    season(1, [["zeca", 1], ["yara", 2]]),
  ]);
  assert.equal(crowns.get("ana"), 1);
  assert.equal(crowns.get("bia"), 2);
  assert.equal(crowns.get("caio"), 3);
  assert.equal(crowns.get("zeca"), undefined);
  assert.equal(crowns.get("yara"), undefined);
});

test("quem aparece nas duas ligas fica com a melhor posição", () => {
  const crowns = buildCrownByUser([
    season(1, [["ana", 3]], [["ana", 1], ["dupla", 2]]),
  ]);
  assert.equal(crowns.get("ana"), 1);
  assert.equal(crowns.get("dupla"), 2);
});

test("sem temporada não há coroa e as cores são ouro, prata e bronze", () => {
  assert.equal(buildCrownByUser([]).size, 0);
  assert.equal(crownColor(1), "#e7b958");
  assert.equal(crownColor(2), "#c0c6d4");
  assert.equal(crownColor(3), "#cd7f32");
  assert.equal(crownLabel(1), "Coroa de ouro");
  assert.equal(crownLabel(2), "Coroa de prata");
  assert.equal(crownLabel(3), "Coroa de bronze");
});
