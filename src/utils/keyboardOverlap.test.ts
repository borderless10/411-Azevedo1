import assert from "node:assert/strict";
import test from "node:test";
import { keyboardOverlap } from "./keyboardOverlap.ts";

test("usa a altura do frame quando a janela não encolhe", () => {
  assert.equal(
    keyboardOverlap({
      frameHeight: 320,
      frameScreenY: 800,
      screenHeight: 1120,
      windowHeightBefore: 1120,
      windowHeightNow: 1120,
    }),
    320,
  );
});

test("usa screenY quando a altura do frame vem zerada", () => {
  assert.equal(
    keyboardOverlap({
      frameHeight: 0,
      frameScreenY: 800,
      screenHeight: 1120,
      windowHeightBefore: 1120,
      windowHeightNow: 1120,
    }),
    320,
  );
});

test("não soma de novo o que a janela já encolheu", () => {
  assert.equal(
    keyboardOverlap({
      frameHeight: 320,
      frameScreenY: 800,
      screenHeight: 1120,
      windowHeightBefore: 1120,
      windowHeightNow: 800,
    }),
    0,
  );
});

test("compensa só o que a janela encolheu pela metade", () => {
  assert.equal(
    keyboardOverlap({
      frameHeight: 320,
      frameScreenY: 800,
      screenHeight: 1120,
      windowHeightBefore: 1120,
      windowHeightNow: 1020,
    }),
    220,
  );
});
