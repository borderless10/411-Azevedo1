/**
 * Tipos relacionados a Atividades do Usuário (Timeline/Feed)
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Tipos de atividades
 */
export type ActivityType =
  | 'income_created'      // Renda criada
  | 'income_updated'      // Renda atualizada
  | 'income_deleted'      // Renda deletada
  | 'expense_created'     // Gasto criado
  | 'expense_updated'     // Gasto atualizado
  | 'expense_deleted'     // Gasto deletado
  | 'goal_created'        // Meta criada
  | 'goal_updated'        // Meta atualizada
  | 'goal_completed'      // Meta concluída
  | 'goal_deleted'        // Meta deletada
  | 'goal_contribution'   // Contribuição adicionada à meta
  | 'budget_created'      // Orçamento criado
  | 'budget_updated';     // Orçamento atualizado

/**
 * Metadados da atividade
 */
export interface ActivityMetadata {
  amount?: number;           // Valor relacionado
  category?: string;         // Categoria (para expense/income)
  goalTitle?: string;        // Título da meta (para goal)
  description?: string;      // Descrição adicional
  [key: string]: any;        // Outros campos customizados
}

/**
 * Atividade do usuário
 */
export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;             // Título da atividade
  description?: string;      // Descrição da atividade
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
    type: 'income_created',
    icon: 'arrow-down-circle',
    color: '#4CAF50',
    label: 'Renda criada',
  },
  income_updated: {
    type: 'income_updated',
    icon: 'create',
    color: '#4CAF50',
    label: 'Renda atualizada',
  },
  income_deleted: {
    type: 'income_deleted',
    icon: 'trash',
    color: '#F44336',
    label: 'Renda removida',
  },
  expense_created: {
    type: 'expense_created',
    icon: 'arrow-up-circle',
    color: '#F44336',
    label: 'Gasto criado',
  },
  expense_updated: {
    type: 'expense_updated',
    icon: 'create',
    color: '#F44336',
    label: 'Gasto atualizado',
  },
  expense_deleted: {
    type: 'expense_deleted',
    icon: 'trash',
    color: '#666',
    label: 'Gasto removido',
  },
  goal_created: {
    type: 'goal_created',
    icon: 'flag',
    color: '#2196F3',
    label: 'Meta criada',
  },
  goal_updated: {
    type: 'goal_updated',
    icon: 'create',
    color: '#2196F3',
    label: 'Meta atualizada',
  },
  goal_completed: {
    type: 'goal_completed',
    icon: 'checkmark-circle',
    color: '#4CAF50',
    label: 'Meta concluída',
  },
  goal_deleted: {
    type: 'goal_deleted',
    icon: 'trash',
    color: '#666',
    label: 'Meta removida',
  },
  goal_contribution: {
    type: 'goal_contribution',
    icon: 'add-circle',
    color: '#9C27B0',
    label: 'Contribuição adicionada',
  },
  budget_created: {
    type: 'budget_created',
    icon: 'wallet',
    color: '#FF9800',
    label: 'Orçamento criado',
  },
  budget_updated: {
    type: 'budget_updated',
    icon: 'create',
    color: '#FF9800',
    label: 'Orçamento atualizado',
  },
};

/**
 * Obter informações de um tipo de atividade
 */
export const getActivityTypeInfo = (type: ActivityType): ActivityTypeInfo => {
  return ACTIVITY_TYPES[type];
};
