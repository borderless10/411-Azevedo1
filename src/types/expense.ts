/**
 * Tipos relacionados a Gastos/Despesas
 */

/**
 * Interface principal de Gasto
 */
export interface Expense {
  id: string;
  userId: string;
  value: number;
  description: string;
  date: Date;
  category: string; // Obrigatório para gastos
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dados para criar um novo gasto
 */
export interface CreateExpenseData {
  value: number;
  description: string;
  date: Date;
  category: string;
}

/**
 * Dados para atualizar um gasto
 */
export interface UpdateExpenseData {
  value?: number;
  description?: string;
  date?: Date;
  category?: string;
}

/**
 * Filtros para buscar gastos
 */
export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  categories?: string[]; // Múltiplas categorias
  minValue?: number;
  maxValue?: number;
  searchTerm?: string;
}

/**
 * Dados de gasto do Firestore (com conversão de tipos)
 */
export interface ExpenseFirestore {
  id: string;
  userId: string;
  value: number;
  description: string;
  date: any; // Timestamp do Firestore
  category: string;
  createdAt: any; // Timestamp do Firestore
  updatedAt: any; // Timestamp do Firestore
}

/**
 * Resumo de gastos por período
 */
export interface ExpenseSummary {
  total: number;
  count: number;
  average: number;
  byCategory: Record<string, number>;
}

/**
 * Gasto agrupado por data
 */
export interface ExpenseByDate {
  date: string; // YYYY-MM-DD
  expenses: Expense[];
  total: number;
}

/**
 * Gasto agrupado por categoria
 */
export interface ExpenseByCategory {
  category: string;
  expenses: Expense[];
  total: number;
  percentage: number;
}

export default Expense;
