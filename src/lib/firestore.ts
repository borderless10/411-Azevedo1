import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  Income,
  IncomeFirestore,
  Expense,
  ExpenseFirestore,
  Category,
  CategoryFirestore,
  Budget,
  BudgetFirestore,
  Goal,
  GoalFirestore,
  Activity,
  ActivityFirestore,
  Bill,
  BillFirestore,
} from "../types";
import { CreditCard, CreditCardFirestore } from "../types/creditCard";

/**
 * Nomes das coleções do Firestore
 */
export const COLLECTIONS = {
  USERS: "users",
  INCOMES: "incomes",
  EXPENSES: "expenses",
  CATEGORIES: "categories",
  BUDGETS: "budgets",
  GOALS: "goals",
  ACTIVITIES: "activities",
  BILLS: "bills",
  WISHLISTS: "wishlists",
  CREDIT_CARDS: "creditCards",
} as const;

/**
 * Referências para as coleções
 */
export const getIncomesCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.INCOMES);
};

export const getExpensesCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.EXPENSES);
};

export const getCategoriesCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.CATEGORIES);
};

export const getUsersCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.USERS);
};

export const getBudgetsCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.BUDGETS);
};

export const getGoalsCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.GOALS);
};

export const getWishlistsCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.WISHLISTS);
};

export const getActivitiesCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.ACTIVITIES);
};

export const getBillsCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.BILLS);
};

export const getCreditCardsCollection = (): CollectionReference => {
  return collection(db, COLLECTIONS.CREDIT_CARDS);
};

/**
 * Referências para documentos
 */
export const getIncomeDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.INCOMES, id);
};

export const getExpenseDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.EXPENSES, id);
};

export const getCategoryDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.CATEGORIES, id);
};

export const getUserDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.USERS, id);
};

export const getBudgetDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.BUDGETS, id);
};

export const getGoalDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.GOALS, id);
};

export const getWishlistDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.WISHLISTS, id);
};

export const getActivityDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.ACTIVITIES, id);
};

export const getBillDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.BILLS, id);
};

export const getCreditCardDoc = (id: string): DocumentReference => {
  return doc(db, COLLECTIONS.CREDIT_CARDS, id);
};

/**
 * Conversores: Date <-> Timestamp do Firestore
 */
export const dateToTimestamp = (date: Date): Timestamp => {
  return Timestamp.fromDate(date);
};

export const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
};

/**
 * Converter Income do Firestore para o tipo da aplicação
 */
export const convertIncomeFromFirestore = (data: IncomeFirestore): Income => {
  return {
    ...data,
    date: timestampToDate(data.date),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

/**
 * Converter Income para o Firestore
 */
export const convertIncomeToFirestore = (
  income: Partial<Income>,
): Partial<IncomeFirestore> => {
  const { date, createdAt, updatedAt, ...rest } = income;

  return {
    ...rest,
    ...(date && { date: dateToTimestamp(date) }),
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
    ...(updatedAt && { updatedAt: dateToTimestamp(updatedAt) }),
  };
};

/**
 * Converter Expense do Firestore para o tipo da aplicação
 */
export const convertExpenseFromFirestore = (
  data: ExpenseFirestore,
): Expense => {
  return {
    ...data,
    date: timestampToDate(data.date),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

/**
 * Converter Expense para o Firestore
 */
export const convertExpenseToFirestore = (
  expense: Partial<Expense>,
): Partial<ExpenseFirestore> => {
  const { date, createdAt, updatedAt, ...rest } = expense;

  return {
    ...rest,
    ...(date && { date: dateToTimestamp(date) }),
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
    ...(updatedAt && { updatedAt: dateToTimestamp(updatedAt) }),
  };
};

/**
 * Converter Category do Firestore para o tipo da aplicação
 */
export const convertCategoryFromFirestore = (
  data: CategoryFirestore,
): Category => {
  return {
    ...data,
    createdAt: timestampToDate(data.createdAt),
  };
};

/**
 * Converter Category para o Firestore
 */
export const convertCategoryToFirestore = (
  category: Partial<Category>,
): Partial<CategoryFirestore> => {
  const { createdAt, ...rest } = category;

  return {
    ...rest,
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
  };
};

/**
 * Converter Budget do Firestore para o tipo da aplicação
 */
export const convertBudgetFromFirestore = (data: BudgetFirestore): Budget => {
  return {
    ...data,
    zeroConfirmedDays: data.zeroConfirmedDays || [],
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

/**
 * Converter Budget para o Firestore
 */
export const convertBudgetToFirestore = (
  budget: Partial<Budget>,
): Partial<BudgetFirestore> => {
  const { createdAt, updatedAt, ...rest } = budget;

  return {
    ...rest,
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
    ...(updatedAt && { updatedAt: dateToTimestamp(updatedAt) }),
  };
};

/**
 * Converter Goal do Firestore para o tipo da aplicação
 */
export const convertGoalFromFirestore = (data: GoalFirestore): Goal => {
  return {
    ...data,
    deadline: data.deadline ? timestampToDate(data.deadline) : undefined,
    prazo: (data as any).prazo ? (data as any).prazo : undefined,
    contributions: data.contributions.map((contrib) => ({
      ...contrib,
      date: timestampToDate(contrib.date),
    })),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    completedAt: data.completedAt
      ? timestampToDate(data.completedAt)
      : undefined,
  };
};

/**
 * Converter Goal para o Firestore
 */
export const convertGoalToFirestore = (goal: Partial<Goal>): any => {
  const {
    deadline,
    contributions,
    createdAt,
    updatedAt,
    completedAt,
    ...rest
  } = goal;

  const result: any = { ...rest };

  // Só adicionar campos que existem (Firestore não aceita undefined)
  if (deadline) {
    result.deadline = dateToTimestamp(deadline);
  }

  if ((goal as any).prazo) {
    result.prazo = (goal as any).prazo;
  }

  if (contributions) {
    result.contributions = contributions.map((contrib) => ({
      amount: contrib.amount,
      date: dateToTimestamp(contrib.date),
      ...(contrib.note && { note: contrib.note }),
    }));
  }

  if (createdAt) {
    result.createdAt = dateToTimestamp(createdAt);
  }

  if (updatedAt) {
    result.updatedAt = dateToTimestamp(updatedAt);
  }

  if (completedAt) {
    result.completedAt = dateToTimestamp(completedAt);
  }

  return result;
};

/**
 * Converter Wishlist do Firestore para o tipo da aplicação
 */
export const convertWishlistFromFirestore = (
  data: any,
): import("../types").WishlistItem => {
  return {
    id: data.id,
    userId: data.userId,
    name: data.name,
    value: data.value,
    description: data.description || undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

/**
 * Converter Wishlist para o Firestore
 */
export const convertWishlistToFirestore = (
  wishlist: Partial<import("../types").WishlistItem>,
): any => {
  const { createdAt, updatedAt, ...rest } = wishlist as any;
  const result: any = { ...rest };

  if (createdAt) {
    result.createdAt = dateToTimestamp(createdAt);
  }
  if (updatedAt) {
    result.updatedAt = dateToTimestamp(updatedAt);
  }

  return result;
};

/**
 * Converter Activity do Firestore para o tipo da aplicação
 */
export const convertActivityFromFirestore = (
  data: ActivityFirestore,
): Activity => {
  return {
    ...data,
    createdAt: timestampToDate(data.createdAt),
  };
};

export const convertCreditCardFromFirestore = (
  data: CreditCardFirestore,
): CreditCard => {
  const parsedBestDay = Number((data as any).bestDay);
  const bestDay =
    Number.isInteger(parsedBestDay) && parsedBestDay >= 1 && parsedBestDay <= 31
      ? parsedBestDay
      : data.cardDueDay;

  const cardDueMonth = (data as any).cardDueMonth
    ? Number((data as any).cardDueMonth)
    : 1;
  const cardExpiryMonth = (data as any).cardExpiryMonth
    ? Number((data as any).cardExpiryMonth)
    : cardDueMonth;
  const cardExpiryYear = (data as any).cardExpiryYear
    ? Number((data as any).cardExpiryYear)
    : new Date().getFullYear();

  return {
    id: (data as any).id || "",
    userId: (data as any).userId,
    bank: (data as any).bank,
    last4: (data as any).last4,
    bestDay,
    cardDueDay: (data as any).cardDueDay,
    cardExpiryMonth,
    cardExpiryYear,
    invoiceDueDay: (data as any).invoiceDueDay,
    limit: (data as any).limit,
    autoDebit: (data as any).autoDebit,
    isActive: (data as any).isActive,
    lastAutoDebitInvoiceKey: (data as any).lastAutoDebitInvoiceKey,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  } as CreditCard;
};

export const convertCreditCardToFirestore = (
  card: Partial<CreditCard>,
): Partial<CreditCardFirestore> => {
  const { createdAt, updatedAt, ...rest } = card;

  return {
    ...rest,
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
    ...(updatedAt && { updatedAt: dateToTimestamp(updatedAt) }),
  };
};

/**
 * Converter Activity para o Firestore
 */
export const convertActivityToFirestore = (
  activity: Partial<Activity>,
): any => {
  const { createdAt, ...rest } = activity;

  const result: any = { ...rest };

  if (createdAt) {
    result.createdAt = dateToTimestamp(createdAt);
  }

  return result;
};

/**
 * Converter Bill do Firestore para a aplicação
 */
export const convertBillFromFirestore = (data: BillFirestore): Bill => {
  return {
    ...data,
    id: data.id || "",
    dueDate: timestampToDate(data.dueDate),
    paidDate: data.paidDate ? timestampToDate(data.paidDate) : undefined,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

/**
 * Converter Bill para o Firestore
 */
export const convertBillToFirestore = (bill: Partial<Bill>): any => {
  const { dueDate, paidDate, createdAt, updatedAt, ...rest } = bill;

  const result: any = { ...rest };

  if (dueDate) {
    result.dueDate = dateToTimestamp(dueDate);
  }
  if (paidDate) {
    result.paidDate = dateToTimestamp(paidDate);
  }
  if (createdAt) {
    result.createdAt = dateToTimestamp(createdAt);
  }
  if (updatedAt) {
    result.updatedAt = dateToTimestamp(updatedAt);
  }

  return result;
};

/**
 * Validar se um documento existe
 */
export const docExists = (snapshot: any): boolean => {
  return snapshot.exists();
};

/**
 * Obter dados de um snapshot
 */
export const getDocData = (snapshot: any): any => {
  return { id: snapshot.id, ...snapshot.data() };
};

export default {
  COLLECTIONS,
  getIncomesCollection,
  getExpensesCollection,
  getCategoriesCollection,
  getUsersCollection,
  convertIncomeFromFirestore,
  convertIncomeToFirestore,
  convertExpenseFromFirestore,
  convertExpenseToFirestore,
  convertCategoryFromFirestore,
  convertCategoryToFirestore,
  dateToTimestamp,
  timestampToDate,
};
