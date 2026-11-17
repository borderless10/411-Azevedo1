export type ExpenseChangeRequestType = "extra" | "tracked";

export type ExpenseChangeRequestStatus = "pending" | "approved" | "rejected";

export interface ExpenseChangeRequest {
  id: string;
  userId: string;
  title: string;
  type: ExpenseChangeRequestType;
  amount?: number;
  notes?: string;
  status: ExpenseChangeRequestStatus;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface CreateExpenseChangeRequestInput {
  title: string;
  type: ExpenseChangeRequestType;
  amount?: number;
  notes?: string;
}