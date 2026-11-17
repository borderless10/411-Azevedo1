import assert from "node:assert/strict";
import test from "node:test";
import {
  canConfirmConsultationBooking,
  findConsultationSupportChatId,
  getConsultationBookingReleaseUpdate,
  getConsultationSchedulingState,
  hasConsultationBookingLock,
  isConsultationBookedForCycle,
  shouldShowConsultationSupportHelp,
} from "./consultationScheduling.ts";

const cycleStartKey = "2026-10-01";
const previousCycleStartKey = "2026-09-01";

test("sem abertura e sem confirmação fica disponível", () => {
  assert.equal(
    getConsultationSchedulingState({
      hasSchedulingUrl: true,
      openedCycleStartedAt: "",
      bookedDay: "",
      bookedCycleStartedAt: "",
      cycleStartKey,
    }),
    "available",
  );
});

test("abertura no ciclo atual sem confirmação aguarda confirmação", () => {
  assert.equal(
    getConsultationSchedulingState({
      hasSchedulingUrl: true,
      openedCycleStartedAt: cycleStartKey,
      bookedDay: "",
      bookedCycleStartedAt: "",
      cycleStartKey,
    }),
    "awaitingConfirmation",
  );
});

test("confirmação no ciclo atual fica agendada", () => {
  assert.equal(
    getConsultationSchedulingState({
      hasSchedulingUrl: true,
      openedCycleStartedAt: cycleStartKey,
      bookedDay: "15",
      bookedCycleStartedAt: cycleStartKey,
      cycleStartKey,
    }),
    "booked",
  );
});

test("marcador de abertura antigo não bloqueia ciclo novo", () => {
  assert.equal(
    getConsultationSchedulingState({
      hasSchedulingUrl: true,
      openedCycleStartedAt: previousCycleStartKey,
      bookedDay: "",
      bookedCycleStartedAt: "",
      cycleStartKey,
    }),
    "available",
  );
});

test("confirmação existente no ciclo impede alteração pelo cliente", () => {
  assert.equal(
    canConfirmConsultationBooking("15", cycleStartKey, cycleStartKey),
    false,
  );
  assert.equal(canConfirmConsultationBooking("", "", cycleStartKey), true);
});

test("confirmação de agendamento ativa a trava do ciclo", () => {
  assert.equal(hasConsultationBookingLock("15", cycleStartKey), true);
  assert.equal(
    isConsultationBookedForCycle("15", cycleStartKey, cycleStartKey),
    true,
  );
});

test("liberação limpa abertura e confirmação preservando a marcação anterior", () => {
  const release = getConsultationBookingReleaseUpdate("15", cycleStartKey);

  assert.deepEqual(release, {
    consultationBookedDay: "",
    consultationBookedCycleStartedAt: "",
    consultationSchedulingOpenedCycleStartedAt: "",
    consultationSchedulingOpenedAt: null,
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

test("ajuda de clique equivocado só aparece após o primeiro clique", () => {
  assert.equal(shouldShowConsultationSupportHelp("available"), false);
  assert.equal(shouldShowConsultationSupportHelp("awaitingConfirmation"), true);
  assert.equal(shouldShowConsultationSupportHelp("booked"), true);
});

test("ajuda localiza o chat direto da Visão e ignora o do consultor", () => {
  const chats = [
    { id: "global", type: "global", participants: [] },
    {
      id: "cliente_consultor",
      type: "direct",
      participants: ["cliente", "consultor"],
    },
    {
      id: "admin_cliente",
      type: "direct",
      participants: ["admin", "cliente"],
    },
  ];
  assert.equal(
    findConsultationSupportChatId(chats, "cliente", "consultor"),
    "admin_cliente",
  );
  // Sem consultor vinculado, o primeiro chat direto já é o da Visão.
  assert.equal(
    findConsultationSupportChatId(chats, "cliente", null),
    "cliente_consultor",
  );
  assert.equal(findConsultationSupportChatId(chats, "", "consultor"), null);
  assert.equal(findConsultationSupportChatId([], "cliente", "consultor"), null);
});

test("sem dia e ciclo não há trava para liberar", () => {
  assert.equal(hasConsultationBookingLock("", ""), false);
  assert.equal(hasConsultationBookingLock("15", ""), false);
  assert.equal(hasConsultationBookingLock("", cycleStartKey), false);
});
