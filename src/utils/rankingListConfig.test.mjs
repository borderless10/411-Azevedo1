import assert from "node:assert/strict";
import test from "node:test";
import { rankingListConfig } from "./rankingListConfig.ts";

test("web renderiza todas as linhas e não recorta itens", () => {
  assert.deepEqual(rankingListConfig("web", 47), {
    initialNumToRender: 47,
    removeClippedSubviews: false,
  });
});

test("mobile mantém a janela virtualizada", () => {
  assert.deepEqual(rankingListConfig("ios", 47), {
    initialNumToRender: 12,
    removeClippedSubviews: true,
  });
  assert.deepEqual(rankingListConfig("android", 47), {
    initialNumToRender: 12,
    removeClippedSubviews: true,
  });
});
