import {
  addDoc,
  deleteDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import {
  getUserNoteDoc,
  getUserNotesCollection,
} from "../lib/firestore";
import { CreateUserNoteInput, UserNote } from "../types/userNote";

const fromFirestore = (id: string, data: Record<string, any>): UserNote => ({
  id,
  userId: data.userId,
  title: data.title,
  body: data.body,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

export const userNotesServices = {
  async list(userId: string): Promise<UserNote[]> {
    const q = query(
      getUserNotesCollection(),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async create(userId: string, input: CreateUserNoteInput): Promise<UserNote> {
    const title = input.title.trim();
    if (!title) throw new Error("Título obrigatório");
    const now = Timestamp.now();
    const docRef = await addDoc(getUserNotesCollection(), {
      userId,
      title,
      body: input.body.trim(),
      createdAt: now,
      updatedAt: now,
    });
    return fromFirestore(docRef.id, {
      userId,
      title,
      body: input.body.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },

  async update(
    userId: string,
    noteId: string,
    input: Partial<CreateUserNoteInput>,
  ): Promise<void> {
    const now = Timestamp.now();
    const payload: Record<string, unknown> = { updatedAt: now, userId };
    if (input.title !== undefined) payload.title = input.title.trim();
    if (input.body !== undefined) payload.body = input.body.trim();
    await updateDoc(getUserNoteDoc(noteId), payload);
  },

  async remove(_userId: string, noteId: string): Promise<void> {
    await deleteDoc(getUserNoteDoc(noteId));
  },
};

export default userNotesServices;