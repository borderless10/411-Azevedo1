import assert from "node:assert/strict";
import test from "node:test";
import { resolveChatPushTargets } from "./chatPushRules.ts";
import {
  listUnseenMentions,
  mergeSeenMentionIds,
} from "./chatMentionSeen.ts";
import {
  canCreateRecommendationForClient,
  canRegisterClient,
  lockedConsultantIdForRegistration,
} from "./staffAccess.ts";
import { incomeTransactionLabel } from "./incomeEntry.ts";
import { getCycleNotificationInstants } from "./cycleNotificationSchedule.ts";

const now = Date.parse("2026-10-16T15:00:00");

test("chat do consultor avisa o destinatário e não o autor", () => {
  const targets = resolveChatPushTargets({
    chatId: "a_b",
    chatType: "direct",
    participantIds: ["autor", "cliente"],
    senderId: "autor",
    mentionUserIds: [],
    statesByUserId: {},
    nowMs: now,
  });
  assert.deepEqual(
    targets.map((item) => item.userId),
    ["cliente"],
  );
});

test("Visão é chat direto e também gera push", () => {
  const targets = resolveChatPushTargets({
    chatId: "admin_cliente",
    chatType: "direct",
    participantIds: ["admin", "cliente"],
    senderId: "cliente",
    mentionUserIds: [],
    statesByUserId: {
      admin: { presenceState: "background", presenceUpdatedAtMs: now },
    },
    nowMs: now,
  });
  assert.deepEqual(targets.map((item) => item.userId), ["admin"]);
});

test("bate-papo sem menção não gera push", () => {
  const targets = resolveChatPushTargets({
    chatId: "global",
    chatType: "global",
    participantIds: [],
    senderId: "autor",
    mentionUserIds: [],
    statesByUserId: {},
    nowMs: now,
  });
  assert.equal(targets.length, 0);
});

test("bate-papo com menção avisa só quem foi marcado", () => {
  const targets = resolveChatPushTargets({
    chatId: "global",
    chatType: "global",
    participantIds: ["autor", "joao", "maria"],
    senderId: "autor",
    mentionUserIds: ["joao", "autor"],
    statesByUserId: {},
    nowMs: now,
  });
  assert.deepEqual(targets, [{ userId: "joao", mentioned: true }]);
});

test("gera push mesmo com presença antiga no mesmo chat; o app destinatário suprime", () => {
  const targets = resolveChatPushTargets({
    chatId: "a_b",
    chatType: "direct",
    participantIds: ["autor", "cliente"],
    senderId: "autor",
    mentionUserIds: [],
    statesByUserId: {
      cliente: {
        presenceState: "foreground",
        activeChatId: "a_b",
        presenceUpdatedAtMs: now,
      },
    },
    nowMs: now,
  });
  assert.deepEqual(targets, [{ userId: "cliente", mentioned: false }]);
});

test("menção só fica vista quando a mensagem entra na tela", () => {
  const messages = [
    {
      id: "antiga",
      createdAtMs: 1,
      senderId: "outro",
      mentionUserIds: ["eu"],
    },
    {
      id: "nova",
      createdAtMs: 2,
      senderId: "outro",
      mentionUserIds: ["eu"],
    },
  ];
  const unseen = listUnseenMentions(messages, "eu", new Set());
  assert.deepEqual(
    unseen.map((item) => item.id),
    ["antiga", "nova"],
  );
  const afterVisible = mergeSeenMentionIds([], ["nova"]);
  assert.deepEqual(
    listUnseenMentions(messages, "eu", new Set(afterVisible)).map(
      (item) => item.id,
    ),
    ["antiga"],
  );
});

test("supervisor e consultor recomendam e cadastram; cliente não", () => {
  const supervisor = { id: "s", role: "supervisor" };
  const consultor = { id: "c", role: "consultor" };
  const cliente = { id: "u", role: "user" };
  assert.equal(canCreateRecommendationForClient(supervisor), true);
  assert.equal(canCreateRecommendationForClient(consultor), true);
  assert.equal(canCreateRecommendationForClient(cliente), false);
  assert.equal(canRegisterClient(supervisor), true);
  assert.equal(canRegisterClient(consultor), true);
  assert.equal(canRegisterClient(cliente), false);
  assert.equal(lockedConsultantIdForRegistration(consultor), "c");
  assert.equal(lockedConsultantIdForRegistration(supervisor), null);
});

test("origem da renda aparece junto da descrição", () => {
  assert.equal(
    incomeTransactionLabel({ description: "Bolo", origin: "venda de bolo" }),
    "Bolo\nvenda de bolo",
  );
  assert.equal(
    incomeTransactionLabel({ description: "Salário", origin: "" }),
    "Salário",
  );
});

test("ciclo agenda janela e fim no futuro", () => {
  const start = new Date(2026, 9, 1, 8, 0, 0);
  const instants = getCycleNotificationInstants({
    consumoModeradoCycleStartedAt: start,
    consumoModeradoCycleDurationDays: 30,
  } as never);
  assert.equal(instants.length, 2);
  assert.equal(instants[0].kind, "renewal");
  assert.equal(instants[1].kind, "ended");
  assert.ok(instants[1].at > instants[0].at);
});
