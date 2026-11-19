import {
  arrayUnion,
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
import {
  ChatMention,
  normalizeHeartEmojisInText,
  normalizeReactionEmoji,
} from "../utils/chatMentions";
import {
  CHAT_DELETED_MESSAGE_TEXT,
  CHAT_MESSAGE_EDIT_WINDOW_MS,
  canMutateOwnChatMessage,
  isChatMessageDeleted,
} from "../utils/chatMessageMutations";

export type ChatType = "direct" | "group" | "global";

export interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    senderCoupleMember?: CoupleMember;
    kind?: "message" | "reaction";
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
  editedAt?: Date | null;
  deletedAt?: Date | null;
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
  return {
    messageId,
    senderId,
    text: normalizeHeartEmojisInText(text).slice(0, 180),
  };
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
    Object.entries(raw)
      .filter(
        ([userId, emoji]) =>
          Boolean(userId) &&
          typeof emoji === "string" &&
          emoji.trim().length > 0,
      )
      .map(([userId, emoji]) => [
        userId,
        normalizeReactionEmoji(String(emoji)),
      ]),
  ) as Record<string, string>;
};

const mapMessage = (id: string, data: any): Message => ({
  id,
  text: normalizeHeartEmojisInText(String(data.text || "")),
  senderId: data.senderId,
  senderCoupleMember: parseCoupleMember(data.senderCoupleMember),
  createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
  editedAt: data.editedAt ? timestampToDate(data.editedAt) : null,
  deletedAt: data.deletedAt ? timestampToDate(data.deletedAt) : null,
  mentions: mapMentions(data.mentions),
  replyTo: mapReplyTo(data.replyTo),
  reactions: mapReactions(data.reactions),
});

const CHATS_COL = "chats";
const MESSAGES_SUBCOL = "messages";

/** Janela em tempo real. Acima disso o listener fica pesado no aparelho. */
export const CHAT_LIVE_MESSAGE_LIMIT = 50;
/** Página extra ao rolar o histórico. O Firestore aceita até o fim da conversa. */
export const CHAT_OLDER_PAGE_SIZE = 100;

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

/**
 * Inclui um participante em um chat existente.
 * Se passar de 2 pessoas, promove o tipo para "group".
 */
export async function addParticipantToChat(
  chatId: string,
  userId: string,
): Promise<Chat> {
  if (!chatId || !userId) {
    throw new Error("chatId e userId são obrigatórios");
  }

  const chatRef = doc(db, CHATS_COL, chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    throw new Error("Chat não encontrado");
  }

  const data = snap.data() as any;
  if (data?.type === "global" || chatId === "global") {
    throw new Error("Não é possível alterar participantes do chat global");
  }

  const current: string[] = Array.isArray(data?.participants)
    ? data.participants.filter(Boolean)
    : [];

  if (current.includes(userId)) {
    return { id: snap.id, ...(data as any) } as Chat;
  }

  const nextCount = current.length + 1;
  const patch: Record<string, unknown> = {
    participants: arrayUnion(userId),
  };
  if (nextCount > 2 || data?.type === "group") {
    patch.type = "group";
  }

  await updateDoc(chatRef, patch);
  const updated = await getDoc(chatRef);
  return { id: updated.id, ...(updated.data() as any) } as Chat;
}

/**
 * Garante o chat cliente↔consultor e inclui o supervisor nele (vira grupo).
 */
export async function addSupervisorToClientConsultantChat(
  clientId: string,
  consultantId: string,
  supervisorId: string,
): Promise<Chat> {
  if (!clientId || !consultantId || !supervisorId) {
    throw new Error("clientId, consultantId e supervisorId são obrigatórios");
  }
  if (
    clientId === consultantId ||
    clientId === supervisorId ||
    consultantId === supervisorId
  ) {
    throw new Error("Participantes devem ser usuários distintos");
  }

  const baseChat = await createChatIfNotExists(
    clientId,
    consultantId,
    "direct",
  );
  return addParticipantToChat(baseChat.id, supervisorId);
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

  const normalizedText = normalizeHeartEmojisInText(text);
  const batch = writeBatch(db);

  batch.set(msgRef, {
    text: normalizedText,
    senderId,
    createdAt: serverTimestamp(),
    mentions,
    ...(coupleMember ? { senderCoupleMember: coupleMember } : {}),
    ...(replyTo
      ? {
          replyTo: {
            messageId: replyTo.messageId,
            senderId: replyTo.senderId,
            text: normalizeHeartEmojisInText(
              String(replyTo.text || "").slice(0, 180),
            ),
          },
        }
      : {}),
  });

  batch.update(chatRef, {
    lastMessage: {
      text: normalizedText,
      senderId,
      ...(coupleMember ? { senderCoupleMember: coupleMember } : {}),
      ...(mentions.length
        ? { mentionUserIds: mentions.map((mention) => mention.userId) }
        : { mentionUserIds: [] }),
    },
    lastMessageAt: serverTimestamp(),
    [`lastReadBy.${senderId}`]: serverTimestamp(),
  });

  await batch.commit();

  return { id: msgRef.id };
}

const assertOwnMessageMutable = (
  senderId: string,
  userId: string,
  message: Pick<Message, "createdAt" | "deletedAt">,
) => {
  if (senderId !== userId) {
    throw new Error("Só o autor pode alterar esta mensagem.");
  }
  if (!canMutateOwnChatMessage(message)) {
    throw new Error("O prazo de 1 hora para editar ou apagar expirou.");
  }
  if (isChatMessageDeleted(message)) {
    throw new Error("Esta mensagem já foi apagada.");
  }
};

export async function editMessage(
  chatId: string,
  messageId: string,
  userId: string,
  nextText: string,
  mentions: ChatMention[] = [],
): Promise<void> {
  if (!chatId || !messageId || !userId) return;
  const trimmed = normalizeHeartEmojisInText(String(nextText || "").trim());
  if (!trimmed) {
    throw new Error("Mensagem vazia");
  }

  const msgRef = doc(db, CHATS_COL, chatId, MESSAGES_SUBCOL, messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) {
    throw new Error("Mensagem não encontrada.");
  }
  const data = snap.data() as any;
  const current: Pick<Message, "createdAt" | "deletedAt" | "senderId"> = {
    senderId: String(data.senderId || ""),
    createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(0),
    deletedAt: data.deletedAt ? timestampToDate(data.deletedAt) : null,
  };
  assertOwnMessageMutable(current.senderId, userId, current);

  const sanitizedMentions = mentions.filter(
    (mention) => mention.userId && mention.userId !== userId,
  );

  await updateDoc(msgRef, {
    text: trimmed,
    editedAt: serverTimestamp(),
    mentions: sanitizedMentions,
  });

  await syncChatLastMessagePreview(chatId, messageId, {
    text: trimmed,
    senderId: current.senderId,
    senderCoupleMember: data.senderCoupleMember,
    mentionUserIds: sanitizedMentions.map((mention) => mention.userId),
  });
}

const syncChatLastMessagePreview = async (
  chatId: string,
  messageId: string,
  nextLastMessage: {
    text: string;
    senderId: string;
    senderCoupleMember?: CoupleMember | null;
    mentionUserIds?: string[];
  },
): Promise<void> => {
  try {
    const chatRef = doc(db, CHATS_COL, chatId);
    const latestSnap = await getDocs(
      query(
        collection(chatRef, MESSAGES_SUBCOL),
        orderBy("createdAt", "desc"),
        limit(1),
      ),
    );
    const latest = latestSnap.docs[0];
    if (!latest || latest.id !== messageId) return;

    const coupleMember = parseCoupleMember(nextLastMessage.senderCoupleMember);
    await updateDoc(chatRef, {
      lastMessage: {
        text: nextLastMessage.text,
        senderId: nextLastMessage.senderId,
        ...(coupleMember ? { senderCoupleMember: coupleMember } : {}),
        mentionUserIds: nextLastMessage.mentionUserIds || [],
      },
    });
  } catch (error) {
    console.warn(
      "Mensagem atualizada, mas a prévia da conversa não acompanhou:",
      error,
    );
  }
};

export async function softDeleteMessage(
  chatId: string,
  messageId: string,
  userId: string,
): Promise<void> {
  if (!chatId || !messageId || !userId) return;

  const msgRef = doc(db, CHATS_COL, chatId, MESSAGES_SUBCOL, messageId);
  const snap = await getDoc(msgRef);
  if (!snap.exists()) {
    throw new Error("Mensagem não encontrada.");
  }
  const data = snap.data() as any;
  const current: Pick<Message, "createdAt" | "deletedAt" | "senderId"> = {
    senderId: String(data.senderId || ""),
    createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(0),
    deletedAt: data.deletedAt ? timestampToDate(data.deletedAt) : null,
  };
  assertOwnMessageMutable(current.senderId, userId, current);

  await updateDoc(msgRef, {
    text: CHAT_DELETED_MESSAGE_TEXT,
    deletedAt: serverTimestamp(),
    mentions: [],
  });

  await syncChatLastMessagePreview(chatId, messageId, {
    text: CHAT_DELETED_MESSAGE_TEXT,
    senderId: current.senderId,
    senderCoupleMember: data.senderCoupleMember,
    mentionUserIds: [],
  });
}

export async function setMessageReaction(
  chatId: string,
  messageId: string,
  userId: string,
  emoji: string | null,
): Promise<void> {
  if (!chatId || !messageId || !userId) return;
  const msgRef = doc(db, CHATS_COL, chatId, MESSAGES_SUBCOL, messageId);
  const trimmed = normalizeReactionEmoji(String(emoji || ""));
  await updateDoc(msgRef, {
    [`reactions.${userId}`]: trimmed ? trimmed : deleteField(),
  });

  if (!trimmed) return;

  try {
    const chatRef = doc(db, CHATS_COL, chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: `Reagiu ${trimmed}`,
        senderId: userId,
        kind: "reaction",
      },
      lastMessageAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Reação salva, mas o indicador da conversa não atualizou:", error);
  }
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
  onUpdate: (
    messages: Message[],
    meta: { hasMore: boolean; oldestCursor: any | null },
  ) => void,
  limitCount = CHAT_LIVE_MESSAGE_LIMIT,
): () => void {
  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const q = query(messagesCol, orderBy("createdAt", "desc"), limit(limitCount));

  const unsubscribe = onSnapshot(
    q,
    (snap: QuerySnapshot<DocumentData>) => {
      const msgs: Message[] = [];
      snap.docs.forEach((d) => {
        msgs.push(mapMessage(d.id, d.data()));
      });

      // Firestore returns newest first (desc) — reverse for UI chronological order
      const ordered = msgs.reverse();
      const oldestCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
      onUpdate(ordered, {
        hasMore: snap.size >= limitCount,
        oldestCursor,
      });
    },
    (error) => {
      console.warn("Não foi possível ouvir as mensagens", chatId, error);
    },
  );

  return unsubscribe;
}

/**
 * Load older messages for pagination. Returns messages ordered chronologically (oldest -> newest).
 */
export async function loadMoreMessages(
  chatId: string,
  oldestCursor: any,
  pageSize = CHAT_OLDER_PAGE_SIZE,
): Promise<{ messages: Message[]; oldestCursor: any | null; hasMore: boolean }> {
  if (!oldestCursor) {
    return { messages: [], oldestCursor: null, hasMore: false };
  }

  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const q = query(
    messagesCol,
    orderBy("createdAt", "desc"),
    startAfter(oldestCursor),
    limit(pageSize),
  );

  const snap = await getDocs(q);
  const msgs: Message[] = snap.docs.map((d) => mapMessage(d.id, d.data()));

  return {
    messages: msgs.reverse(),
    oldestCursor: snap.docs.length ? snap.docs[snap.docs.length - 1] : oldestCursor,
    hasMore: snap.size >= pageSize,
  };
}

export function listenToChat(
  chatId: string,
  onUpdate: (chat: Chat | null) => void,
): () => void {
  if (!chatId) return () => undefined;
  return onSnapshot(
    doc(db, CHATS_COL, chatId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      onUpdate({ id: snap.id, ...(snap.data() as any) } as Chat);
    },
    (error) => {
      console.warn("Não foi possível ouvir o chat", chatId, error);
    },
  );
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

  // Sem orderBy: evita índice composto e a lista não fica presa no spinner.
  void role;
  q = query(chatsCol, where("participants", "array-contains", userId));

  const unsubscribe = onSnapshot(
    q,
    (snap) => {
      const chats: Chat[] = snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as any) }) as Chat,
      );
      onUpdate(chats);
    },
    (err) => {
      console.error("Firestore listener error (listenToUserChats):", err);
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

export { CHAT_MESSAGE_EDIT_WINDOW_MS, CHAT_DELETED_MESSAGE_TEXT };

export default {
  getDirectChatId,
  createChatIfNotExists,
  addParticipantToChat,
  addSupervisorToClientConsultantChat,
  getChatById,
  sendMessage,
  sendDirectMessage,
  editMessage,
  softDeleteMessage,
  setMessageReaction,
  markChatAsRead,
  listenToMessages,
  loadMoreMessages,
  listenToChat,
  listenToUserChats,
  getChatsForUser,
  getChatsForUserNoOrder,
};
