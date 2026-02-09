/**
 * Tipos relacionados a Metas Financeiras
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Status da Meta
 */
export type GoalStatus = 'active' | 'completed' | 'cancelled';

/**
 * Categoria da Meta
 */
export type GoalCategory = 
  | 'savings' // Economia/Poupança
  | 'purchase' // Compra
  | 'debt' // Pagamento de dívida
  | 'investment' // Investimento
  | 'emergency' // Fundo de emergência
  | 'travel' // Viagem
  | 'education' // Educação
  | 'other'; // Outro

/**
 * Contribuição para uma meta
 */
export interface GoalContribution {
  amount: number;
  date: Date;
  note?: string;
}

/**
 * Contribuição no Firestore
 */
export interface GoalContributionFirestore {
  amount: number;
  date: Timestamp;
  note?: string;
}

/**
 * Meta Financeira
 */
export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  category: GoalCategory;
  deadline?: Date;
  status: GoalStatus;
  contributions: GoalContribution[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Meta no Firestore (com Timestamp)
 */
export interface GoalFirestore {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  category: GoalCategory;
  deadline?: Timestamp;
  status: GoalStatus;
  contributions: GoalContributionFirestore[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

/**
 * Dados para criar meta
 */
export interface CreateGoalData {
  title: string;
  description?: string;
  targetAmount: number;
  category: GoalCategory;
  deadline?: Date;
}

/**
 * Dados para atualizar meta
 */
export interface UpdateGoalData {
  title?: string;
  description?: string;
  targetAmount?: number;
  category?: GoalCategory;
  deadline?: Date;
  status?: GoalStatus;
}

/**
 * Estatísticas de metas
 */
export interface GoalStats {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  totalProgress: number; // Porcentagem
}

/**
 * Informações de categoria de meta
 */
export interface GoalCategoryInfo {
  value: GoalCategory;
  label: string;
  icon: string;
  color: string;
}

/**
 * Categorias de metas disponíveis
 */
export const GOAL_CATEGORIES: GoalCategoryInfo[] = [
  { value: 'savings', label: 'Poupança', icon: 'wallet', color: '#4CAF50' },
  { value: 'purchase', label: 'Compra', icon: 'cart', color: '#2196F3' },
  { value: 'debt', label: 'Dívida', icon: 'card', color: '#F44336' },
  { value: 'investment', label: 'Investimento', icon: 'trending-up', color: '#9C27B0' },
  { value: 'emergency', label: 'Emergência', icon: 'alert-circle', color: '#FF9800' },
  { value: 'travel', label: 'Viagem', icon: 'airplane', color: '#00BCD4' },
  { value: 'education', label: 'Educação', icon: 'school', color: '#673AB7' },
  { value: 'other', label: 'Outro', icon: 'ellipsis-horizontal', color: '#607D8B' },
];

/**
 * Obter informações de uma categoria
 */
export const getCategoryInfo = (category: GoalCategory): GoalCategoryInfo => {
  return GOAL_CATEGORIES.find(cat => cat.value === category) || GOAL_CATEGORIES[GOAL_CATEGORIES.length - 1];
};
