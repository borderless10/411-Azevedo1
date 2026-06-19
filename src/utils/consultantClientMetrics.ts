import { Expense } from "../types/expense";
import {
  Bill,
  isPayablePlanningBill,
  Planning,
} from "../types/planning";
import { formatCurrency } from "./currencyUtils";
import { getEndOfDay, getStartOfDay, formatDateToString } from "./dateUtils";
import { normalizeExpenseTitleKey, isBillPaymentExpense, ConsultantExpenseScope } from "./expenseScopeUtils";

export type MovementPeriod = {
  start: Date;
  end: Date;
  label: string;
};

export type PlannedSpendingSummary = {
  billsTotal: number;
  expectedExpensesTotal: number;
  categoryTotal: number;
  trackedTotal: number;
  consumoModerado: number;
  totalPlanned: number;
  plannedDailyAverage: number;
  cycleDays: number;
};

export type BillPaymentComparison = {
  expenseId: string;
  billId?: string;
  billName: string;
  plannedAmount: number;
  paidAmount: number;
  paymentDate: Date;
  matchesPlan: boolean;
  difference: number;
};

export type VarianceIndicator = {
  difference: number;
  status: "above" | "below" | "equal" | "unknown";
  label: string;
};

const getItemAmount = (item: { amount?: number }) =>
  Number(item?.amount) || 0;

export const computeTrackedPlannedTotal = (
  planning: Planning | null,
): number => {
  if (!planning) return 0;

  const fromBills = (planning.bills || [])
    .filter((bill) => bill.dailyTracking)
    .reduce((sum, bill) => sum + getItemAmount(bill), 0);

  const fromExpected = (planning.expectedExpenses || [])
    .filter((item) => item.dailyTracking)
    .reduce((sum, item) => sum + getItemAmount(item), 0);

  return fromBills + fromExpected;
};

/** Resolve o valor planejado para a categoria em que o gasto foi registrado no app. */
export const resolvePlannedAmountForCategory = (
  category: string,
  planning: Planning | null,
  summary: PlannedSpendingSummary | null,
): number | undefined => {
  if (!planning && !summary) return undefined;

  const categoryKey = normalizeExpenseTitleKey(category);

  if (
    categoryKey === "conta" ||
    categoryKey === "contas" ||
    categoryKey === "contas a pagar" ||
    categoryKey === "pagamento de conta"
  ) {
    const total = summary?.billsTotal ?? 0;
    return total > 0 ? total : undefined;
  }

  if (categoryKey === "consumo moderado") {
    const total = summary?.consumoModerado ?? 0;
    return total > 0 ? total : undefined;
  }

  if (
    categoryKey === "acompanhamento diario" ||
    categoryKey === "gasto acompanhado"
  ) {
    const total = computeTrackedPlannedTotal(planning);
    return total > 0 ? total : undefined;
  }

  if (planning?.plannedByCategory) {
    const direct = planning.plannedByCategory[category];
    if (direct !== undefined && direct !== null) {
      const value = Number(direct) || 0;
      return value > 0 ? value : undefined;
    }

    const matched = Object.entries(planning.plannedByCategory).find(
      ([key]) => normalizeExpenseTitleKey(key) === categoryKey,
    );
    if (matched) {
      const value = Number(matched[1]) || 0;
      return value > 0 ? value : undefined;
    }
  }

  return undefined;
};

export type CategoryPlanningComparison = {
  category: string;
  actual: number;
  planned?: number;
  variance: VarianceIndicator;
};

export const buildCategoryPlanningComparisons = (
  planning: Planning | null,
  summary: PlannedSpendingSummary | null,
  expensesByCategory: Array<{ category: string; total: number }>,
): CategoryPlanningComparison[] => {
  const keys = new Set<string>();
  expensesByCategory.forEach((entry) => keys.add(entry.category));

  if (planning?.plannedByCategory) {
    Object.keys(planning.plannedByCategory).forEach((key) => keys.add(key));
  }

  if ((summary?.billsTotal || 0) > 0) keys.add("Conta");
  if ((summary?.consumoModerado || 0) > 0) keys.add("Consumo Moderado");
  if (computeTrackedPlannedTotal(planning) > 0) {
    keys.add("Acompanhamento Diário");
  }

  return Array.from(keys).map((category) => {
    const expenseEntry = expensesByCategory.find(
      (entry) => entry.category === category,
    );
    const actual = expenseEntry ? expenseEntry.total : 0;
    const planned = resolvePlannedAmountForCategory(
      category,
      planning,
      summary,
    );
    const variance = buildVarianceIndicator(actual, planned);

    return { category, actual, planned, variance };
  });
};

export const resolveClientMovementPeriod = (
  planning: Planning | null,
  reference = new Date(),
): MovementPeriod => {
  const startOfMonth = getStartOfDay(
    new Date(reference.getFullYear(), reference.getMonth(), 1),
  );
  const endOfToday = getEndOfDay(reference);

  if (planning?.consumoModeradoCycleStartedAt) {
    const start = getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt));
    let end = endOfToday;

    if (planning.consumoModeradoCycleEndedAt) {
      const cycleEnd = getEndOfDay(
        new Date(planning.consumoModeradoCycleEndedAt),
      );
      end = cycleEnd < endOfToday ? cycleEnd : endOfToday;
    }

    if (end < start) {
      end = getEndOfDay(start);
    }

    return { start, end, label: "Ciclo atual" };
  }

  return { start: startOfMonth, end: endOfToday, label: "Este mês" };
};

export const countDaysInclusive = (start: Date, end: Date): number => {
  const from = getStartOfDay(start);
  const to = getStartOfDay(end);
  const diff = to.getTime() - from.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1);
};

export const isDateWithinPeriod = (
  value: Date | string | undefined,
  period: MovementPeriod,
): boolean => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date >= period.start && date <= period.end;
};

export const computePlannedSpendingSummary = (
  planning: Planning | null,
  period: MovementPeriod,
): PlannedSpendingSummary | null => {
  if (!planning) return null;

  const billsTotal = (planning.bills || [])
    .filter(isPayablePlanningBill)
    .reduce((sum, bill) => sum + getItemAmount(bill), 0);

  const expectedExpensesTotal = (planning.expectedExpenses || [])
    .filter(isPayablePlanningBill)
    .reduce((sum, item) => sum + getItemAmount(item), 0);

  const categoryTotal = Object.values(planning.plannedByCategory || {}).reduce(
    (sum, value) => sum + (Number(value) || 0),
    0,
  );

  const consumoModerado =
    Number(planning.consumoModerado) ||
    (Number(planning.consumoModeradoCard) || 0) +
      (Number(planning.consumoModeradoCash) || 0);

  const trackedTotal = computeTrackedPlannedTotal(planning);

  const totalPlanned =
    billsTotal +
    expectedExpensesTotal +
    categoryTotal +
    consumoModerado +
    trackedTotal;

  const cycleDays =
    Number(planning.consumoModeradoCycleDurationDays) ||
    countDaysInclusive(period.start, period.end);

  const plannedDailyAverage =
    consumoModerado > 0 && cycleDays > 0
      ? consumoModerado / cycleDays
      : totalPlanned / countDaysInclusive(period.start, period.end);

  return {
    billsTotal,
    expectedExpensesTotal,
    categoryTotal,
    trackedTotal,
    consumoModerado,
    totalPlanned,
    plannedDailyAverage,
    cycleDays,
  };
};

export const findPlanningBillForExpense = (
  expense: Expense,
  planning: Planning | null,
): Bill | undefined => {
  const payableBills = (planning?.bills || []).filter(isPayablePlanningBill);
  if (payableBills.length === 0) return undefined;

  if (expense.sourceBillId) {
    return payableBills.find(
      (bill) => String(bill.id) === String(expense.sourceBillId),
    );
  }

  const descriptionKey = normalizeExpenseTitleKey(expense.description);
  return payableBills.find(
    (bill) => normalizeExpenseTitleKey(bill.name) === descriptionKey,
  );
};

export const compareBillPayments = (
  planning: Planning | null,
  expenses: Expense[],
  period: MovementPeriod,
): BillPaymentComparison[] => {
  return expenses
    .filter((expense) => isDateWithinPeriod(expense.date, period))
    .filter(isBillPaymentExpense)
    .map((expense) => {
      const bill = findPlanningBillForExpense(expense, planning);
      const plannedAmount = bill ? getItemAmount(bill) : 0;
      const paidAmount = Number(expense.value) || 0;
      const difference = paidAmount - plannedAmount;

      return {
        expenseId: expense.id,
        billId: bill?.id,
        billName: bill?.name || expense.description || "Conta",
        plannedAmount,
        paidAmount,
        paymentDate: new Date(expense.date),
        matchesPlan:
          plannedAmount > 0 && Math.abs(difference) < 0.01,
        difference,
      };
    })
    .sort(
      (a, b) => b.paymentDate.getTime() - a.paymentDate.getTime(),
    );
};

export const buildVarianceIndicator = (
  actual: number,
  planned?: number,
): VarianceIndicator => {
  if (planned === undefined || planned === null || planned <= 0) {
    return { difference: 0, status: "unknown", label: "Sem planejamento" };
  }

  const difference = actual - planned;
  if (Math.abs(difference) < 0.01) {
    return { difference: 0, status: "equal", label: "Igual ao planejado" };
  }

  if (difference > 0) {
    return {
      difference,
      status: "above",
      label: `${formatCurrency(difference)} acima do planejado`,
    };
  }

  return {
    difference,
    status: "below",
    label: `${formatCurrency(Math.abs(difference))} abaixo do planejado`,
  };
};

export const getVarianceColor = (status: VarianceIndicator["status"]): string => {
  if (status === "above") return "#ff4d6d";
  if (status === "below") return "#8c52ff";
  if (status === "equal") return "#4caf50";
  return "#999";
};

export type ScopeDailyMetrics = {
  plannedBudget: number;
  idealDailyAverage: number;
  actualDailyAverage: number;
  todaySpent: number;
  elapsedDays: number;
  countedDays: number;
  cycleDays: number;
  variance: VarianceIndicator;
};

const isSameCalendarDay = (
  value: Date | string | undefined,
  day: Date,
): boolean => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
};

export const resolveTrackedPlannedAmount = (
  planning: Planning | null,
  trackedTitle?: string,
): number => {
  if (!planning) return 0;
  if (!trackedTitle?.trim()) return computeTrackedPlannedTotal(planning);

  const titleKey = normalizeExpenseTitleKey(trackedTitle);
  const bill = (planning.bills || []).find(
    (item) =>
      item.dailyTracking &&
      normalizeExpenseTitleKey(item.name) === titleKey,
  );
  if (bill) return getItemAmount(bill);

  const expected = (planning.expectedExpenses || []).find(
    (item) =>
      item.dailyTracking &&
      normalizeExpenseTitleKey(item.source) === titleKey,
  );
  if (expected) return getItemAmount(expected);

  return 0;
};

export const resolveScopePlannedBudget = (
  planning: Planning | null,
  period: MovementPeriod,
  scope: ConsultantExpenseScope,
  trackedTitle?: string,
): number => {
  if (!planning) return 0;

  const summary = computePlannedSpendingSummary(planning, period);
  if (!summary) return 0;

  switch (scope) {
    case "consumo_moderado":
      return summary.consumoModerado;
    case "acompanhamento":
      return resolveTrackedPlannedAmount(planning, trackedTitle);
    case "contas":
      return summary.billsTotal + summary.expectedExpensesTotal;
    case "geral":
      return summary.categoryTotal;
    case "all":
    default:
      return summary.totalPlanned;
  }
};

export const resolveScopeCycleDays = (
  planning: Planning | null,
  period: MovementPeriod,
  scope: ConsultantExpenseScope,
): number => {
  const usesCycleDuration =
    scope === "consumo_moderado" ||
    scope === "acompanhamento" ||
    Boolean(planning?.consumoModeradoCycleStartedAt);

  if (
    usesCycleDuration &&
    Number(planning?.consumoModeradoCycleDurationDays) > 0
  ) {
    return Number(planning.consumoModeradoCycleDurationDays);
  }

  return countDaysInclusive(period.start, period.end);
};

export const computeConsultantScopeDailyMetrics = (
  planning: Planning | null,
  period: MovementPeriod,
  scope: ConsultantExpenseScope,
  filteredExpenses: Expense[],
  trackedTitle?: string,
  referenceDate = new Date(),
): ScopeDailyMetrics => {
  const plannedBudget = resolveScopePlannedBudget(
    planning,
    period,
    scope,
    trackedTitle,
  );
  const cycleDays = resolveScopeCycleDays(planning, period, scope);
  const idealDailyAverage =
    plannedBudget > 0 && cycleDays > 0 ? plannedBudget / cycleDays : 0;

  const today = getStartOfDay(referenceDate);
  const todaySpent = filteredExpenses
    .filter((expense) => isSameCalendarDay(expense.date, today))
    .reduce((sum, expense) => sum + expense.value, 0);

  const totalSpent = filteredExpenses.reduce(
    (sum, expense) => sum + expense.value,
    0,
  );

  const elapsedEnd =
    getEndOfDay(referenceDate) < period.end
      ? getEndOfDay(referenceDate)
      : period.end;
  const elapsedDays = countDaysInclusive(period.start, elapsedEnd);

  const countedDayKeys = new Set<string>();
  filteredExpenses.forEach((expense) => {
    const date = new Date(expense.date);
    if (Number.isNaN(date.getTime())) return;
    if (date < period.start || date > elapsedEnd) return;
    if (expense.value <= 0) return;
    countedDayKeys.add(formatDateToString(getStartOfDay(date)));
  });

  const countedDays = countedDayKeys.size;
  const actualDailyAverage =
    countedDays > 0 ? totalSpent / countedDays : 0;

  const variance = buildVarianceIndicator(
    actualDailyAverage,
    idealDailyAverage > 0 ? idealDailyAverage : undefined,
  );

  return {
    plannedBudget,
    idealDailyAverage,
    actualDailyAverage,
    todaySpent,
    elapsedDays,
    countedDays,
    cycleDays,
    variance,
  };
};
