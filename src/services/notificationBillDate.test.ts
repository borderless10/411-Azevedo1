import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Espelha o guard de notificationServices.toValidDate.
 * Conta sem vencimento (ex.: Psiquiatra da Sabrina) não pode
 * chegar no scheduleNotificationAsync com Invalid Date.
 */
const toValidDate = (value: unknown): Date | null => {
  if (value == null || value === "") return null;
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date })?.toDate === "function"
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number | Date);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return date;
};

test("conta sem vencimento: dueDate inválido é rejeitado", () => {
  assert.equal(toValidDate(undefined), null);
  assert.equal(toValidDate(null), null);
  assert.equal(toValidDate(""), null);
  assert.equal(toValidDate(new Date("invalid")), null);
});

test("dueDate válido é aceito", () => {
  const due = new Date(2026, 10, 15);
  assert.equal(toValidDate(due)?.getTime(), due.getTime());
});

test("Invalid Date não passa do filtro de agendamento (bug que fechava o app)", () => {
  const now = new Date();
  const baseDate = new Date(undefined as unknown as string);
  baseDate.setHours(9, 0, 0, 0);

  for (const offsetDays of [-3, -2, 0, 1]) {
    const triggerDate = new Date(baseDate);
    triggerDate.setDate(triggerDate.getDate() + offsetDays);

    // Bug antigo: Invalid Date nunca satisfaz <= now → agendava no nativo.
    const buggyWouldSchedule = !(triggerDate <= now);
    const fixedWouldSchedule =
      !Number.isNaN(triggerDate.getTime()) &&
      triggerDate.getTime() > now.getTime();

    assert.equal(buggyWouldSchedule, true);
    assert.equal(fixedWouldSchedule, false);
  }

  assert.equal(toValidDate(undefined), null);
});
