/**
 * Tipos relacionados a Orçamento Mensal
 */

import { Timestamp } from "firebase/firestore";

/**
 * Gasto diário
 */
export interface DailyExpense {
  day: number;
  amount: number;
}

export type RankingPlanilhaType =
  | "zero_next_day"
  | "expense_same_day"
  | "expense_next_day"
  | "missed";

export interface RankingPlanilhaEntry {
  dateKey: string;
  points: number;
  type: RankingPlanilhaType;
  registeredAt: string;
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
  zeroConfirmedDays: number[];
  zeroConfirmedDaysNoRanking?: number[];
  zeroPromptDismissedDays?: number[];
  rankingPlanilhaEntries?: RankingPlanilhaEntry[];
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
  zeroConfirmedDays?: number[];
  zeroConfirmedDaysNoRanking?: number[];
  zeroPromptDismissedDays?: number[];
  rankingPlanilhaEntries?: RankingPlanilhaEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Dados para criar orçamento
 */
export interface CreateBudgetData {
  monthlyBudget: number;
  dailyExpenses?: DailyExpense[];
  zeroConfirmedDays?: number[];
  zeroConfirmedDaysNoRanking?: number[];
  zeroPromptDismissedDays?: number[];
  rankingPlanilhaEntries?: RankingPlanilhaEntry[];
}

/**
 * Dados para atualizar orçamento
 */
export interface UpdateBudgetData {
  monthlyBudget?: number;
  dailyExpenses?: DailyExpense[];
  zeroConfirmedDays?: number[];
  zeroConfirmedDaysNoRanking?: number[];
  zeroPromptDismissedDays?: number[];
  rankingPlanilhaEntries?: RankingPlanilhaEntry[];
}
