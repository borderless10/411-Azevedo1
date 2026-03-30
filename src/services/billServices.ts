/**
 * Serviço para gerenciar contas a pagar
 */

import {
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  getBillsCollection,
  getBillDoc,
  convertBillFromFirestore,
  convertBillToFirestore,
  getDocData,
} from "../lib/firestore";
import {
  Bill,
  CreateBillData,
  UpdateBillData,
  BillStatus,
} from "../types/bill";

/**
 * Criar nova conta
 */
export const createBill = async (
  userId: string,
  data: CreateBillData,
): Promise<Bill> => {
  try {
    const now = new Date();
    const billData = {
      userId,
      ...data,
      status: "pending" as BillStatus,
      createdAt: now,
      updatedAt: now,
    };

    const firestoreData = convertBillToFirestore(billData);
    const docRef = await addDoc(getBillsCollection(), firestoreData);

    return {
      id: docRef.id,
      ...billData,
    };
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    throw error;
  }
};

/**
 * Buscar contas do usuário
 */
export const getBills = async (
  userId: string,
  status?: BillStatus,
): Promise<Bill[]> => {
  try {
    // Tentar com orderBy primeiro (requer índice)
    try {
      let q = query(
        getBillsCollection(),
        where("userId", "==", userId),
        orderBy("dueDate", "asc"),
      );

      if (status) {
        q = query(
          getBillsCollection(),
          where("userId", "==", userId),
          where("status", "==", status),
          orderBy("dueDate", "asc"),
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) =>
        convertBillFromFirestore(getDocData(doc)),
      );
    } catch (indexError: any) {
      // Se falhar por falta de índice, fazer query simples e ordenar no cliente
      if (indexError.code === "failed-precondition") {
        console.log(
          "⚠️ Índice não encontrado, usando fallback (ordenação no cliente)",
        );
        console.log(
          "📋 Crie este índice no Firestore para melhor performance:",
        );
        console.log("   Coleção: bills");
        console.log("   Campos: userId (Asc), status (Asc), dueDate (Asc)");

        let q = query(getBillsCollection(), where("userId", "==", userId));

        if (status) {
          q = query(
            getBillsCollection(),
            where("userId", "==", userId),
            where("status", "==", status),
          );
        }

        const snapshot = await getDocs(q);
        const bills = snapshot.docs.map((doc) =>
          convertBillFromFirestore(getDocData(doc)),
        );

        // Ordenar no cliente por data de vencimento
        return bills.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      }
      throw indexError;
    }
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    throw error;
  }
};

/**
 * Buscar contas que vencem hoje
 */
export const getBillsDueToday = async (userId: string): Promise<Bill[]> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      getBillsCollection(),
      where("userId", "==", userId),
      where("status", "==", "pending"),
      where("dueDate", ">=", Timestamp.fromDate(today)),
      where("dueDate", "<", Timestamp.fromDate(tomorrow)),
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) =>
      convertBillFromFirestore(getDocData(doc)),
    );
  } catch (error) {
    console.error("Erro ao buscar contas do dia:", error);
    return [];
  }
};

/**
 * Atualizar conta
 */
export const updateBill = async (
  billId: string,
  data: UpdateBillData,
): Promise<void> => {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    const firestoreData = convertBillToFirestore(updateData);
    await updateDoc(getBillDoc(billId), firestoreData);
  } catch (error) {
    console.error("Erro ao atualizar conta:", error);
    throw error;
  }
};

/**
 * Marcar conta como paga
 */
export const markBillAsPaid = async (billId: string): Promise<void> => {
  try {
    await updateBill(billId, {
      status: "paid",
      paidDate: new Date(),
    });
  } catch (error) {
    console.error("Erro ao marcar conta como paga:", error);
    throw error;
  }
};

/**
 * Deletar conta
 */
export const deleteBill = async (billId: string): Promise<void> => {
  try {
    await deleteDoc(getBillDoc(billId));
  } catch (error) {
    console.error("Erro ao deletar conta:", error);
    throw error;
  }
};

/**
 * Verificar contas vencidas e atualizar status
 */
export const updateOverdueBills = async (userId: string): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (__DEV__) {
      console.log("[BILLS] updateOverdueBills:start", {
        userId,
        today: today.toISOString(),
      });
    }

    const q = query(
      getBillsCollection(),
      where("userId", "==", userId),
      where("status", "==", "pending"),
      where("dueDate", "<", Timestamp.fromDate(today)),
    );
    try {
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map((doc) =>
        updateDoc(getBillDoc(doc.id), {
          status: "overdue",
          updatedAt: new Date(),
        }),
      );

      if (__DEV__) {
        console.log("[BILLS] updateOverdueBills:index-query", {
          matched: snapshot.docs.length,
        });
      }

      await Promise.all(updates);
    } catch (queryError: any) {
      // Falha por falta de índice composto — aplicar fallback: buscar por userId+status e filtrar por dueDate no cliente
      if (queryError && queryError.code === "failed-precondition") {
        console.log(
          "⚠️ Índice composto ausente para consulta de contas vencidas. Aplicando fallback (filtragem no cliente).",
        );
        console.log(
          "🛠️ Para performance ideal, crie o índice sugerido no Firebase Console (o link aparece na mensagem de erro).",
        );

        let q2 = query(
          getBillsCollection(),
          where("userId", "==", userId),
          where("status", "==", "pending"),
        );

        const snapshot2 = await getDocs(q2);

        const overdueDocs = snapshot2.docs.filter((doc) => {
          const data: any = doc.data();
          // Compatibilidade com dados antigos: aceitar variações de status
          const normalizedStatus = String(data.status || "")
            .trim()
            .toLowerCase();
          if (
            normalizedStatus &&
            normalizedStatus !== "pending" &&
            normalizedStatus !== "pendente"
          ) {
            return false;
          }

          const due = data.dueDate;
          // converter Timestamp/Date/other para Date
          const dueDate =
            due && typeof due.toDate === "function"
              ? due.toDate()
              : due instanceof Date
                ? due
                : new Date(due);

          if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
            return false;
          }

          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
        });

        const updates = overdueDocs.map((doc) =>
          updateDoc(getBillDoc(doc.id), {
            status: "overdue",
            updatedAt: new Date(),
          }),
        );

        if (__DEV__) {
          console.log("[BILLS] updateOverdueBills:fallback-query", {
            scanned: snapshot2.docs.length,
            overdue: overdueDocs.length,
          });
        }

        await Promise.all(updates);
      } else {
        throw queryError;
      }
    }

    // Segunda passagem para dados legados: evita depender de índice/tipo de dueDate
    const legacyQuery = query(
      getBillsCollection(),
      where("userId", "==", userId),
      where("status", "==", "pending"),
    );
    const legacySnapshot = await getDocs(legacyQuery);
    const legacyOverdue = legacySnapshot.docs.filter((doc) => {
      const data: any = doc.data();
      const due = data?.dueDate;
      const dueDate =
        due && typeof due.toDate === "function"
          ? due.toDate()
          : due instanceof Date
            ? due
            : new Date(due);

      if (!(dueDate instanceof Date) || isNaN(dueDate.getTime())) {
        return false;
      }

      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    if (legacyOverdue.length > 0) {
      await Promise.all(
        legacyOverdue.map((doc) =>
          updateDoc(getBillDoc(doc.id), {
            status: "overdue",
            updatedAt: new Date(),
          }),
        ),
      );
    }

    if (__DEV__) {
      console.log("[BILLS] updateOverdueBills:done", {
        legacyScanned: legacySnapshot.docs.length,
        legacyOverdue: legacyOverdue.length,
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar contas vencidas:", error);
  }
};
