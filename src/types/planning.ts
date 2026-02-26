/**
 * Tipos relacionados ao Planejamento criado pelo consultor
 */

import { Timestamp } from "firebase/firestore";

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
  notes?: string; // observações do consultor
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanningFirestore {
  consultantId: string;
  monthlyIncome?: number;
  plannedByCategory?: PlannedByCategory;
  modules?: ModuleConfig[];
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

export default Planning;
