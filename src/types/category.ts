/**
 * Tipos relacionados a Categorias
 */

/**
 * Tipo de transação
 */
export type TransactionType = 'income' | 'expense';

/**
 * Interface principal de Categoria
 */
export interface Category {
  id: string;
  name: string;
  icon: string; // Nome do ícone (Ionicons)
  color: string; // Hex color (#FF5733)
  type: TransactionType;
  isDefault: boolean; // Se é uma categoria padrão do sistema
  userId?: string; // null se for categoria padrão, userId se for customizada
  createdAt: Date;
}

/**
 * Dados para criar uma categoria customizada
 */
export interface CreateCategoryData {
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
}

/**
 * Dados para atualizar uma categoria
 */
export interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
}

/**
 * Categoria do Firestore
 */
export interface CategoryFirestore {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault: boolean;
  userId?: string;
  createdAt: any; // Timestamp do Firestore
}

/**
 * Categorias padrão do sistema
 */
export const DEFAULT_INCOME_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'isDefault'>[] = [
  { name: 'Salário', icon: 'cash', color: '#4CAF50', type: 'income' },
  { name: 'Freelance', icon: 'briefcase', color: '#2196F3', type: 'income' },
  { name: 'Investimentos', icon: 'trending-up', color: '#9C27B0', type: 'income' },
  { name: 'Presente', icon: 'gift', color: '#FF9800', type: 'income' },
  { name: 'Venda', icon: 'cart', color: '#00BCD4', type: 'income' },
  { name: 'Outros', icon: 'ellipsis-horizontal', color: '#607D8B', type: 'income' },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt' | 'isDefault'>[] = [
  { name: 'Alimentação', icon: 'restaurant', color: '#FF5722', type: 'expense' },
  { name: 'Transporte', icon: 'car', color: '#3F51B5', type: 'expense' },
  { name: 'Moradia', icon: 'home', color: '#795548', type: 'expense' },
  { name: 'Saúde', icon: 'medical', color: '#F44336', type: 'expense' },
  { name: 'Educação', icon: 'school', color: '#009688', type: 'expense' },
  { name: 'Lazer', icon: 'game-controller', color: '#E91E63', type: 'expense' },
  { name: 'Compras', icon: 'basket', color: '#FF9800', type: 'expense' },
  { name: 'Serviços', icon: 'construct', color: '#607D8B', type: 'expense' },
  { name: 'Outros', icon: 'ellipsis-horizontal', color: '#9E9E9E', type: 'expense' },
];

/**
 * Obter todas as categorias padrão
 */
export const getAllDefaultCategories = (): Omit<Category, 'id' | 'userId' | 'createdAt'>[] => {
  return [
    ...DEFAULT_INCOME_CATEGORIES.map(cat => ({ ...cat, isDefault: true })),
    ...DEFAULT_EXPENSE_CATEGORIES.map(cat => ({ ...cat, isDefault: true })),
  ];
};

/**
 * Obter categorias por tipo
 */
export const getCategoriesByType = (type: TransactionType): Omit<Category, 'id' | 'userId' | 'createdAt' | 'isDefault'>[] => {
  return type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
};

export default Category;
