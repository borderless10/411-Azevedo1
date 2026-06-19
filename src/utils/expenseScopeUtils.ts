/**
 * Gastos vinculados a seções específicas (Consumo Moderado / Gastos acompanhados).
 * Não entram no histórico geral de transações — cada um tem sua própria tela.
 */

const normalizeExpenseCategoryKey = (category?: string) =>
  String(category || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const normalizeExpenseTitleKey = (value?: string) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

export const isSectionOnlyExpense = (expense: {
  category?: string;
  isConsumoModerado?: boolean;
  isTrackedDaily?: boolean;
}): boolean => {
  if (expense.isConsumoModerado) return true;
  if (expense.isTrackedDaily) return true;

  const categoryKey = normalizeExpenseCategoryKey(expense.category);
  return (
    categoryKey === "consumo moderado" ||
    categoryKey === "acompanhamento diario" ||
    categoryKey === "gasto acompanhado"
  );
};

export const filterGeneralHistoryExpenses = <T extends {
  category?: string;
  isConsumoModerado?: boolean;
  isTrackedDaily?: boolean;
}>(
  expenses: T[],
): T[] => expenses.filter((expense) => !isSectionOnlyExpense(expense));

export const isConsumoModeradoExpense = (expense: {
  category?: string;
  isConsumoModerado?: boolean;
}): boolean => {
  if (expense.isConsumoModerado) return true;
  return normalizeExpenseCategoryKey(expense.category) === "consumo moderado";
};

export const isTrackedDailyExpense = (expense: {
  category?: string;
  isTrackedDaily?: boolean;
}): boolean => {
  if (expense.isTrackedDaily) return true;

  const categoryKey = normalizeExpenseCategoryKey(expense.category);
  return (
    categoryKey === "acompanhamento diario" ||
    categoryKey === "gasto acompanhado"
  );
};

export const filterTrackedExpensesForTitle = <
  T extends {
    description?: string;
    category?: string;
    isTrackedDaily?: boolean;
  },
>(
  expenses: T[],
  title: string,
): T[] => {
  const targetTitleKey = normalizeExpenseTitleKey(title);
  if (!targetTitleKey) return [];

  return expenses.filter((expense) => {
    if (!isTrackedDailyExpense(expense)) return false;
    return normalizeExpenseTitleKey(expense.description) === targetTitleKey;
  });
};

export const isBillPaymentExpense = (expense: {
  category?: string;
  sourceBillId?: string;
}): boolean => {
  if (expense.sourceBillId) return true;

  const categoryKey = normalizeExpenseCategoryKey(expense.category);
  return (
    categoryKey === "conta" ||
    categoryKey === "contas" ||
    categoryKey === "contas a pagar" ||
    categoryKey === "pagamento de conta"
  );
};

export type ConsultantExpenseScope =
  | "all"
  | "consumo_moderado"
  | "acompanhamento"
  | "contas"
  | "geral";

export const CONSULTANT_EXPENSE_SCOPE_LABELS: Record<
  ConsultantExpenseScope,
  string
> = {
  all: "Todos",
  consumo_moderado: "Consumo Moderado",
  acompanhamento: "Acompanhamento",
  contas: "Contas",
  geral: "Geral",
};

export const filterExpensesByConsultantScope = <
  T extends {
    category?: string;
    description?: string;
    sourceBillId?: string;
    isConsumoModerado?: boolean;
    isTrackedDaily?: boolean;
  },
>(
  expenses: T[],
  scope: ConsultantExpenseScope,
): T[] => {
  switch (scope) {
    case "consumo_moderado":
      return expenses.filter(isConsumoModeradoExpense);
    case "acompanhamento":
      return expenses.filter(isTrackedDailyExpense);
    case "contas":
      return expenses.filter(isBillPaymentExpense);
    case "geral":
      return filterGeneralHistoryExpenses(expenses);
    case "all":
    default:
      return expenses;
  }
};

export const getExpenseScopeBadge = (expense: {
  category?: string;
  isConsumoModerado?: boolean;
  isTrackedDaily?: boolean;
  sourceBillId?: string;
}): string => {
  if (isConsumoModeradoExpense(expense)) return "Consumo Moderado";
  if (isTrackedDailyExpense(expense)) return "Acompanhamento";
  if (isBillPaymentExpense(expense)) return "Conta";
  return expense.category || "Geral";
};
