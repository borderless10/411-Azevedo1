import {
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import {
  getWishlistsCollection,
  getWishlistDoc,
  getDocData,
  convertWishlistFromFirestore,
  convertWishlistToFirestore,
} from "../lib/firestore";
import {
  WishlistItem,
  CreateWishlistData,
  UpdateWishlistData,
} from "../types/wishlist";
import { activityServices } from "./activityServices";
import { formatCurrency } from "../utils/currencyUtils";

export const wishlistServices = {
  async createWishlist(
    userId: string,
    data: CreateWishlistData,
  ): Promise<WishlistItem> {
    console.log("💖 [WISHLIST] Criando item de wishlist...", data);
    if (!data.name || data.name.trim().length === 0) {
      throw new Error("Nome é obrigatório");
    }
    if (!data.value || data.value <= 0) {
      throw new Error("Valor deve ser maior que zero");
    }

    try {
      const now = new Date();
      const docData: any = {
        userId,
        name: data.name.trim(),
        value: data.value,
        description: data.description?.trim() || "",
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      const docRef = await addDoc(getWishlistsCollection(), docData);

      const item: WishlistItem = {
        id: docRef.id,
        userId,
        name: data.name.trim(),
        value: data.value,
        description: data.description?.trim(),
        createdAt: now,
        updatedAt: now,
      };

      await activityServices.logActivity(userId, {
        type: "wishlist_created",
        title: `Desejo criado: ${data.name}`,
        description: `Valor: ${formatCurrency(data.value)}`,
        metadata: { name: data.name, value: data.value },
      });

      return item;
    } catch (error) {
      console.error("❌ [WISHLIST] Erro ao criar:", error);
      throw error;
    }
  },

  async getWishlist(userId: string): Promise<WishlistItem[]> {
    console.log("💖 [WISHLIST] Buscando wishlist do usuário...", userId);
    try {
      const q = query(getWishlistsCollection(), where("userId", "==", userId));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) =>
        convertWishlistFromFirestore(getDocData(d)),
      );
      items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return items;
    } catch (error) {
      console.error("❌ [WISHLIST] Erro ao buscar:", error);
      throw error;
    }
  },

  async getById(id: string): Promise<WishlistItem | null> {
    try {
      const docRef = getWishlistDoc(id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return convertWishlistFromFirestore(getDocData(snap));
    } catch (error) {
      console.error("❌ [WISHLIST] Erro ao buscar por ID:", error);
      throw error;
    }
  },

  async updateWishlist(
    id: string,
    data: UpdateWishlistData,
  ): Promise<WishlistItem> {
    console.log("💖 [WISHLIST] Atualizando item:", id, data);
    try {
      const docRef = getWishlistDoc(id);
      const updateData = convertWishlistToFirestore({
        ...data,
        updatedAt: new Date(),
      } as any);
      await updateDoc(docRef, updateData);
      const updated = await this.getById(id);
      if (!updated) throw new Error("Erro ao buscar item atualizado");
      return updated;
    } catch (error) {
      console.error("❌ [WISHLIST] Erro ao atualizar:", error);
      throw error;
    }
  },

  async deleteWishlist(id: string): Promise<void> {
    console.log("💖 [WISHLIST] Deletando item:", id);
    try {
      const existing = await this.getById(id);
      const docRef = getWishlistDoc(id);
      await deleteDoc(docRef);
      if (existing) {
        await activityServices.logActivity(existing.userId, {
          type: "wishlist_deleted",
          title: `Desejo removido: ${existing.name}`,
          description: `Valor: ${formatCurrency(existing.value)}`,
          metadata: { name: existing.name, value: existing.value },
        });
      }
    } catch (error) {
      console.error("❌ [WISHLIST] Erro ao deletar:", error);
      throw error;
    }
  },
};
