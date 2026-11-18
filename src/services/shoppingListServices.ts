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
  getShoppingListItemDoc,
  getShoppingListItemsCollection,
} from "../lib/firestore";
import {
  CreateShoppingListItemInput,
  ShoppingListItem,
} from "../types/shoppingListItem";

const normalizeValue = (raw: unknown): number => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const fromFirestore = (
  id: string,
  data: Record<string, any>,
): ShoppingListItem => ({
  id,
  userId: data.userId,
  label: data.label,
  value: normalizeValue(data.value),
  done: Boolean(data.done),
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

export const shoppingListServices = {
  async list(userId: string): Promise<ShoppingListItem[]> {
    const q = query(
      getShoppingListItemsCollection(),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async create(
    userId: string,
    input: CreateShoppingListItemInput,
  ): Promise<ShoppingListItem> {
    const label = input.label.trim();
    if (!label) throw new Error("Informe o item");
    const value = normalizeValue(input.value);
    const now = Timestamp.now();
    const docRef = await addDoc(getShoppingListItemsCollection(), {
      userId,
      label,
      value,
      done: false,
      createdAt: now,
      updatedAt: now,
    });
    return fromFirestore(docRef.id, {
      userId,
      label,
      value,
      done: false,
      createdAt: now,
      updatedAt: now,
    });
  },

  async toggle(userId: string, itemId: string, done: boolean): Promise<void> {
    await updateDoc(getShoppingListItemDoc(itemId), {
      userId,
      done,
      updatedAt: Timestamp.now(),
    });
  },

  async remove(_userId: string, itemId: string): Promise<void> {
    await deleteDoc(getShoppingListItemDoc(itemId));
  },
};

export default shoppingListServices;
