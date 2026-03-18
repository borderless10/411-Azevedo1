/**
 * Tipos relacionados ao Planejamento criado pelo consultor
 */

import { Timestamp } from "firebase/firestore";
import { BillStatus } from "./bill";

export interface ModuleConfig {
  id: string;
  name: string;
  description?: string;
  mandatory?: boolean; // se o módulo é obrigatório
  categoryId?: string; // referência a uma categoria (opcional)
}

export type PlannedByCategory = Record<string, number>; // categoryId -> planned amount

export interface Planning {
  id?: string;
  consultantId: string; // quem criou/assinou o plano
  monthlyIncome?: number;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[]; // módulos diários adicionais
  bills?: Bill[]; // contas fixas/recorrentes cadastradas pelo consultor
  expectedIncomes?: ExpectedItem[]; // rendas esperadas
  expectedExpenses?: ExpectedItem[]; // gastos esperados
  notes?: string; // observações do consultor
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanningFirestore {
  consultantId: string;
  monthlyIncome?: number;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
  bills?: BillFirestore[];
  expectedIncomes?: ExpectedItemFirestore[];
  expectedExpenses?: ExpectedItemFirestore[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreatePlanningData {
  consultantId: string;
  monthlyIncome?: number;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
  notes?: string;
}

export interface UpdatePlanningData {
  monthlyIncome?: number;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
  notes?: string;
}

// ---- New types for consultant-managed items ----
export interface Bill {
  id?: string;
  name: string;
  amount: number;
  dueDay?: number; // dia do mês quando a conta vence (1-31)
  dueDate?: Date; // compatibilidade com dados legados
  categoryId?: string;
  recurring?: boolean;
  notes?: string;
  status?: BillStatus;
  paidDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BillFirestore {
  id?: string;
  name: string;
  amount: number;
  dueDay?: number;
  dueDate?: Timestamp;
  categoryId?: string;
  recurring?: boolean;
  notes?: string;
  status?: BillStatus;
  paidDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ExpectedItem {
  id?: string;
  source?: string; // fonte da renda ou nome do gasto esperado
  amount: number;
  expectedMonth?: string; // opcional, formato YYYY-MM
  categoryId?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpectedItemFirestore {
  id?: string;
  source?: string;
  amount: number;
  expectedMonth?: string;
  categoryId?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default Planning;
