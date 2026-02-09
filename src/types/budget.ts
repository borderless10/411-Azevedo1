/**
 * Tipos relacionados a Orçamento Mensal
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Gasto diário
 */
export interface DailyExpense {
  day: number;
  amount: number;
}

/**
 * Orçamento Mensal
 */
export interface Budget {
  id: string;
  userId: string;
  monthYear: string; // Formato: "YYYY-MM"
  monthlyBudget: number;
  dailyExpenses: DailyExpense[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Orçamento Mensal no Firestore (com Timestamp)
 */
export interface BudgetFirestore {
  id: string;
  userId: string;
  monthYear: string;
  monthlyBudget: number;
  dailyExpenses: DailyExpense[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Dados para criar orçamento
 */
export interface CreateBudgetData {
  monthlyBudget: number;
  dailyExpenses?: DailyExpense[];
}

/**
 * Dados para atualizar orçamento
 */
export interface UpdateBudgetData {
  monthlyBudget?: number;
  dailyExpenses?: DailyExpense[];
}
