import assert from "node:assert/strict";
import test from "node:test";
import {
  capChatWindow,
  mergeChatMessages,
  reconcilePendingMessages,
} from "./chatMessagePipeline.ts";

const at = (ms: number) => new Date(ms);

test("merge deduplica por id e ordena uma vez", () => {
  const merged = mergeChatMessages(
    [{ id: "a", senderId: "u", text: "antiga", createdAt: at(1) }],
    [
      { id: "a", senderId: "u", text: "antiga atualizada", createdAt: at(1) },
      { id: "b", senderId: "u", text: "nova", createdAt: at(2) },
    ],
  );
  assert.deepEqual(
    merged.map((item) => item.text),
    ["antiga atualizada", "nova"],
  );
});

test("janela do chat descarta as mais antigas ao passar do teto", () => {
  const messages = Array.from({ length: 5 }, (_, index) => ({ id: index }));
  const capped = capChatWindow(messages, 3);
  assert.deepEqual(
    capped.messages.map((item) => item.id),
    [2, 3, 4],
  );
  assert.equal(capped.trimmed, true);
  assert.equal(capChatWindow(messages, 5).trimmed, false);
});

test("mensagem pendente sai quando o snapshot confirma", () => {
  const pending = [
    { id: "local", senderId: "eu", text: "oi", createdAt: at(1000) },
  ];
  const live = [
    { id: "srv", senderId: "eu", text: "oi", createdAt: at(1100) },
  ];
  assert.equal(reconcilePendingMessages(pending, live).length, 0);
});

test("falha mantém só a pendente que não chegou", () => {
  const pending = [
    { id: "local", senderId: "eu", text: "oi", createdAt: at(1000) },
  ];
  assert.equal(reconcilePendingMessages(pending, []).length, 1);
});
