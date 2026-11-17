import assert from "node:assert/strict";
import test from "node:test";
import {
  brightnessPercent,
  hexToHsv,
  hsvToHex,
  parseFullHex,
  parseHex,
  ratioAlong,
  thumbOffset,
} from "./badgeColor.ts";

test("aceita hex com ou sem tralha e ignora texto inválido", () => {
  assert.equal(parseHex("#374ea8"), "#374EA8");
  assert.equal(parseHex("374ea8"), "#374EA8");
  assert.equal(parseHex("#abc"), "#AABBCC");
  assert.equal(parseHex("  #6e2930 "), "#6E2930");
  assert.equal(parseHex("azul"), null);
  assert.equal(parseHex("#12"), null);
  assert.equal(parseHex(""), null);
  assert.equal(parseFullHex("#abc"), null);
  assert.equal(parseFullHex("374EA8"), "#374EA8");
});

test("brilho 0 a 100 segue o valor da cor", () => {
  assert.equal(brightnessPercent("#374EA8"), 66);
  assert.equal(brightnessPercent("#6E2930"), 43);
  assert.equal(brightnessPercent("#000000"), 0);
  assert.equal(brightnessPercent("#FFFFFF"), 100);
  assert.equal(brightnessPercent("nope"), null);
});

test("hex de insígnia sobrevive à ida e volta", () => {
  for (const hex of [
    "#374EA8",
    "#6E2930",
    "#8C52FF",
    "#C0C6D4",
    "#000000",
    "#FFFFFF",
    "#FF0000",
  ]) {
    const hsv = hexToHsv(hex);
    assert.ok(hsv);
    assert.equal(hsvToHex(hsv), hex);
  }
  assert.equal(hexToHsv("roxo"), null);
  assert.equal(hsvToHex({ h: 400, s: 2, v: -1 }), "#000000");
});

test("alça percorre a trilha de ponta a ponta", () => {
  assert.equal(ratioAlong(11, 200), 0);
  assert.equal(ratioAlong(189, 200), 1);
  assert.ok(Math.abs(ratioAlong(100, 200) - 0.5) < 0.001);
  assert.equal(thumbOffset(0, 200), 0);
  assert.equal(thumbOffset(1, 200), 178);
});
