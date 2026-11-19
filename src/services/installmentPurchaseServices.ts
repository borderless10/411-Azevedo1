import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import {
  getExpenseDoc,
  getExpensesCollection,
  getInstallmentPurchaseDoc,
  getInstallmentPurchasesCollection,
} from "../lib/firestore";
import {
  CreateInstallmentPurchaseInput,
  InstallmentPurchase,
  UpdateInstallmentPurchaseInput,
} from "../types/installmentPurchase";
import expenseServices from "./expenseServices";
import {
  addMonths,
  isFutureCalendarDay,
  normalizeToLocalMidday,
} from "../utils/dateUtils";

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

const parcelDescription = (title: string, index: number, total: number) =>
  `${title} (${index}/${total})`;

const isLegacyParcelExpense = (
  data: Record<string, any>,
  purchase: Pick<
    InstallmentPurchase,
    "title" | "cardId" | "installmentsCount"
  >,
): boolean => {
  if (String(data?.category || "") !== "Parcelado") return false;
  if (purchase.cardId && data?.cardId && data.cardId !== purchase.cardId) {
    return false;
  }
  const description = String(data?.description || "").trim();
  const title = String(purchase.title || "").trim();
  if (!title || !description.startsWith(`${title} (`)) return false;
  const match = description.match(/\((\d+)\/(\d+)\)$/);
  if (!match) return false;
  const total = Number(match[2]);
  return total === Number(purchase.installmentsCount);
};

const validateInput = (input: CreateInstallmentPurchaseInput) => {
  const title = input.title.trim();
  if (!title) throw new Error("Informe o título da compra");
  if (!input.cardId) throw new Error("Selecione um cartão");
  if (input.installmentsCount < 1) {
    throw new Error("Quantidade de parcelas inválida");
  }
  if (isFutureCalendarDay(input.purchaseDate)) {
    throw new Error("Data não pode ser no futuro");
  }
  return title;
};

const resolveInstallmentAmount = (input: CreateInstallmentPurchaseInput) =>
  input.installmentAmount > 0
    ? input.installmentAmount
    : input.totalAmount / input.installmentsCount;

const findRelatedExpenseIds = async (
  userId: string,
  purchase: InstallmentPurchase,
): Promise<string[]> => {
  const snap = await getDocs(
    query(getExpensesCollection(), where("userId", "==", userId)),
  );
  return snap.docs
    .filter((docSnap) => {
      const data = docSnap.data() as Record<string, any>;
      if (String(data?.installmentPurchaseId || "") === purchase.id) {
        return true;
      }
      return isLegacyParcelExpense(data, purchase);
    })
    .map((docSnap) => docSnap.id);
};

const deleteRelatedExpenses = async (
  userId: string,
  purchase: InstallmentPurchase,
): Promise<number> => {
  const ids = await findRelatedExpenseIds(userId, purchase);
  for (const id of ids) {
    try {
      await deleteDoc(getExpenseDoc(id));
    } catch (error) {
      console.warn("Falha ao remover parcela vinculada", id, error);
    }
  }
  return ids.length;
};

const createParcelExpenses = async (
  userId: string,
  purchaseId: string,
  title: string,
  purchaseDate: Date,
  installmentAmount: number,
  cardId: string,
  installmentsCount: number,
) => {
  for (let i = 0; i < installmentsCount; i += 1) {
    const parcelDate = normalizeToLocalMidday(addMonths(purchaseDate, i));
    await expenseServices.createExpense(userId, {
      value: installmentAmount,
      description: parcelDescription(title, i + 1, installmentsCount),
      date: parcelDate,
      category: "Parcelado",
      paymentMethod: "credit_card",
      cardId,
      installmentPurchaseId: purchaseId,
      allowFutureDate: true,
    });
  }
};

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

  async getById(id: string): Promise<InstallmentPurchase | null> {
    const snap = await getDoc(getInstallmentPurchaseDoc(id));
    if (!snap.exists()) return null;
    return fromFirestore(snap.id, snap.data());
  },

  async create(
    actingUserId: string,
    userId: string,
    input: CreateInstallmentPurchaseInput,
  ): Promise<InstallmentPurchase> {
    const title = validateInput(input);
    const installmentAmount = resolveInstallmentAmount(input);
    const purchaseDate = normalizeToLocalMidday(input.purchaseDate);
    const now = Timestamp.now();
    const docRef = await addDoc(getInstallmentPurchasesCollection(), {
      userId,
      title,
      purchaseDate: Timestamp.fromDate(purchaseDate),
      totalAmount: input.totalAmount,
      installmentAmount,
      cardId: input.cardId,
      installmentsCount: input.installmentsCount,
      remainingInstallments: input.installmentsCount,
      createdBy: actingUserId,
      createdAt: now,
      updatedAt: now,
    });

    await createParcelExpenses(
      userId,
      docRef.id,
      title,
      purchaseDate,
      installmentAmount,
      input.cardId,
      input.installmentsCount,
    );

    return fromFirestore(docRef.id, {
      userId,
      title,
      purchaseDate: Timestamp.fromDate(purchaseDate),
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

  async update(
    id: string,
    userId: string,
    input: UpdateInstallmentPurchaseInput,
  ): Promise<InstallmentPurchase> {
    const existing = await installmentPurchaseServices.getById(id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Compra parcelada não encontrada");
    }

    const title = validateInput(input);
    const installmentAmount = resolveInstallmentAmount(input);
    const purchaseDate = normalizeToLocalMidday(input.purchaseDate);
    const paidCount = Math.max(
      0,
      existing.installmentsCount - existing.remainingInstallments,
    );
    const remainingInstallments = Math.max(
      0,
      input.installmentsCount - paidCount,
    );

    await deleteRelatedExpenses(userId, existing);

    const now = Timestamp.now();
    await updateDoc(getInstallmentPurchaseDoc(id), {
      title,
      purchaseDate: Timestamp.fromDate(purchaseDate),
      totalAmount: input.totalAmount,
      installmentAmount,
      cardId: input.cardId,
      installmentsCount: input.installmentsCount,
      remainingInstallments,
      updatedAt: now,
    });

    await createParcelExpenses(
      userId,
      id,
      title,
      purchaseDate,
      installmentAmount,
      input.cardId,
      input.installmentsCount,
    );

    return {
      ...existing,
      title,
      purchaseDate,
      totalAmount: input.totalAmount,
      installmentAmount,
      cardId: input.cardId,
      installmentsCount: input.installmentsCount,
      remainingInstallments,
      updatedAt: now.toDate(),
    };
  },

  async remove(id: string, userId: string): Promise<void> {
    const existing = await installmentPurchaseServices.getById(id);
    if (!existing || existing.userId !== userId) {
      throw new Error("Compra parcelada não encontrada");
    }
    await deleteRelatedExpenses(userId, existing);
    await deleteDoc(getInstallmentPurchaseDoc(id));
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
