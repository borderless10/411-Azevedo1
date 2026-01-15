/**
 * Tipos relacionados a Rendas/Entradas
 */

/**
 * Interface principal de Renda
 */
export interface Income {
  id: string;
  userId: string;
  value: number;
  description: string;
  date: Date;
  category?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar uma nova renda
 */
export interface CreateIncomeData {
  value: number;
  description: string;
  date: Date;
  category?: string;
}

/**
 * Dados para atualizar uma renda
 */
export interface UpdateIncomeData {
  value?: number;
  description?: string;
  date?: Date;
  category?: string;
}

/**
 * Filtros para buscar rendas
 */
export interface IncomeFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  minValue?: number;
  maxValue?: number;
  searchTerm?: string;
}

/**
 * Dados de renda do Firestore (com conversão de tipos)
 */
export interface IncomeFirestore {
  id: string;
  userId: string;
  value: number;
  description: string;
  date: any; // Timestamp do Firestore
  category?: string;
  createdAt: any; // Timestamp do Firestore
  updatedAt: any; // Timestamp do Firestore
}

/**
 * Resumo de rendas por período
 */
export interface IncomeSummary {
  total: number;
  count: number;
  average: number;
  byCategory: Record<string, number>;
}

/**
 * Renda agrupada por data
 */
export interface IncomeByDate {
  date: string; // YYYY-MM-DD
  incomes: Income[];
  total: number;
}

export default Income;
