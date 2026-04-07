import {
  addDoc,
  arrayUnion,
  collection,
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
  DocumentReference,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { timestampToDate } from "../lib/firestore";

export type ChatType = "direct" | "group" | "global";

export interface Chat {
  id: string;
  type: ChatType;
  participants: string[];
  lastMessage?: { text: string; senderId: string };
  lastMessageAt?: any; // Firestore Timestamp
  createdAt?: any;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  createdAt: Date;
}

const CHATS_COL = "chats";
const MESSAGES_SUBCOL = "messages";

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
  const pair = [userAId, userBId].sort().join("_");
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
 * Send a message to a chat: create message doc and update chat.lastMessage atomically (batch).
 */
export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string,
): Promise<void> {
  const chatRef = doc(db, CHATS_COL, chatId);
  const messagesCol = collection(chatRef, MESSAGES_SUBCOL);
  const msgRef = doc(messagesCol); // auto-id doc reference

  const batch = writeBatch(db);

  batch.set(msgRef, {
    text,
    senderId,
    createdAt: serverTimestamp(),
  });

  batch.update(chatRef, {
    lastMessage: { text, senderId },
    lastMessageAt: serverTimestamp(),
  });

  await batch.commit();
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
      const data = d.data() as any;
      msgs.push({
        id: d.id,
        text: data.text,
        senderId: data.senderId,
        createdAt: data.createdAt
          ? timestampToDate(data.createdAt)
          : new Date(),
      });
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
  const msgs: Message[] = snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      text: data.text,
      senderId: data.senderId,
      createdAt: data.createdAt ? timestampToDate(data.createdAt) : new Date(),
    };
  });

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
    q = query(chatsCol, orderBy("lastMessageAt", "desc"));
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
    q = query(chatsCol, orderBy("lastMessageAt", "desc"));
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
  if (role === "admin") {
    const snap = await getDocs(chatsCol);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat);
  }

  const q = query(chatsCol, where("participants", "array-contains", userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as Chat);
}

export default {
  createChatIfNotExists,
  sendMessage,
  listenToMessages,
  loadMoreMessages,
  listenToUserChats,
  getChatsForUser,
};
