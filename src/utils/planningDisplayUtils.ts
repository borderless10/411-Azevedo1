import { formatCurrency } from "./currencyUtils";

type SplitEntry = {
  amount?: number;
  amountCard?: number;
  amountCash?: number;
  paymentMethod?: string;
};

export const getPlannedSplitAmounts = (entry: SplitEntry) => {
  const amountCard = Number(entry?.amountCard);
  const amountCash = Number(entry?.amountCash);
  const hasSplit =
    Number.isFinite(amountCard) ||
    Number.isFinite(amountCash);

  if (hasSplit) {
    const card = Number.isFinite(amountCard) ? amountCard : 0;
    const cash = Number.isFinite(amountCash) ? amountCash : 0;
    return { card, cash, total: card + cash, hasSplit: card > 0 && cash > 0 };
  }

  const total = Number(entry?.amount) || 0;
  const method = String(entry?.paymentMethod || "").toLowerCase();
  const isCard =
    method.includes("card") ||
    method.includes("cart") ||
    method.includes("credito") ||
    method.includes("credit");

  return {
    card: isCard ? total : 0,
    cash: isCard ? 0 : total,
    total,
    hasSplit: false,
  };
};

export const formatPlannedSplitLabel = (entry: SplitEntry): string => {
  const { card, cash, total, hasSplit } = getPlannedSplitAmounts(entry);

  if (hasSplit || (card > 0 && cash > 0)) {
    return `Dinheiro: ${formatCurrency(cash)} · Cartão: ${formatCurrency(card)}`;
  }

  if (card > 0 && cash <= 0) {
    return `Cartão: ${formatCurrency(card)}`;
  }

  if (cash > 0 && card <= 0) {
    return `Dinheiro: ${formatCurrency(cash)}`;
  }

  return formatCurrency(total);
};

export const getTotalPlannedResources = (
  availableInAccount: number,
  expectedIncomes: Array<{ amount?: number; amountCard?: number; amountCash?: number }>,
): number => {
  const expectedTotal = expectedIncomes.reduce((sum, item) => {
    const split = getPlannedSplitAmounts(item);
    return sum + split.total;
  }, 0);

  return (Number(availableInAccount) || 0) + expectedTotal;
};

type PlanningTotalsInput = {
  availableInAccount?: number | null;
  monthlyIncome?: number | null;
  expectedIncomes?: SplitEntry[];
  expectedExpenses?: SplitEntry[];
  bills?: SplitEntry[];
  plannedByCategory?: Record<string, number | string>;
  consumoModerado?: number | null;
  consumoModeradoCard?: number | null;
  consumoModeradoCash?: number | null;
};

export const computePlanningTotals = (planning?: PlanningTotalsInput | null) => {
  const availableInAccount = Number(
    planning?.availableInAccount ?? planning?.monthlyIncome ?? 0,
  ) || 0;

  const totalExpectedIncomes = (planning?.expectedIncomes || []).reduce(
    (sum, item) => sum + (Number(item?.amount) || 0),
    0,
  );

  const totalResources = availableInAccount + totalExpectedIncomes;

  const billBreakdown = (planning?.bills || []).map((item) =>
    getPlannedSplitAmounts(item),
  );
  const expectedExpenseBreakdown = (planning?.expectedExpenses || []).map(
    (item) => getPlannedSplitAmounts(item),
  );

  const consumoTotal = Number(planning?.consumoModerado) || 0;
  const consumoCard = Number(planning?.consumoModeradoCard) || 0;
  const consumoCash = Number(planning?.consumoModeradoCash) || 0;
  const consumptionBreakdown =
    consumoCard !== 0 || consumoCash !== 0
      ? {
          total: consumoCard + consumoCash,
          card: consumoCard,
          cash: consumoCash,
        }
      : { total: consumoTotal, card: 0, cash: consumoTotal };

  const categoryCash = planning?.plannedByCategory
    ? Object.values(planning.plannedByCategory).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      )
    : 0;

  const totalCardExpenses =
    billBreakdown.reduce((sum, item) => sum + item.card, 0) +
    expectedExpenseBreakdown.reduce((sum, item) => sum + item.card, 0) +
    consumptionBreakdown.card;

  const totalCashExpenses =
    billBreakdown.reduce((sum, item) => sum + item.cash, 0) +
    expectedExpenseBreakdown.reduce((sum, item) => sum + item.cash, 0) +
    consumptionBreakdown.cash +
    categoryCash;

  const totalSpending = totalCashExpenses + totalCardExpenses;
  const expectedSavings = totalResources - totalCashExpenses;

  return {
    availableInAccount,
    totalExpectedIncomes,
    totalResources,
    totalCashExpenses,
    totalCardExpenses,
    totalSpending,
    expectedSavings,
  };
};
