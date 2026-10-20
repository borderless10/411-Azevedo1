import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

const seenRef = (userId: string, chatId: string) =>
  doc(db, "users", userId, "chatMentionSeen", chatId);

export const loadSeenMentionIds = async (
  userId: string,
  chatId: string,
): Promise<string[]> => {
  if (!userId || !chatId) return [];
  const snap = await getDoc(seenRef(userId, chatId));
  if (!snap.exists()) return [];
  const raw = snap.data()?.seenIds;
  if (!Array.isArray(raw)) return [];
  return raw.map((id) => String(id || "")).filter(Boolean);
};

export const saveSeenMentionIds = async (
  userId: string,
  chatId: string,
  seenIds: string[],
): Promise<void> => {
  if (!userId || !chatId) return;
  await setDoc(
    seenRef(userId, chatId),
    { seenIds, updatedAt: new Date().toISOString() },
    { merge: true },
  );
};
