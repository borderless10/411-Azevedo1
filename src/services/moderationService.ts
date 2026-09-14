import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "other";

export interface ContentReportInput {
  reporterId: string;
  reportedUserId: string;
  chatId: string;
  messageId?: string;
  messageText?: string;
  reason: ReportReason;
  details?: string;
}

const BLOCKS_COL = "blocks";
const REPORTS_COL = "reports";

function blockDocId(blockerId: string, blockedId: string): string {
  return `${blockerId}_${blockedId}`;
}

export async function reportContent(input: ContentReportInput): Promise<void> {
  await addDoc(collection(db, REPORTS_COL), {
    reporterId: input.reporterId,
    reportedUserId: input.reportedUserId,
    chatId: input.chatId,
    messageId: input.messageId || null,
    messageText: input.messageText
      ? String(input.messageText).slice(0, 500)
      : null,
    reason: input.reason,
    details: input.details || null,
    status: "open",
    createdAt: serverTimestamp(),
  });
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new Error("Não é possível bloquear este usuário.");
  }

  const ref = doc(db, BLOCKS_COL, blockDocId(blockerId, blockedId));
  await setDoc(ref, {
    blockerId,
    blockedId,
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const ref = doc(db, BLOCKS_COL, blockDocId(blockerId, blockedId));
  await deleteDoc(ref);
}

export async function isUserBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  if (!blockerId || !blockedId) return false;
  const snap = await getDoc(
    doc(db, BLOCKS_COL, blockDocId(blockerId, blockedId)),
  );
  return snap.exists();
}

export async function getBlockedUserIds(blockerId: string): Promise<string[]> {
  if (!blockerId) return [];
  const q = query(
    collection(db, BLOCKS_COL),
    where("blockerId", "==", blockerId),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => String(d.data()?.blockedId || "")).filter(Boolean);
}

export default {
  reportContent,
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUserIds,
};
