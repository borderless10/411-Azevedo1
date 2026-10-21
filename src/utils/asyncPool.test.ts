import assert from "node:assert/strict";
import test from "node:test";
import { mapWithConcurrency } from "./asyncPool.ts";

test("executa todos os itens sem passar da concorrência", async () => {
  let active = 0;
  let maxActive = 0;
  const done: number[] = [];
  await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active -= 1;
    done.push(item);
  });
  assert.deepEqual(done.sort(), [1, 2, 3, 4, 5]);
  assert.equal(maxActive <= 2, true);
});
