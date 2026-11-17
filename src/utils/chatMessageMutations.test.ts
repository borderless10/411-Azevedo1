import assert from "node:assert/strict";
import test from "node:test";
import {
  canMutateOwnChatMessage,
  CHAT_DELETED_MESSAGE_TEXT,
  CHAT_MESSAGE_EDIT_WINDOW_MS,
  getChatMessageDisplayText,
  isChatMessageDeleted,
  isChatMessageEdited,
} from "./chatMessageMutations.ts";

const at = (ms: number) => new Date(ms);

test("janela de 1h permite editar e apagar", () => {
  const created = at(1_000_000);
  const now = created.getTime() + CHAT_MESSAGE_EDIT_WINDOW_MS;
  assert.equal(
    canMutateOwnChatMessage({ createdAt: created, deletedAt: null }, now),
    true,
  );
});

test("fora da janela de 1h bloqueia mutação", () => {
  const created = at(1_000_000);
  const now = created.getTime() + CHAT_MESSAGE_EDIT_WINDOW_MS + 1;
  assert.equal(
    canMutateOwnChatMessage({ createdAt: created, deletedAt: null }, now),
    false,
  );
});

test("mensagem apagada não pode ser editada de novo", () => {
  assert.equal(
    canMutateOwnChatMessage({
      createdAt: at(Date.now()),
      deletedAt: at(Date.now()),
    }),
    false,
  );
});

test("texto de exibição usa placeholder quando apagada", () => {
  assert.equal(
    getChatMessageDisplayText({
      text: "conteúdo original",
      deletedAt: at(1),
    }),
    CHAT_DELETED_MESSAGE_TEXT,
  );
  assert.equal(isChatMessageEdited({ editedAt: at(1), deletedAt: null }), true);
  assert.equal(
    isChatMessageEdited({ editedAt: at(1), deletedAt: at(2) }),
    false,
  );
  assert.equal(
    isChatMessageDeleted({ text: CHAT_DELETED_MESSAGE_TEXT, deletedAt: null }),
    true,
  );
});