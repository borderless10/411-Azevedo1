import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChatPushMessages,
  resolveChatRecipientIds,
} from "./chatPushPayload.js";

test("chat direto envia para todos os participantes, exceto o autor", () => {
  assert.deepEqual(
    resolveChatRecipientIds({
      chatType: "direct",
      participantIds: ["autor", "cliente"],
      senderId: "autor",
      mentionUserIds: [],
    }),
    ["cliente"],
  );
});

test("chat global envia somente para usuários mencionados", () => {
  assert.deepEqual(
    resolveChatRecipientIds({
      chatType: "global",
      participantIds: ["autor", "joao", "maria"],
      senderId: "autor",
      mentionUserIds: ["joao", "autor"],
    }),
    ["joao"],
  );
});

test("monta push visível com som, badge e rota para o chat", () => {
  const messages = buildChatPushMessages({
    recipients: [
      { userId: "cliente", expoPushToken: "ExponentPushToken[abc]" },
    ],
    senderId: "autor",
    senderName: "Eduardo",
    chatId: "autor_cliente",
    messageId: "msg-1",
    text: "Olá",
    mentionUserIds: [],
  });

  assert.deepEqual(messages, [
    {
      to: "ExponentPushToken[abc]",
      title: "Eduardo",
      body: "Olá",
      sound: "default",
      priority: "high",
      channelId: "chat_messages",
      badge: 1,
      data: {
        type: "chat_message",
        chatId: "autor_cliente",
        messageId: "msg-1",
        senderId: "autor",
      },
    },
  ]);
});

test("ignora token inválido e identifica menção", () => {
  const messages = buildChatPushMessages({
    recipients: [
      { userId: "joao", expoPushToken: "ExponentPushToken[abc]" },
      { userId: "maria", expoPushToken: "" },
    ],
    senderId: "autor",
    senderName: "Ana",
    chatId: "global",
    messageId: "msg-2",
    text: "Oi @João",
    mentionUserIds: ["joao"],
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].title, "Ana mencionou você");
  assert.equal(messages[0].data.type, "chat_mention");
});
