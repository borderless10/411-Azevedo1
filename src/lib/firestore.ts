import {
  collection,
  doc,
  CollectionReference,
  DocumentReference,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Income,
  IncomeFirestore,
  Expense,
  ExpenseFirestore,
  Category,
  CategoryFirestore,
} from '../types';

/**
 * Nomes das coleções do Firestore
 */
export const COLLECTIONS = {
  USERS: 'users',
  INCOMES: 'incomes',
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
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
export const convertIncomeFromFirestore = (
  data: IncomeFirestore
): Income => {
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
  income: Partial<Income>
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
  data: ExpenseFirestore
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
  expense: Partial<Expense>
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
  data: CategoryFirestore
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
  category: Partial<Category>
): Partial<CategoryFirestore> => {
  const { createdAt, ...rest } = category;
  
  return {
    ...rest,
    ...(createdAt && { createdAt: dateToTimestamp(createdAt) }),
  };
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
