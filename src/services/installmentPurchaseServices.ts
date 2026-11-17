import {
  addDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import {
  getInstallmentPurchaseDoc,
  getInstallmentPurchasesCollection,
} from "../lib/firestore";
import {
  CreateInstallmentPurchaseInput,
  InstallmentPurchase,
} from "../types/installmentPurchase";
import expenseServices from "./expenseServices";
import { addMonths } from "../utils/dateUtils";

const fromFirestore = (id: string, data: Record<string, any>): InstallmentPurchase => ({
  id,
  userId: data.userId,
  title: data.title,
  purchaseDate: data.purchaseDate?.toDate?.() ?? new Date(),
  totalAmount: Number(data.totalAmount) || 0,
  installmentAmount: Number(data.installmentAmount) || 0,
  cardId: data.cardId,
  installmentsCount: Number(data.installmentsCount) || 0,
  remainingInstallments: Number(data.remainingInstallments) || 0,
  createdBy: data.createdBy,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
});

export const installmentPurchaseServices = {
  async listForUser(userId: string): Promise<InstallmentPurchase[]> {
    const q = query(
      getInstallmentPurchasesCollection(),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async create(
    actingUserId: string,
    userId: string,
    input: CreateInstallmentPurchaseInput,
  ): Promise<InstallmentPurchase> {
    const title = input.title.trim();
    if (!title) throw new Error("Informe o título da compra");
    if (!input.cardId) throw new Error("Selecione um cartão");
    if (input.installmentsCount < 1) {
      throw new Error("Quantidade de parcelas inválida");
    }
    const installmentAmount =
      input.installmentAmount > 0
        ? input.installmentAmount
        : input.totalAmount / input.installmentsCount;

    const now = Timestamp.now();
    const docRef = await addDoc(getInstallmentPurchasesCollection(), {
      userId,
      title,
      purchaseDate: Timestamp.fromDate(input.purchaseDate),
      totalAmount: input.totalAmount,
      installmentAmount,
      cardId: input.cardId,
      installmentsCount: input.installmentsCount,
      remainingInstallments: input.installmentsCount,
      createdBy: actingUserId,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < input.installmentsCount; i += 1) {
      const parcelDate = addMonths(input.purchaseDate, i);
      await expenseServices.createExpense(userId, {
        value: installmentAmount,
        description: `${title} (${i + 1}/${input.installmentsCount})`,
        date: parcelDate,
        category: "Parcelado",
        paymentMethod: "credit_card",
        cardId: input.cardId,
      });
    }

    return fromFirestore(docRef.id, {
      userId,
      title,
      purchaseDate: Timestamp.fromDate(input.purchaseDate),
      totalAmount: input.totalAmount,
      installmentAmount,
      cardId: input.cardId,
      installmentsCount: input.installmentsCount,
      remainingInstallments: input.installmentsCount,
      createdBy: actingUserId,
      createdAt: now,
      updatedAt: now,
    });
  },

  async markParcelPaid(id: string): Promise<void> {
    const docRef = getInstallmentPurchaseDoc(id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;
    const remaining = Math.max(0, Number(snap.data().remainingInstallments) - 1);
    await updateDoc(docRef, {
      remainingInstallments: remaining,
      updatedAt: Timestamp.now(),
    });
  },
};

export default installmentPurchaseServices;