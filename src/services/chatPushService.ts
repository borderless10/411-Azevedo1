import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { userService } from "./userServices";
import { NOTIFICATION_CHANNEL_CHAT } from "./notificationServices";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PRESENCE_STALE_MS = 90_000;

type ChatPushInput = {
  chatId: string;
  messageId: string;
  senderId: string;
  text: string;
  mentionUserIds?: string[];
};

const previewText = (value: string): string => {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "Nova mensagem";
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

const isViewingChat = (user: {
  presenceState?: string;
  activeChatId?: string | null;
  presenceUpdatedAt?: Date;
}): boolean => {
  if (user.presenceState !== "foreground") return false;
  const updatedAt = user.presenceUpdatedAt?.getTime?.() || 0;
  if (!updatedAt || Date.now() - updatedAt > PRESENCE_STALE_MS) return false;
  return true;
};

const sendExpoPush = async (
  messages: Array<Record<string, unknown>>,
): Promise<void> => {
  if (!messages.length) return;

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Expo push falhou (${response.status}): ${body}`);
  }
};

export const notifyChatMessageRecipients = async ({
  chatId,
  messageId,
  senderId,
  text,
  mentionUserIds = [],
}: ChatPushInput): Promise<void> => {
  if (!chatId || !senderId) return;

  const chatSnap = await getDoc(doc(db, "chats", chatId));
  if (!chatSnap.exists()) return;

  const chat = chatSnap.data() as { type?: string; participants?: string[] };
  const mentionSet = new Set(
    mentionUserIds.filter((id) => id && id !== senderId),
  );
  const participantIds = Array.from(
    new Set((chat.participants || []).filter((id) => id && id !== senderId)),
  );

  const recipientIds =
    chat.type === "global"
      ? Array.from(mentionSet)
      : Array.from(new Set([...participantIds, ...mentionSet]));

  if (!recipientIds.length) return;

  const sender = await userService.getUserById(senderId);
  const senderName =
    sender?.nickname?.trim() || sender?.name?.trim() || "Nova mensagem";
  const body = previewText(text);

  const payloads: Array<Record<string, unknown>> = [];

  await Promise.all(
    recipientIds.map(async (userId) => {
      try {
        const recipient = await userService.getUserById(userId);
        const token = String(recipient?.expoPushToken || "").trim();
        if (!token || !token.startsWith("ExponentPushToken")) return;

        const viewingThisChat =
          isViewingChat(recipient || {}) && recipient?.activeChatId === chatId;
        if (viewingThisChat) return;

        const mentioned = mentionSet.has(userId);
        payloads.push({
          to: token,
          title: mentioned
            ? `${senderName} mencionou você`
            : senderName,
          body: mentioned ? body : body,
          sound: "default",
          channelId: NOTIFICATION_CHANNEL_CHAT,
          priority: "high",
          badge: 1,
          data: {
            type: mentioned ? "chat_mention" : "chat_message",
            chatId,
            messageId,
          },
        });
      } catch (error) {
        console.warn("Não foi possível preparar push para", userId, error);
      }
    }),
  );

  await sendExpoPush(payloads);
};
