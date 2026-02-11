/**
 * Tipos para contas a pagar
 */

export type BillStatus = 'pending' | 'paid' | 'overdue';

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
}
