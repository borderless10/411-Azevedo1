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
  getExpenseChangeRequestsCollection,
  getExpenseChangeRequestDoc,
} from "../lib/firestore";
import {
  CreateExpenseChangeRequestInput,
  ExpenseChangeRequest,
  ExpenseChangeRequestStatus,
} from "../types/expenseChangeRequest";
import { planningServices } from "./planningServices";
import { canOperateAsConsultant } from "../utils/staffAccess";
import { userService } from "./userServices";

const fromFirestore = (id: string, data: Record<string, any>): ExpenseChangeRequest => ({
  id,
  userId: data.userId,
  title: data.title,
  type: data.type,
  amount: data.amount != null ? Number(data.amount) : undefined,
  notes: data.notes,
  status: data.status,
  createdAt: data.createdAt?.toDate?.() ?? new Date(),
  updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
  reviewedAt: data.reviewedAt?.toDate?.(),
  reviewedBy: data.reviewedBy,
  reviewNotes: data.reviewNotes,
});

export const expenseChangeRequestServices = {
  async create(userId: string, input: CreateExpenseChangeRequestInput) {
    const title = input.title.trim();
    if (title.length < 2) {
      throw new Error("Informe um título válido");
    }
    const now = Timestamp.now();
    const docRef = await addDoc(getExpenseChangeRequestsCollection(), {
      userId,
      title,
      type: input.type,
      amount: input.amount != null ? Number(input.amount) : null,
      notes: input.notes?.trim() || "",
      status: "pending" satisfies ExpenseChangeRequestStatus,
      createdAt: now,
      updatedAt: now,
    });
    return fromFirestore(docRef.id, {
      userId,
      title,
      type: input.type,
      amount: input.amount,
      notes: input.notes,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },

  async listForUser(userId: string): Promise<ExpenseChangeRequest[]> {
    const q = query(
      getExpenseChangeRequestsCollection(),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async listPendingForUser(userId: string): Promise<ExpenseChangeRequest[]> {
    const q = query(
      getExpenseChangeRequestsCollection(),
      where("userId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => fromFirestore(d.id, d.data()));
  },

  async review(
    reviewerId: string,
    requestId: string,
    decision: "approved" | "rejected",
    reviewNotes?: string,
  ): Promise<ExpenseChangeRequest> {
    const docRef = getExpenseChangeRequestDoc(requestId);
    const found = await getDoc(docRef);
    if (!found.exists()) {
      throw new Error("Solicitação não encontrada");
    }
    const current = fromFirestore(found.id, found.data());
    if (current.status !== "pending") {
      throw new Error("Solicitação já foi revisada");
    }

    const reviewer = await userService.getUserById(reviewerId);
    if (!reviewer || !canOperateAsConsultant(reviewer)) {
      throw new Error("Sem permissão para revisar");
    }

    const now = Timestamp.now();
    if (decision === "approved") {
      if (current.type === "extra") {
        await planningServices.addBill(reviewerId, current.userId, {
          name: current.title,
          amount: Number(current.amount) || 0,
          notes: current.notes || "Solicitado pelo cliente",
        });
      } else {
        await planningServices.addExpectedExpense(reviewerId, current.userId, {
          source: current.title,
          amount: Number(current.amount) || 0,
          dailyTracking: true,
          notes: current.notes,
          paymentMethod: "cash",
        });
      }
    }

    await updateDoc(docRef, {
      status: decision,
      reviewedAt: now,
      reviewedBy: reviewerId,
      reviewNotes: reviewNotes?.trim() || "",
      updatedAt: now,
    });

    return {
      ...current,
      status: decision,
      reviewedAt: now.toDate(),
      reviewedBy: reviewerId,
      reviewNotes: reviewNotes?.trim() || "",
      updatedAt: now.toDate(),
    };
  },
};

export default expenseChangeRequestServices;