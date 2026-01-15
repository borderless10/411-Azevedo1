/**
 * Tipos relacionados a Transações (união de Income e Expense)
 */

import { Income } from './income';
import { Expense } from './expense';
import { TransactionType } from './category';

/**
 * Transação genérica (pode ser income ou expense)
 */
export type Transaction = (Income | Expense) & {
  type: TransactionType;
};

/**
 * Dados para criar uma transação
 */
export interface CreateTransactionData {
  type: TransactionType;
  value: number;
  description: string;
  date: Date;
  category?: string; // Opcional para income, obrigatório para expense
}

/**
 * Transação com informações de categoria
 */
export interface TransactionWithCategory extends Transaction {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
}

/**
 * Transação agrupada por data
 */
export interface TransactionsByDate {
  date: string; // YYYY-MM-DD
  transactions: TransactionWithCategory[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

/**
 * Resumo de transações
 */
export interface TransactionSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  countIncome: number;
  countExpense: number;
  averageIncome: number;
  averageExpense: number;
}

export default Transaction;
