import type { Chat } from "../services/chatService";

export const getDirectChatId = (userAId: string, userBId: string): string =>
  [userAId, userBId].sort().join("_");

export const toJsDateFromFirestore = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getChatLastMessageTime = (chat: Chat | null | undefined): number => {
  const date = toJsDateFromFirestore(chat?.lastMessageAt);
  return date?.getTime() ?? 0;
};

export const isChatUnreadForUser = (
  chat: Chat | null | undefined,
  userId: string | null | undefined,
): boolean => {
  if (!chat || !userId) return false;

  const senderId = chat.lastMessage?.senderId;
  if (!senderId || senderId === userId) return false;

  const lastMessageAt = toJsDateFromFirestore(chat.lastMessageAt);
  if (!lastMessageAt) return false;

  const lastReadAt = toJsDateFromFirestore(chat.lastReadBy?.[userId]);
  if (!lastReadAt) return true;
  return lastMessageAt.getTime() > lastReadAt.getTime();
};

export const countUnreadChats = (
  chats: Chat[] | null | undefined,
  userId: string | null | undefined,
): number =>
  (chats || []).filter((chat) => isChatUnreadForUser(chat, userId)).length;
