import type { Message } from "../services/chatService";

export const CHAT_MESSAGE_EDIT_WINDOW_MS = 60 * 60 * 1000;

export const CHAT_DELETED_MESSAGE_TEXT = "essa mensagem foi apagada";

export const canMutateOwnChatMessage = (
  message: Pick<Message, "createdAt" | "deletedAt">,
  nowMs: number = Date.now(),
): boolean => {
  if (message.deletedAt) return false;
  const createdMs = message.createdAt?.getTime?.() ?? 0;
  if (!createdMs) return false;
  return nowMs - createdMs <= CHAT_MESSAGE_EDIT_WINDOW_MS;
};

export const isChatMessageDeleted = (
  message: Pick<Message, "deletedAt" | "text">,
): boolean =>
  Boolean(message.deletedAt) ||
  String(message.text || "").trim() === CHAT_DELETED_MESSAGE_TEXT;

export const getChatMessageDisplayText = (
  message: Pick<Message, "text" | "deletedAt">,
): string =>
  isChatMessageDeleted(message)
    ? CHAT_DELETED_MESSAGE_TEXT
    : String(message.text || "");

export const isChatMessageEdited = (
  message: Pick<Message, "editedAt" | "deletedAt">,
): boolean => Boolean(message.editedAt) && !isChatMessageDeleted(message);