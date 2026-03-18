/**
 * Tipos relacionados a Atividades do Usuário (Timeline/Feed)
 */

import { Timestamp } from "firebase/firestore";

/**
 * Tipos de atividades
 */
export type ActivityType =
  | "income_created" // Renda criada
  | "income_updated" // Renda atualizada
  | "income_deleted" // Renda deletada
  | "expense_created" // Gasto criado
  | "expense_updated" // Gasto atualizado
  | "expense_deleted" // Gasto deletado
  | "goal_created" // Meta criada
  | "goal_updated" // Meta atualizada
  | "goal_completed" // Meta concluída
  | "goal_deleted" // Meta deletada
  | "goal_contribution" // Contribuição adicionada à meta
  | "budget_created" // Orçamento criado
  | "budget_updated" // Orçamento atualizado
  | "plan_created" // Planejamento criado
  | "plan_updated" // Planejamento atualizado
  | "bill_added" // Conta adicionada ao planejamento
  | "plan_bill_paid" // Conta do planejamento marcada como paga
  | "plan_comment"; // Comentário no planejamento

/**
 * Metadados da atividade
 */
export interface ActivityMetadata {
  amount?: number; // Valor relacionado
  category?: string; // Categoria (para expense/income)
  goalTitle?: string; // Título da meta (para goal)
  description?: string; // Descrição adicional
  [key: string]: any; // Outros campos customizados
}

/**
 * Atividade do usuário
 */
export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string; // Título da atividade
  description?: string; // Descrição da atividade
  metadata?: ActivityMetadata; // Dados adicionais
  createdAt: Date;
}

/**
 * Atividade no Firestore (com Timestamp)
 */
export interface ActivityFirestore {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
  createdAt: Timestamp;
}

/**
 * Dados para criar atividade
 */
export interface CreateActivityData {
  type: ActivityType;
  title: string;
  description?: string;
  metadata?: ActivityMetadata;
}

/**
 * Informações de tipo de atividade
 */
export interface ActivityTypeInfo {
  type: ActivityType;
  icon: string;
  color: string;
  label: string;
}

/**
 * Mapeamento de tipos de atividades
 */
export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeInfo> = {
  income_created: {
    type: "income_created",
    icon: "arrow-down-circle",
    color: "#8c52ff",
    label: "Renda criada",
  },
  income_updated: {
    type: "income_updated",
    icon: "create",
    color: "#8c52ff",
    label: "Renda atualizada",
  },
  income_deleted: {
    type: "income_deleted",
    icon: "trash",
    color: "#a89fc0",
    label: "Renda removida",
  },
  expense_created: {
    type: "expense_created",
    icon: "arrow-up-circle",
    color: "#ff4d6d",
    label: "Gasto criado",
  },
  expense_updated: {
    type: "expense_updated",
    icon: "create",
    color: "#ff4d6d",
    label: "Gasto atualizado",
  },
  expense_deleted: {
    type: "expense_deleted",
    icon: "trash",
    color: "#6b6480",
    label: "Gasto removido",
  },
  goal_created: {
    type: "goal_created",
    icon: "flag",
    color: "#8c52ff",
    label: "Meta criada",
  },
  goal_updated: {
    type: "goal_updated",
    icon: "create",
    color: "#8c52ff",
    label: "Meta atualizada",
  },
  goal_completed: {
    type: "goal_completed",
    icon: "checkmark-circle",
    color: "#8c52ff",
    label: "Meta concluída",
  },
  goal_deleted: {
    type: "goal_deleted",
    icon: "trash",
    color: "#6b6480",
    label: "Meta removida",
  },
  goal_contribution: {
    type: "goal_contribution",
    icon: "add-circle",
    color: "#a47aff",
    label: "Contribuição adicionada",
  },
  budget_created: {
    type: "budget_created",
    icon: "wallet",
    color: "#c084fc",
    label: "Orçamento criado",
  },
  budget_updated: {
    type: "budget_updated",
    icon: "create",
    color: "#c084fc",
    label: "Orçamento atualizado",
  },
  plan_created: {
    type: "plan_created",
    icon: "document",
    color: "#4f46e5",
    label: "Planejamento criado",
  },
  plan_updated: {
    type: "plan_updated",
    icon: "create",
    color: "#4f46e5",
    label: "Planejamento atualizado",
  },
  bill_added: {
    type: "bill_added",
    icon: "add-circle",
    color: "#f97316",
    label: "Conta adicionada",
  },
  plan_bill_paid: {
    type: "plan_bill_paid",
    icon: "checkmark-circle",
    color: "#10b981",
    label: "Conta marcada como paga",
  },
  plan_comment: {
    type: "plan_comment",
    icon: "chatbubbles",
    color: "#06b6d4",
    label: "Comentário no planejamento",
  },
};

/**
 * Obter informações de um tipo de atividade
 */
export const getActivityTypeInfo = (type: ActivityType): ActivityTypeInfo => {
  return ACTIVITY_TYPES[type];
};
