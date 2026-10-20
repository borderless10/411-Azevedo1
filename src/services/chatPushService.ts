import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { userService } from "./userServices";
import { NOTIFICATION_CHANNEL_CHAT } from "./notificationServices";
import {
  resolveChatPushTargets,
  type ChatPushRecipientState,
} from "../utils/chatPushRules";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

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

const tokenHint = (token: string): string =>
  token.startsWith("ExponentPushToken") ? "expo" : token ? "outro" : "ausente";

const errorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error || "erro desconhecido");
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const sendExpoPush = async (
  messages: Array<Record<string, unknown>>,
): Promise<void> => {
  if (!messages.length) {
    if (__DEV__) console.log("[push] nenhum envio");
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      if (__DEV__) {
        console.log("[push] solicitando", {
          quantidade: messages.length,
          tentativa: attempt,
        });
      }
      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const raw = await response.text();
      if (__DEV__) console.log("[push] resposta", { status: response.status });
      if (!response.ok) {
        throw new Error(`Expo push falhou (${response.status}): ${raw.slice(0, 200)}`);
      }

      const parsed = JSON.parse(raw) as {
        data?: Array<{ status?: string; message?: string; details?: unknown }>;
      };
      const failed = (parsed.data || []).filter(
        (item) => item.status === "error",
      );
      if (failed.length) {
        throw new Error(
          failed.map((item) => item.message || "Expo recusou o push").join(", "),
        );
      }
      return;
    } catch (error) {
      // warn: não abrir LogBox vermelha no meio do chat
      console.warn("[push] tentativa falhou", {
        attempt,
        message: errorMessage(error),
      });
      if (attempt === 3) throw error;
      await delay(attempt * 750);
    }
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

  if (__DEV__) {
    console.log("[push] evento chat", { chatId, messageId, senderId });
  }

  const chatSnap = await getDoc(doc(db, "chats", chatId));
  if (!chatSnap.exists()) {
    console.warn("[push] chat inexistente", chatId);
    return;
  }

  const chat = chatSnap.data() as { type?: string; participants?: string[] };
  const participantIds = Array.from(
    new Set((chat.participants || []).filter(Boolean)),
  );
  const mentionIds = mentionUserIds.filter((id) => id && id !== senderId);
  const candidateIds = Array.from(
    new Set(
      chat.type === "global"
        ? mentionIds
        : [...participantIds.filter((id) => id !== senderId), ...mentionIds],
    ),
  );

  if (!candidateIds.length) {
    if (__DEV__) console.log("[push] sem destinatários");
    return;
  }

  const statesByUserId: Record<string, ChatPushRecipientState> = {};
  const profiles = await Promise.all(
    candidateIds.map((userId) => userService.getUserNotifyProfile(userId)),
  );

  profiles.forEach((profile) => {
    if (!profile?.id) return;
    statesByUserId[profile.id] = {
      presenceState: profile.presenceState,
      activeChatId: profile.activeChatId,
      presenceUpdatedAtMs: profile.presenceUpdatedAt?.getTime?.() || 0,
    };
  });

  const targets = resolveChatPushTargets({
    chatId,
    chatType: chat.type,
    participantIds,
    senderId,
    mentionUserIds: mentionIds,
    statesByUserId,
    nowMs: Date.now(),
  });

  if (__DEV__) {
    console.log("[push] destinatários", {
      chatType: chat.type || "direct",
      quantidade: targets.length,
      mentions: mentionIds.length,
    });
  }

  if (!targets.length) return;

  const sender = await userService.getUserNotifyProfile(senderId);
  const senderName =
    sender?.nickname?.trim() || sender?.name?.trim() || "Nova mensagem";
  const body = previewText(text);
  const payloads: Array<Record<string, unknown>> = [];

  targets.forEach((target) => {
    const profile = profiles.find((item) => item?.id === target.userId);
    const token = String(profile?.expoPushToken || "").trim();
    const hasToken = token.startsWith("ExponentPushToken");
    if (__DEV__) {
      console.log("[push] destinatário", {
        userId: target.userId,
        mentioned: target.mentioned,
        token: tokenHint(token),
      });
    }
    if (!hasToken) return;
    payloads.push({
      to: token,
      title: target.mentioned ? `${senderName} mencionou você` : senderName,
      body,
      sound: "default",
      channelId: NOTIFICATION_CHANNEL_CHAT,
      priority: "high",
      interruptionLevel: "active",
      badge: 1,
      data: {
        type: target.mentioned ? "chat_mention" : "chat_message",
        chatId,
        messageId,
        senderId,
      },
    });
  });

  await sendExpoPush(payloads);
};
