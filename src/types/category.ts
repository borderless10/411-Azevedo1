/**
 * Tipos relacionados a Categorias
 */

/**
 * Tipo de transação
 */
export type TransactionType = "income" | "expense";

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
export const DEFAULT_INCOME_CATEGORIES: Omit<
  Category,
  "id" | "userId" | "createdAt" | "isDefault"
>[] = [
  { name: "Salário", icon: "cash", color: "#8c52ff", type: "income" },
  { name: "Freelance", icon: "briefcase", color: "#a47aff", type: "income" },
  {
    name: "Investimentos",
    icon: "trending-up",
    color: "#8c52ff",
    type: "income",
  },
  { name: "Presente", icon: "gift", color: "#c084fc", type: "income" },
  { name: "Venda", icon: "cart", color: "#a47aff", type: "income" },
  {
    name: "Outros",
    icon: "ellipsis-horizontal",
    color: "#6b6480",
    type: "income",
  },
];

export const DEFAULT_EXPENSE_CATEGORIES: Omit<
  Category,
  "id" | "userId" | "createdAt" | "isDefault"
>[] = [
  {
    name: "Alimentação",
    icon: "restaurant",
    color: "#ff4d6d",
    type: "expense",
  },
  { name: "Transporte", icon: "car", color: "#6b6480", type: "expense" },
  { name: "Moradia", icon: "home", color: "#a89fc0", type: "expense" },
  { name: "Saúde", icon: "medical", color: "#ff4d6d", type: "expense" },
  { name: "Educação", icon: "school", color: "#a47aff", type: "expense" },
  { name: "Lazer", icon: "game-controller", color: "#c084fc", type: "expense" },
  { name: "Compras", icon: "basket", color: "#ff4d6d", type: "expense" },
  { name: "Serviços", icon: "construct", color: "#6b6480", type: "expense" },
  {
    name: "Outros",
    icon: "ellipsis-horizontal",
    color: "#a89fc0",
    type: "expense",
  },
];

const normalizeCategoryToken = (value: string): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const toExpenseCategoryLookupKey = (value: string): string =>
  normalizeCategoryToken(value);

export const resolveExpenseCategoryName = (value: string): string | null => {
  const key = normalizeCategoryToken(value);
  if (!key) return null;

  const match = DEFAULT_EXPENSE_CATEGORIES.find(
    (category) => normalizeCategoryToken(category.name) === key,
  );

  return match?.name || null;
};

export const isValidExpenseCategoryName = (value: string): boolean =>
  !!resolveExpenseCategoryName(value);

/**
 * Obter todas as categorias padrão
 */
export const getAllDefaultCategories = (): Omit<
  Category,
  "id" | "userId" | "createdAt"
>[] => {
  return [
    ...DEFAULT_INCOME_CATEGORIES.map((cat) => ({ ...cat, isDefault: true })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((cat) => ({ ...cat, isDefault: true })),
  ];
};

/**
 * Obter categorias por tipo
 */
export const getCategoriesByType = (
  type: TransactionType,
): Omit<Category, "id" | "userId" | "createdAt" | "isDefault">[] => {
  return type === "income"
    ? DEFAULT_INCOME_CATEGORIES
    : DEFAULT_EXPENSE_CATEGORIES;
};

export default Category;
