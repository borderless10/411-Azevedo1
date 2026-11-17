import assert from "node:assert/strict";
import test from "node:test";
import {
  rankingPositionFontSize,
  rankingPositionLabel,
  resolveRankingPosition,
} from "./rankingPosition.ts";

test("posição na lista ordenada e ausência no ranking", () => {
  const ordered = ["a", "b", "c"];
  assert.equal(resolveRankingPosition(ordered, "c"), 3);
  assert.equal(resolveRankingPosition(ordered, "fora"), null);
  assert.equal(resolveRankingPosition(ordered, null), null);
  assert.equal(resolveRankingPosition([], "a"), null);
});

test("rótulo e fonte cabem no troféu conforme os dígitos", () => {
  assert.equal(rankingPositionLabel(3), "3");
  assert.equal(rankingPositionLabel(0), null);
  assert.equal(rankingPositionLabel(null), null);
  assert.equal(rankingPositionFontSize(3), 11);
  assert.equal(rankingPositionFontSize(12), 9);
  assert.equal(rankingPositionFontSize(123), 7);
});
