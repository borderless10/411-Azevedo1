import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  DocumentData,
  Query,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore";
import { CoupleMember } from "../types/auth";
import { parseCoupleMember } from "../utils/coupleAccount";
import { ChatMention } from "../utils/chatMentions";
import { notifyChatMessageRecipients } from "./chatPushService";

export type ChatType = "direct" | "group" | "global";

export interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    senderCoupleMember?: CoupleMember;
  };
  lastMessageAt?: any; // Firestore Timestamp
  lastReadBy?: Record<string, any>;
  createdAt?: any;
}

export interface ChatReplyTo {
  messageId: string;
  senderId: string;
  text: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderCoupleMember?: CoupleMember | null;
  createdAt: Date;
  mentions?: ChatMention[];
  replyTo?: ChatReplyTo | null;
  reactions?: Record<string, string>;
}

export type SendMessageOptions = {
  senderCoupleMember?: CoupleMember | null;
  mentions?: ChatMention[];
  replyTo?: ChatReplyTo | null;
};

const mapReplyTo = (raw: any): ChatReplyTo | null => {
  if (!raw || typeof raw !== "object") return null;
  const messageId = String(raw.messageId || "").trim();
  const senderId = String(raw.senderId || "").trim();
  const text = String(raw.text || "").trim();
  if (!messageId || !senderId || !text) return null;
  return { messageId, senderId, text: text.slice(0, 180) };
};

const mapMentions = (raw: any): ChatMention[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .map((item) => ({
      userId: String(item?.userId || "").trim(),
      displayName: String(item?.displayName || "").trim(),
    }))
    .filter((item) => {
      if (!item.userId || seen.has(item.userId)) return false;
      seen.add(item.userId);
      return true;
    });
};

const mapReactions = (raw: any): Record<string, string> => {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([userId, emoji]) =>
        Boolean(userId) && typeof emoji === "string" && emoji.trim().length > 0,
    ),
  ) as Record<string, string>;
};

const mapMessage = (id: string, data: any): Message => ({
  id,
  text: data.text,
  senderId: data.senderId,
  senderCoupleMember: parseCoupleMember(data.senderCoupleMember),
  createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
  mentions: mapMentions(data.mentions),
  replyTo: mapReplyTo(data.replyTo),
  reactions: mapReactions(data.reactions),
});

const CHATS_COL = "chats";
const MESSAGES_SUBCOL = "messages";

/**
 * Deterministic id for direct chats between two users.
 */
export function getDirectChatId(userAId: string, userBId: string): string {
  return [userAId, userBId].sort().join("_");
}

/**
 * Create or return existing direct chat between two users.
 * For direct chats we use a deterministic id (`userA_userB` sorted) so duplicates are prevented.
 */
export async function createChatIfNotExists(
  userAId: string,
  userBId: string,
  type: ChatType = "direct",
): Promise<Chat> {
  if (type === "global") {
    const globalId = "global";
    const ref = doc(db, CHATS_COL, globalId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...(snap.data() as any) } as Chat;

    const now = serverTimestamp();
    await setDoc(ref, {
      type: "global",
      participants: [],
      createdAt: now,
      lastMessageAt: now,
    });
    const created = await getDoc(ref);
    return { id: created.id, ...(created.data() as any) } as Chat;
  }

  // deterministic id for direct chats
  const pair = getDirectChatId(userAId, userBId);
  const chatRef = doc(db, CHATS_COL, pair);
  const chatSnap = await getDoc(chatRef);
  if (chatSnap.exists())
    return { id: chatSnap.id, ...(chatSnap.data() as any) } as Chat;

  const createdAt = serverTimestamp();
  const chatData = {
    type,
    participants: [userAId, userBId],
    createdAt,
    lastMessageAt: createdAt,
  };

  await setDoc(chatRef, chatData);
  const created = await getDoc(chatRef);
  return { id: created.id, ...(created.data() as any) } as Chat;
}

export async function getChatById(chatId: string): Promise<Chat | null> {
  if (!chatId) return null;
  const snap = await getDoc(doc(db, CHATS_COL, chatId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Chat;
}

/**
 * Send a message to a chat: create message doc and update chat.lastMessage atomically (batch).
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
  senderCoupleMemberOrOptions?: CoupleMember | null | SendMessageOptions,
): Promise<{ id: string }> {
  const options: SendMessageOptions =
    senderCoupleMemberOrOptions &&
    typeof senderCoupleMemberOrOptions === "object" &&
    !Array.isArray(senderCoupleMemberOrOptions) &&
    ("mentions" in senderCoupleMemberOrOptions ||
      "replyTo" in senderCoupleMemberOrOptions ||
      "senderCoupleMember" in senderCoupleMemberOrOptions)
      ? senderCoupleMemberOrOptions
      : { senderCoupleMember: senderCoupleMemberOrOptions as CoupleMember | null | undefined };

  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const msgRef = doc(messagesCol);
  const coupleMember = parseCoupleMember(options.senderCoupleMember);
  const mentions = (options.mentions || []).filter(
    (mention) => mention.userId && mention.userId !== senderId,
  );
  const replyTo = options.replyTo || null;

  const batch = writeBatch(db);

  batch.set(msgRef, {
    text,
    senderId,
    createdAt: serverTimestamp(),
    mentions,
    ...(coupleMember ? { senderCoupleMember: coupleMember } : {}),
    ...(replyTo
      ? {
          replyTo: {
            messageId: replyTo.messageId,
            senderId: replyTo.senderId,
            text: String(replyTo.text || "").slice(0, 180),
          },
        }
      : {}),
  });

  batch.update(chatRef, {
    lastMessage: {
      text,
      senderId,
      ...(coupleMember ? { senderCoupleMember: coupleMember } : {}),
    },
    lastMessageAt: serverTimestamp(),
    [`lastReadBy.${senderId}`]: serverTimestamp(),
  });

  await batch.commit();

  void notifyChatMessageRecipients({
    chatId,
    messageId: msgRef.id,
    senderId,
    text,
    mentionUserIds: mentions.map((mention) => mention.userId),
  }).catch((error) => {
    console.warn("Falha ao enviar push do chat:", error);
  });

  return { id: msgRef.id };
}

export async function setMessageReaction(
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string | null,
): Promise<void> {
  if (!chatId || !messageId || !userId) return;
  const msgRef = doc(db, CHATS_COL, chatId, MESSAGES_SUBCOL, messageId);
  const trimmed = String(emoji || "").trim();
  await updateDoc(msgRef, {
    [`reactions.${userId}`]: trimmed ? trimmed : deleteField(),
  });
}

/**
 * Ensure direct chat exists and send a message in one flow.
 */
export async function sendDirectMessage(
  senderId: string,
  recipientId: string,
  text: string,
): Promise<Chat> {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    throw new Error("Mensagem vazia");
  }

  const chat = await createChatIfNotExists(senderId, recipientId, "direct");
  await sendMessage(chat.id, senderId, trimmed);
  return chat;
}

/**
 * Mark a chat as read for a specific user.
 */
export async function markChatAsRead(
  chatId: string,
  userId: string,
): Promise<void> {
  if (!chatId || !userId) return;
  const chatRef = doc(db, CHATS_COL, chatId);
  await updateDoc(chatRef, {
    [`lastReadBy.${userId}`]: serverTimestamp(),
  });
}

/**
 * Listen to most recent messages in a chat (real-time). Returns unsubscribe.
 * Query returns messages ordered by createdAt desc limited by `limitCount`.
 */
export function listenToMessages(
  chatId: string,
  onUpdate: (messages: Message[], meta: { hasMore: boolean }) => void,
  limitCount = 20,
): () => void {
  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const q = query(messagesCol, orderBy("createdAt", "desc"), limit(limitCount));

  const unsubscribe = onSnapshot(q, (snap: QuerySnapshot<DocumentData>) => {
    const msgs: Message[] = [];
    snap.docs.forEach((d) => {
      msgs.push(mapMessage(d.id, d.data()));
    });

    // Firestore returns newest first (desc) — reverse for UI chronological order
    const ordered = msgs.reverse();
    onUpdate(ordered, { hasMore: snap.size >= limitCount });
  });

  return unsubscribe;
}

/**
 * Load older messages for pagination. Returns messages ordered chronologically (oldest -> newest).
 */
export async function loadMoreMessages(
  chatId: string,
  lastVisibleCreatedAt: any, // Firestore Timestamp
  pageSize = 20,
): Promise<Message[]> {
  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const q = query(
    messagesCol,
    orderBy("createdAt", "desc"),
    startAfter(lastVisibleCreatedAt),
    limit(pageSize),
  );

  const snap = await getDocs(q);
  const msgs: Message[] = snap.docs.map((d) => mapMessage(d.id, d.data()));

  return msgs.reverse(); // chronological order
}

/**
 * Get chats for a user (with lightweight fields) and subscribe to changes.
 * Admins receive all chats; others receive only chats where they are participants.
 */
export function listenToUserChats(
  userId: string,
  role: string,
  onUpdate: (chats: Chat[]) => void,
): () => void {
  let q: Query;
  const chatsCol = collection(db, CHATS_COL);

  if (role === "admin") {
    q = query(
      chatsCol,
      where("participants", "array-contains", userId),
      orderBy("lastMessageAt", "desc"),
    );
  } else {
    q = query(
      chatsCol,
      where("participants", "array-contains", userId),
      orderBy("lastMessageAt", "desc"),
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const chats: Chat[] = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as Chat,
      );
      onUpdate(chats);
    },
    (err) => {
      // Helpful log when Firestore requires a composite index
      console.error("Firestore listener error (listenToUserChats):", err);
      if (err && err.code === "failed-precondition") {
        console.warn(
          "Firestore requires a composite index for this query. Open the console link in the error message to create it.",
        );
      }
    },
  );

  return unsubscribe;
}

/**
 * Helper: get (non-listening) chats for user (one-time)
 */
export async function getChatsForUser(
  userId: string,
  role: string,
): Promise<Chat[]> {
  const chatsCol = collection(db, CHATS_COL);
  let q: Query;
  if (role === "admin") {
    q = query(
      chatsCol,
      where("participants", "array-contains", userId),
      orderBy("lastMessageAt", "desc"),
    );
  } else {
    q = query(
      chatsCol,
      where("participants", "array-contains", userId),
      orderBy("lastMessageAt", "desc"),
    );
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat);
}

/**
 * Fallback: get chats for user without ordering (avoids composite index requirement).
 * Use this for initial population when composite index isn't available yet.
 */
export async function getChatsForUserNoOrder(userId: string, role: string): Promise<Chat[]> {
  const chatsCol = collection(db, CHATS_COL);
  const q = query(chatsCol, where("participants", "array-contains", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat);
}

export default {
  getDirectChatId,
  createChatIfNotExists,
  getChatById,
  sendMessage,
  sendDirectMessage,
  setMessageReaction,
  markChatAsRead,
  listenToMessages,
  loadMoreMessages,
  listenToUserChats,
  getChatsForUser,
  getChatsForUserNoOrder,
};
