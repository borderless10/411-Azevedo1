import assert from "node:assert/strict";
import test from "node:test";
import {
  isFutureCalendarDay,
  normalizeToLocalMidday,
  toLocalDateKey,
} from "./calendarDay.ts";

test("hoje e ontem não são dia civil futuro (mesmo com hora alta)", () => {
  const now = new Date(2026, 10, 19, 15, 39, 0); // 19/11/2026 15:39 local
  const todayMorning = new Date(2026, 10, 19, 0, 0, 0);
  const todayNoon = new Date(2026, 10, 19, 12, 0, 0);
  const todayNight = new Date(2026, 10, 19, 23, 59, 59);
  const yesterday = new Date(2026, 10, 18, 23, 59, 59);

  assert.equal(isFutureCalendarDay(todayMorning, now), false);
  assert.equal(isFutureCalendarDay(todayNoon, now), false);
  assert.equal(isFutureCalendarDay(todayNight, now), false);
  assert.equal(isFutureCalendarDay(yesterday, now), false);
});

test("amanhã é dia civil futuro mesmo de madrugada", () => {
  const now = new Date(2026, 10, 19, 0, 1, 0);
  const tomorrow = new Date(2026, 10, 20, 0, 0, 0);
  assert.equal(isFutureCalendarDay(tomorrow, now), true);
});

test("normalizeToLocalMidday preserva o dia civil", () => {
  const raw = new Date(2026, 10, 19, 3, 0, 0);
  const mid = normalizeToLocalMidday(raw);
  assert.equal(toLocalDateKey(mid), "2026-11-19");
  assert.equal(mid.getHours(), 12);
});

test("parcela do mês seguinte é futura; compra de hoje não", () => {
  const purchase = normalizeToLocalMidday(new Date(2026, 10, 19));
  const parcel2 = normalizeToLocalMidday(new Date(2026, 11, 19));
  const now = new Date(2026, 10, 19, 15, 39, 0);
  assert.equal(isFutureCalendarDay(purchase, now), false);
  assert.equal(isFutureCalendarDay(parcel2, now), true);
  assert.equal(toLocalDateKey(parcel2), "2026-12-19");
});
