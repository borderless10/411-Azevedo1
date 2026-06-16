/**
 * Tipos para contas a pagar
 */

export type BillStatus = "pending" | "paid" | "overdue";

export const isBillUnpaid = (bill: {
  status?: string;
  paidDate?: Date | null;
  paid?: boolean;
}): boolean => {
  const status = String(bill?.status || "")
    .trim()
    .toLowerCase();
  if (status === "paid" || status === "paga") return false;
  if (bill?.paidDate) return false;
  if (bill?.paid === true) return false;
  return true;
};

export interface Bill {
  id: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: Date;
  status: BillStatus;
  paidDate?: Date;
  notificationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillFirestore {
  id?: string;
  userId: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: any; // Timestamp
  status: BillStatus;
  paidDate?: any; // Timestamp
  notificationId?: string;
  createdAt: any; // Timestamp
  updatedAt: any; // Timestamp
}

export interface CreateBillData {
  title: string;
  description?: string;
  amount: number;
  dueDate: Date;
}

export interface UpdateBillData {
  title?: string;
  description?: string;
  amount?: number;
  dueDate?: Date;
  status?: BillStatus;
  paidDate?: Date;
  notificationId?: string;
}
