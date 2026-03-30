export interface CreditCard {
  id: string;
  userId: string;
  bank: string;
  last4: string;
  bestDay: number;
  cardDueDay: number;
  cardExpiryMonth: number;
  cardExpiryYear: number;
  invoiceDueDay: number;
  limit: number;
  autoDebit: boolean;
  isActive: boolean;
  lastAutoDebitInvoiceKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCreditCardData {
  bank: string;
  last4: string;
  bestDay: number;
  cardDueDay: number;
  cardExpiryMonth: number;
  cardExpiryYear: number;
  invoiceDueDay: number;
  limit: number;
  autoDebit: boolean;
}

export interface UpdateCreditCardData {
  bank?: string;
  last4?: string;
  bestDay?: number;
  cardDueDay?: number;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  invoiceDueDay?: number;
  limit?: number;
  autoDebit?: boolean;
  isActive?: boolean;
  lastAutoDebitInvoiceKey?: string;
}

export interface CreditCardFirestore {
  id: string;
  userId: string;
  bank: string;
  last4: string;
  bestDay?: number;
  cardDueDay: number;
  cardExpiryMonth: number;
  cardExpiryYear: number;
  invoiceDueDay: number;
  limit: number;
  autoDebit: boolean;
  isActive: boolean;
  lastAutoDebitInvoiceKey?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreditCardInvoiceExpense {
  id: string;
  description: string;
  date: Date;
  amount: number;
}

export interface CreditCardInvoiceSummary {
  invoiceKey: string;
  invoiceLabel: string;
  dueDate: Date;
  total: number;
  cardId?: string;
  cardLabel: string;
  expenseCount: number;
  expenses: CreditCardInvoiceExpense[];
}
