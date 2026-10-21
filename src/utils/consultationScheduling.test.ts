import assert from "node:assert/strict";
import test from "node:test";
import {
  getConsultationBookingReleaseUpdate,
  hasConsultationBookingLock,
  isConsultationBookedForCycle,
} from "./consultationScheduling.ts";

const cycleStartKey = "2026-10-01";

test("confirmação de agendamento ativa a trava do ciclo", () => {
  assert.equal(hasConsultationBookingLock("15", cycleStartKey), true);
  assert.equal(
    isConsultationBookedForCycle("15", cycleStartKey, cycleStartKey),
    true,
  );
});

test("liberação limpa a trava e preserva a marcação anterior", () => {
  const release = getConsultationBookingReleaseUpdate("15", cycleStartKey);

  assert.deepEqual(release, {
    consultationBookedDay: "",
    consultationBookedCycleStartedAt: "",
    consultationPreviousBookedDay: "15",
    consultationPreviousBookedCycleStartedAt: cycleStartKey,
  });
  assert.equal(
    hasConsultationBookingLock(
      release.consultationBookedDay,
      release.consultationBookedCycleStartedAt,
    ),
    false,
  );
  assert.equal(
    isConsultationBookedForCycle(
      release.consultationBookedDay,
      release.consultationBookedCycleStartedAt,
      cycleStartKey,
    ),
    false,
  );
});

test("sem dia e ciclo não há trava para liberar", () => {
  assert.equal(hasConsultationBookingLock("", ""), false);
  assert.equal(hasConsultationBookingLock("15", ""), false);
  assert.equal(hasConsultationBookingLock("", cycleStartKey), false);
});
