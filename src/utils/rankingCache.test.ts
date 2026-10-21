import assert from "node:assert/strict";
import test from "node:test";
import {
  RANKING_CACHE_ROW_LIMIT,
  acceptRankingCache,
  isRankingCacheExpired,
  prepareRankingCache,
  rankingRowsChanged,
} from "./rankingCache.ts";

test("cache de ranking descarta versão errada e limita o tamanho", () => {
  const rows = Array.from({ length: RANKING_CACHE_ROW_LIMIT + 10 }, (_, index) => ({
    userId: `u${index}`,
  }));
  const prepared = prepareRankingCache("individual", "2026-10-21", rows, 100);
  assert.equal(prepared.rows.length, RANKING_CACHE_ROW_LIMIT);
  assert.equal(acceptRankingCache(prepared, "couple"), null);
  assert.equal(acceptRankingCache({ ...prepared, version: 0 }, "individual"), null);
  assert.equal(acceptRankingCache(prepared, "individual")?.cutoffDateKey, "2026-10-21");
});

test("atualiza a lista só quando pontos, ordem ou foto mudam", () => {
  const current = [{ userId: "a", zeroDays: 2, photoUrl: "https://foto" }];
  assert.equal(rankingRowsChanged(current, current), false);
  assert.equal(
    rankingRowsChanged(current, [{ userId: "a", zeroDays: 3, photoUrl: "https://foto" }]),
    true,
  );
  assert.equal(isRankingCacheExpired({ fetchedAt: 0 }, 11 * 60 * 1000), true);
});
