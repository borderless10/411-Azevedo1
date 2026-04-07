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

export type ConsumptionCategoryReleaseStatus = "active" | "inactive";

export interface ConsumptionCategoryRelease {
  categoryName: string;
  monthlyLimit: number;
  dailyLimit: number;
  status: ConsumptionCategoryReleaseStatus;
  releasedBy: string;
  releasedAt: Date;
  updatedAt?: Date;
}

export type CategoryReleases = Record<string, ConsumptionCategoryRelease>;

export interface ConsumptionCategoryReleaseFirestore {
  categoryName: string;
  monthlyLimit: number;
  dailyLimit: number;
  status: ConsumptionCategoryReleaseStatus;
  releasedBy: string;
  releasedAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CategoryReleasesFirestore = Record<
  string,
  ConsumptionCategoryReleaseFirestore
>;

export interface Planning {
  id?: string;
  consultantId: string; // quem criou/assinou o plano
  monthlyIncome?: number;
  consumoModerado?: number;
  consumoModeradoCard?: number;
  consumoModeradoCash?: number;
  consumoModeradoCycleStartedAt?: Date | null;
  consumoModeradoCycleEndedAt?: Date | null;
  consumoModeradoCycleStatus?: "active" | "closed";
  consumoModeradoCycleDurationDays?: number;
  categoryReleases?: CategoryReleases;
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
  consumoModerado?: number;
  consumoModeradoCard?: number;
  consumoModeradoCash?: number;
  consumoModeradoCycleStartedAt?: Timestamp | null;
  consumoModeradoCycleEndedAt?: Timestamp | null;
  consumoModeradoCycleStatus?: "active" | "closed";
  consumoModeradoCycleDurationDays?: number;
  categoryReleases?: CategoryReleasesFirestore;
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
  consumoModerado?: number;
  consumoModeradoCard?: number;
  consumoModeradoCash?: number;
  consumoModeradoCycleStartedAt?: Date | null;
  consumoModeradoCycleEndedAt?: Date | null;
  consumoModeradoCycleStatus?: "active" | "closed";
  consumoModeradoCycleDurationDays?: number;
  categoryReleases?: CategoryReleases;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
  notes?: string;
}

export interface UpdatePlanningData {
  monthlyIncome?: number;
  consumoModerado?: number;
  consumoModeradoCard?: number;
  consumoModeradoCash?: number;
  consumoModeradoCycleStartedAt?: Date | null;
  consumoModeradoCycleEndedAt?: Date | null;
  consumoModeradoCycleStatus?: "active" | "closed";
  consumoModeradoCycleDurationDays?: number;
  categoryReleases?: CategoryReleases;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
  notes?: string;
}

// ---- New types for consultant-managed items ----
export interface Bill {
  id?: string;
  name: string;
  amount: number;
  amountCard?: number;
  amountCash?: number;
  paymentMethod?: string; // 'card' | 'cash' | 'pix' etc.
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
  amountCard?: number;
  amountCash?: number;
  paymentMethod?: string;
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
  amountCard?: number;
  amountCash?: number;
  expectedMonth?: string; // opcional, formato YYYY-MM
  paymentMethod?: string; // 'card' | 'cash' | 'pix' etc.
  categoryId?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ExpectedItemFirestore {
  id?: string;
  source?: string;
  amount: number;
  amountCard?: number;
  amountCash?: number;
  expectedMonth?: string;
  paymentMethod?: string;
  categoryId?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export default Planning;
