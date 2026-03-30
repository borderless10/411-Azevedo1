/**
 * Serviço para gerenciar Planning criado por consultores
 */

import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  Planning,
  CreatePlanningData,
  UpdatePlanningData,
  PlanningFirestore,
  Bill,
  BillFirestore,
  ExpectedItem,
  ExpectedItemFirestore,
} from "../types/planning";
import { userService } from "./userServices";
import { activityServices } from "./activityServices";

const getUserPlanningDoc = (userId: string) =>
  doc(db, "users", userId, "planning", "current");

export const planningServices = {
  // helper: ensure the acting consultant is allowed to manage this user's planning
  async ensureOwnerOrAdmin(consultantId: string, userId: string) {
    const consultant = await userService.getUserById(consultantId);
    if (
      !consultant ||
      (consultant.role !== "consultor" && consultant.role !== "admin")
    ) {
      throw new Error("Usuário não autorizado a modificar planejamento");
    }
    // admins can manage any client
    if (consultant.role === "admin") return;

    const target = await userService.getUserById(userId);
    if (!target) throw new Error("Cliente não encontrado");
    if ((target as any).consultantId !== consultantId) {
      throw new Error("Usuário não autorizado a modificar dados deste cliente");
    }
  },
  async getPlanning(userId: string): Promise<Planning | null> {
    try {
      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;

      const data = snap.data() as PlanningFirestore;
      if (__DEV__) {
        console.log("[PLANNING] getPlanning raw", {
          userId,
          hasBills: Array.isArray((data as any)?.bills),
          billsCount: ((data as any)?.bills || []).length,
        });
      }
      // convert nested arrays with Timestamps to Date objects
      const bills = (data.bills || []).map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDay: b.dueDay,
        dueDate: b.dueDate ? b.dueDate.toDate() : undefined,
        categoryId: b.categoryId,
        recurring: b.recurring,
        notes: b.notes,
        status: b.status,
        paidDate: b.paidDate ? b.paidDate.toDate() : undefined,
        createdAt: b.createdAt ? b.createdAt.toDate() : undefined,
        updatedAt: b.updatedAt ? b.updatedAt.toDate() : undefined,
      }));

      if (__DEV__) {
        console.log("[PLANNING] getPlanning mapped bills", {
          userId,
          bills: bills.map((b) => ({
            id: b.id,
            name: b.name,
            status: b.status,
            dueDay: b.dueDay,
            dueDate: b.dueDate,
            paidDate: b.paidDate,
          })),
        });
      }

      const expectedIncomes = (data.expectedIncomes || []).map((it) => ({
        id: it.id,
        source: it.source,
        amount: it.amount,
        expectedMonth: it.expectedMonth,
        categoryId: it.categoryId,
        notes: it.notes,
        createdAt: it.createdAt ? it.createdAt.toDate() : undefined,
        updatedAt: it.updatedAt ? it.updatedAt.toDate() : undefined,
      }));

      const expectedExpenses = (data.expectedExpenses || []).map((it) => ({
        id: it.id,
        source: it.source,
        amount: it.amount,
        expectedMonth: it.expectedMonth,
        categoryId: it.categoryId,
        notes: it.notes,
        createdAt: it.createdAt ? it.createdAt.toDate() : undefined,
        updatedAt: it.updatedAt ? it.updatedAt.toDate() : undefined,
      }));

      return {
        id: snap.id,
        consultantId: data.consultantId,
        monthlyIncome: data.monthlyIncome,
        plannedByCategory: data.plannedByCategory,
        modules: data.modules,
        notes: data.notes,
        bills,
        expectedIncomes,
        expectedExpenses,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao buscar planning:", error);
      throw error;
    }
  },

  // ---- Investments history (simple entries with date and totals per category) ----
  async getInvestments(userId: string): Promise<Array<any>> {
    try {
      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return [];
      const data = snap.data() as any;
      const entries = (data.investments || []).map((e: any) => ({
        id: e.id,
        date: e.date
          ? e.date.toDate
            ? e.date.toDate()
            : new Date(e.date)
          : null,
        totals: e.totals || {},
        createdAt: e.createdAt
          ? e.createdAt.toDate
            ? e.createdAt.toDate()
            : new Date(e.createdAt)
          : undefined,
      }));
      // sort descending by date
      entries.sort((a: any, b: any) => {
        const da = a.date ? a.date.getTime() : 0;
        const db = b.date ? b.date.getTime() : 0;
        return db - da;
      });
      return entries;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao buscar investimentos:",
        error,
      );
      throw error;
    }
  },

  async addInvestmentsEntry(
    consultantId: string,
    userId: string,
    totals: { caixa?: number; ipca?: number; outros?: number },
  ): Promise<any> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      const now = Timestamp.now();

      if (!snap.exists()) {
        await setDoc(docRef, {
          consultantId,
          createdAt: now,
          updatedAt: now,
          bills: [],
          expectedIncomes: [],
          expectedExpenses: [],
          investments: [],
        });
      }

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const entry: any = {
        id,
        date: now,
        totals: {
          caixa: totals.caixa || 0,
          ipca: totals.ipca || 0,
          outros: totals.outros || 0,
        },
        createdAt: now,
        updatedAt: now,
      };

      const currentSnap = await getDoc(docRef);
      const current = currentSnap.exists() ? (currentSnap.data() as any) : {};
      const existing = current.investments || [];
      const updated = [entry, ...existing];

      await updateDoc(docRef, { investments: updated, updatedAt: now });

      // activity log
      try {
        await activityServices.logActivity(userId, {
          type: "investments_update",
          title: "Investimentos atualizados",
          description: "Seu consultor atualizou os valores de investimentos.",
          metadata: { consultantId },
        });
      } catch (e) {
        console.warn(
          "⚠️ [PLANNING SERVICE] Falha ao registrar atividade de investimentos:",
          e,
        );
      }

      return {
        id,
        date: now.toDate(),
        totals: entry.totals,
      };
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao adicionar entry de investimentos:",
        error,
      );
      throw error;
    }
  },
  async syncOverduePlanningBills(userId: string): Promise<void> {
    try {
      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const data = snap.data() as PlanningFirestore;
      const bills = [...(data.bills || [])];
      if (bills.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nowTs = Timestamp.now();

      let changed = 0;

      const normalizedBills = bills.map((b) => {
        const statusRaw = String((b as any).status || "")
          .trim()
          .toLowerCase();

        // Não alterar contas já pagas ou já vencidas
        if (
          statusRaw === "paid" ||
          statusRaw === "paga" ||
          statusRaw === "overdue" ||
          statusRaw === "atrasada"
        ) {
          return b;
        }

        let dueDate: Date | null = null;

        if ((b as any).dueDate) {
          const rawDueDate: any = (b as any).dueDate;
          dueDate =
            typeof rawDueDate?.toDate === "function"
              ? rawDueDate.toDate()
              : rawDueDate instanceof Date
                ? rawDueDate
                : new Date(rawDueDate);
        } else if (b.dueDay !== undefined && b.dueDay !== null) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const lastDay = new Date(year, month + 1, 0).getDate();
          const safeDay = Math.min(Math.max(1, Number(b.dueDay) || 1), lastDay);
          dueDate = new Date(year, month, safeDay);
        } else if ((b as any).createdAt) {
          // Fallback legado: contas antigas sem dueDate/dueDay
          const rawCreatedAt: any = (b as any).createdAt;
          dueDate =
            typeof rawCreatedAt?.toDate === "function"
              ? rawCreatedAt.toDate()
              : rawCreatedAt instanceof Date
                ? rawCreatedAt
                : new Date(rawCreatedAt);
        }

        if (!dueDate || isNaN(dueDate.getTime())) {
          return b;
        }

        dueDate.setHours(0, 0, 0, 0);
        if (dueDate < today) {
          changed += 1;
          return {
            ...b,
            status: "overdue",
            updatedAt: nowTs,
          } as BillFirestore;
        }

        return b;
      });

      if (changed > 0) {
        await updateDoc(docRef, {
          bills: normalizedBills,
          updatedAt: nowTs,
        });
      }

      if (__DEV__) {
        console.log("[PLANNING] syncOverduePlanningBills", {
          userId,
          total: bills.length,
          changed,
        });
      }
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao sincronizar contas vencidas do planning:",
        error,
      );
    }
  },

  async savePlanning(
    consultantId: string,
    userId: string,
    data: CreatePlanningData,
  ): Promise<Planning> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const now = Timestamp.now();
      const docRef = getUserPlanningDoc(userId);
      // Ensure we don't send `undefined` values to Firestore.
      // Use the passed consultantId (param) instead of relying on data.consultantId.
      const payload: any = {
        consultantId: consultantId,
        updatedAt: now,
      };

      // If document does not exist yet, set createdAt when merging
      const existingSnap = await getDoc(docRef);
      if (!existingSnap.exists()) payload.createdAt = now;

      if (data.monthlyIncome !== undefined && data.monthlyIncome !== null) {
        payload.monthlyIncome = data.monthlyIncome;
      }
      if (data.modules !== undefined && data.modules !== null) {
        payload.modules = data.modules;
      }
      if (data.notes !== undefined && data.notes !== null) {
        payload.notes = data.notes;
      }

      if (
        data.plannedByCategory !== undefined &&
        data.plannedByCategory !== null
      ) {
        // keep only keys with numeric values and coerce to number
        const sanitized: Record<string, number> = {};
        (
          Object.entries(data.plannedByCategory) as Array<[string, any]>
        ).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === "string" && v.trim() === "") return;
          const num = Number(v);
          if (!Number.isNaN(num)) sanitized[k] = num;
        });
        payload.plannedByCategory = sanitized;
      }

      // Merge the payload to avoid overwriting other fields like expectedIncomes/bills
      await setDoc(docRef, payload, { merge: true });

      // Registrar atividade para o cliente (in-app)
      try {
        await activityServices.logActivity(userId, {
          type: "plan_created",
          title: "Novo planejamento financeiro disponível",
          description:
            "Seu consultor criou um planejamento financeiro. Abra para ver os detalhes.",
          metadata: { consultantId: payload.consultantId },
        });
      } catch (e) {
        console.warn(
          "⚠️ [PLANNING SERVICE] Falha ao registrar atividade de criação:",
          e,
        );
      }

      return {
        consultantId: payload.consultantId,
        monthlyIncome: payload.monthlyIncome,
        plannedByCategory: payload.plannedByCategory || {},
        modules: payload.modules,
        notes: payload.notes,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao salvar planning:", error);
      throw error;
    }
  },

  async updatePlanning(
    consultantId: string,
    userId: string,
    data: UpdatePlanningData,
  ): Promise<Planning | null> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        throw new Error("Planning não encontrado para este usuário");
      }

      const now = Timestamp.now();
      const updatePayload: any = {
        updatedAt: now,
      };

      if (data.monthlyIncome !== undefined)
        updatePayload.monthlyIncome = data.monthlyIncome;
      if (
        data.plannedByCategory !== undefined &&
        data.plannedByCategory !== null
      ) {
        const sanitized: Record<string, number> = {};
        (
          Object.entries(data.plannedByCategory) as Array<[string, any]>
        ).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (typeof v === "string" && v.trim() === "") return;
          const num = Number(v);
          if (!Number.isNaN(num)) sanitized[k] = num;
        });
        updatePayload.plannedByCategory = sanitized;
      }
      if (data.modules !== undefined) updatePayload.modules = data.modules;
      if (data.notes !== undefined) updatePayload.notes = data.notes;

      await updateDoc(docRef, updatePayload);

      const updatedSnap = await getDoc(docRef);
      const updatedData = updatedSnap.data() as PlanningFirestore;

      // Registrar atividade de atualização no feed do cliente
      try {
        await activityServices.logActivity(userId, {
          type: "plan_updated",
          title: "Planejamento atualizado",
          description:
            "Seu consultor atualizou o planejamento financeiro. Abra para ver as alterações.",
          metadata: { consultantId: consultantId },
        });
      } catch (e) {
        console.warn(
          "⚠️ [PLANNING SERVICE] Falha ao registrar atividade de atualização:",
          e,
        );
      }

      return {
        id: updatedSnap.id,
        consultantId: updatedData.consultantId,
        monthlyIncome: updatedData.monthlyIncome,
        plannedByCategory: updatedData.plannedByCategory,
        modules: updatedData.modules,
        notes: updatedData.notes,
        createdAt: updatedData.createdAt.toDate(),
        updatedAt: updatedData.updatedAt.toDate(),
      } as Planning;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao atualizar planning:", error);
      throw error;
    }
  },

  // ---- Bills and Expected Items (consultant-managed) ----
  async addBill(
    consultantId: string,
    userId: string,
    bill: Bill,
  ): Promise<Bill> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      const now = Timestamp.now();

      if (!snap.exists()) {
        // create a skeleton planning doc if missing
        await setDoc(docRef, {
          consultantId,
          createdAt: now,
          updatedAt: now,
          bills: [],
          expectedIncomes: [],
          expectedExpenses: [],
        });
      }

      const id =
        bill.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      // Build Firestore object without undefined fields (Firestore rejects undefined)
      const billFs: any = {
        id,
        name: bill.name,
        amount: bill.amount,
        recurring: bill.recurring || false,
        notes: bill.notes || "",
        createdAt: now,
        updatedAt: now,
      };
      if (bill.dueDay !== undefined && bill.dueDay !== null)
        billFs.dueDay = bill.dueDay;
      if (bill.categoryId !== undefined && bill.categoryId !== null)
        billFs.categoryId = bill.categoryId;

      // append to bills array
      const currentSnap = await getDoc(docRef);
      const current = currentSnap.exists() ? (currentSnap.data() as any) : {};
      const existing: BillFirestore[] = current.bills || [];
      const updated = [...existing, billFs];

      await updateDoc(docRef, { bills: updated, updatedAt: now });

      // activity
      try {
        await activityServices.logActivity(userId, {
          type: "bill_added",
          title: "Nova conta adicionada",
          description: `O consultor adicionou a conta ${bill.name}`,
          metadata: { consultantId },
        });
      } catch (e) {
        console.warn("⚠️ [PLANNING SERVICE] Falha ao registrar atividade:", e);
      }

      return {
        id,
        name: bill.name,
        amount: bill.amount,
        dueDay: bill.dueDay,
        categoryId: bill.categoryId,
        recurring: bill.recurring || false,
        notes: bill.notes,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as Bill;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao adicionar bill:", error);
      throw error;
    }
  },

  async updateBill(
    consultantId: string,
    userId: string,
    billId: string,
    changes: Partial<Bill>,
  ): Promise<Bill | null> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const bills: BillFirestore[] = data.bills || [];
      const idx = bills.findIndex((b) => b.id === billId);
      if (idx === -1) throw new Error("Bill não encontrado");

      const updatedBill = {
        ...bills[idx],
        ...changes,
        updatedAt: now,
      } as BillFirestore;
      bills[idx] = updatedBill;

      await updateDoc(docRef, { bills, updatedAt: now });

      return {
        id: updatedBill.id,
        name: updatedBill.name,
        amount: updatedBill.amount,
        dueDay: updatedBill.dueDay,
        categoryId: updatedBill.categoryId,
        recurring: updatedBill.recurring,
        notes: updatedBill.notes,
        createdAt: updatedBill.createdAt.toDate(),
        updatedAt: updatedBill.updatedAt.toDate(),
      } as Bill;
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao atualizar bill:", error);
      throw error;
    }
  },

  async deleteBill(
    consultantId: string,
    userId: string,
    billId: string,
  ): Promise<void> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const bills: BillFirestore[] = data.bills || [];
      const filtered = bills.filter((b) => b.id !== billId);

      await updateDoc(docRef, { bills: filtered, updatedAt: now });
    } catch (error) {
      console.error("❌ [PLANNING SERVICE] Erro ao deletar bill:", error);
      throw error;
    }
  },

  async addExpectedIncome(
    consultantId: string,
    userId: string,
    item: ExpectedItem,
  ): Promise<ExpectedItem> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      const now = Timestamp.now();

      if (!snap.exists()) {
        await setDoc(docRef, {
          consultantId,
          createdAt: now,
          updatedAt: now,
          bills: [],
          expectedIncomes: [],
          expectedExpenses: [],
        });
      }

      const id =
        item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const itFs: any = {
        id,
        source: item.source,
        amount: item.amount,
        notes: item.notes || "",
        createdAt: now,
        updatedAt: now,
      };
      if (item.expectedMonth !== undefined && item.expectedMonth !== null)
        itFs.expectedMonth = item.expectedMonth;
      if (item.categoryId !== undefined && item.categoryId !== null)
        itFs.categoryId = item.categoryId;

      const currentSnap = await getDoc(docRef);
      const current = currentSnap.exists() ? (currentSnap.data() as any) : {};
      const existing: ExpectedItemFirestore[] = current.expectedIncomes || [];
      const updated = [...existing, itFs];

      await updateDoc(docRef, { expectedIncomes: updated, updatedAt: now });

      return {
        id,
        source: item.source,
        amount: item.amount,
        expectedMonth: item.expectedMonth,
        categoryId: item.categoryId,
        notes: item.notes,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as ExpectedItem;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao adicionar expected income:",
        error,
      );
      throw error;
    }
  },

  async updateExpectedIncome(
    consultantId: string,
    userId: string,
    itemId: string,
    changes: Partial<ExpectedItem>,
  ): Promise<ExpectedItem | null> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const arr: ExpectedItemFirestore[] = data.expectedIncomes || [];
      const idx = arr.findIndex((a) => a.id === itemId);
      if (idx === -1) throw new Error("Item não encontrado");

      const updated = {
        ...arr[idx],
        ...changes,
        updatedAt: now,
      } as ExpectedItemFirestore;
      arr[idx] = updated;

      await updateDoc(docRef, { expectedIncomes: arr, updatedAt: now });

      return {
        id: updated.id,
        source: updated.source,
        amount: updated.amount,
        expectedMonth: updated.expectedMonth,
        categoryId: updated.categoryId,
        notes: updated.notes,
        createdAt: updated.createdAt.toDate(),
        updatedAt: updated.updatedAt.toDate(),
      } as ExpectedItem;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao atualizar expected income:",
        error,
      );
      throw error;
    }
  },

  async deleteExpectedIncome(
    consultantId: string,
    userId: string,
    itemId: string,
  ): Promise<void> {
    try {
      await planningServices.ensureOwnerOrAdmin(consultantId, userId);

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const arr: ExpectedItemFirestore[] = data.expectedIncomes || [];
      const filtered = arr.filter((a) => a.id !== itemId);

      await updateDoc(docRef, { expectedIncomes: filtered, updatedAt: now });
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao deletar expected income:",
        error,
      );
      throw error;
    }
  },

  async addExpectedExpense(
    consultantId: string,
    userId: string,
    item: ExpectedItem,
  ): Promise<ExpectedItem> {
    try {
      const consultant = await userService.getUserById(consultantId);
      if (
        !consultant ||
        (consultant.role !== "consultor" && consultant.role !== "admin")
      ) {
        throw new Error("Usuário não autorizado a modificar planejamento");
      }

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      const now = Timestamp.now();

      if (!snap.exists()) {
        await setDoc(docRef, {
          consultantId,
          createdAt: now,
          updatedAt: now,
          bills: [],
          expectedIncomes: [],
          expectedExpenses: [],
        });
      }

      const id =
        item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const itFs: any = {
        id,
        source: item.source,
        amount: item.amount,
        notes: item.notes || "",
        createdAt: now,
        updatedAt: now,
      };
      if (item.expectedMonth !== undefined && item.expectedMonth !== null)
        itFs.expectedMonth = item.expectedMonth;
      if (item.categoryId !== undefined && item.categoryId !== null)
        itFs.categoryId = item.categoryId;

      const currentSnap = await getDoc(docRef);
      const current = currentSnap.exists() ? (currentSnap.data() as any) : {};
      const existing: ExpectedItemFirestore[] = current.expectedExpenses || [];
      const updated = [...existing, itFs];

      await updateDoc(docRef, { expectedExpenses: updated, updatedAt: now });

      return {
        id,
        source: item.source,
        amount: item.amount,
        expectedMonth: item.expectedMonth,
        categoryId: item.categoryId,
        notes: item.notes,
        createdAt: now.toDate(),
        updatedAt: now.toDate(),
      } as ExpectedItem;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao adicionar expected expense:",
        error,
      );
      throw error;
    }
  },

  async updateExpectedExpense(
    consultantId: string,
    userId: string,
    itemId: string,
    changes: Partial<ExpectedItem>,
  ): Promise<ExpectedItem | null> {
    try {
      const consultant = await userService.getUserById(consultantId);
      if (
        !consultant ||
        (consultant.role !== "consultor" && consultant.role !== "admin")
      ) {
        throw new Error("Usuário não autorizado a modificar planejamento");
      }

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const arr: ExpectedItemFirestore[] = data.expectedExpenses || [];
      const idx = arr.findIndex((a) => a.id === itemId);
      if (idx === -1) throw new Error("Item não encontrado");

      const updated = {
        ...arr[idx],
        ...changes,
        updatedAt: now,
      } as ExpectedItemFirestore;
      arr[idx] = updated;

      await updateDoc(docRef, { expectedExpenses: arr, updatedAt: now });

      return {
        id: updated.id,
        source: updated.source,
        amount: updated.amount,
        expectedMonth: updated.expectedMonth,
        categoryId: updated.categoryId,
        notes: updated.notes,
        createdAt: updated.createdAt.toDate(),
        updatedAt: updated.updatedAt.toDate(),
      } as ExpectedItem;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao atualizar expected expense:",
        error,
      );
      throw error;
    }
  },

  async deleteExpectedExpense(
    consultantId: string,
    userId: string,
    itemId: string,
  ): Promise<void> {
    try {
      const consultant = await userService.getUserById(consultantId);
      if (
        !consultant ||
        (consultant.role !== "consultor" && consultant.role !== "admin")
      ) {
        throw new Error("Usuário não autorizado a modificar planejamento");
      }

      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const arr: ExpectedItemFirestore[] = data.expectedExpenses || [];
      const filtered = arr.filter((a) => a.id !== itemId);

      await updateDoc(docRef, { expectedExpenses: filtered, updatedAt: now });
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao deletar expected expense:",
        error,
      );
      throw error;
    }
  },

  // Marca uma bill do planning como paga — pode ser chamado pelo cliente
  async markBillAsPaidByClient(userId: string, billId: string) {
    try {
      const docRef = getUserPlanningDoc(userId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("Planning não encontrado");

      const now = Timestamp.now();
      const data = snap.data() as any;
      const bills: BillFirestore[] = data.bills || [];
      const idx = bills.findIndex((b) => b.id === billId);
      if (idx === -1) throw new Error("Bill não encontrada no planning");

      bills[idx] = {
        ...bills[idx],
        status: "paid",
        paidDate: now,
        updatedAt: now,
      } as BillFirestore;

      await updateDoc(docRef, { bills, updatedAt: now });

      // Registrar atividade para o consultor/cliente
      try {
        await activityServices.logActivity(userId, {
          type: "plan_bill_paid",
          title: "Conta marcada como paga",
          description: `O cliente marcou a conta ${bills[idx].name} como paga.`,
          metadata: { billId },
        });
      } catch (e) {
        console.warn("⚠️ [PLANNING SERVICE] Falha ao registrar atividade:", e);
      }

      return {
        id: bills[idx].id,
        name: bills[idx].name,
        amount: bills[idx].amount,
        dueDay: bills[idx].dueDay,
        categoryId: bills[idx].categoryId,
        recurring: bills[idx].recurring,
        notes: bills[idx].notes,
        status: bills[idx].status,
        paidDate: bills[idx].paidDate
          ? bills[idx].paidDate.toDate()
          : undefined,
        createdAt: bills[idx].createdAt.toDate(),
        updatedAt: bills[idx].updatedAt.toDate(),
      } as Bill;
    } catch (error) {
      console.error(
        "❌ [PLANNING SERVICE] Erro ao marcar bill como paga:",
        error,
      );
      throw error;
    }
  },
};

export default planningServices;
