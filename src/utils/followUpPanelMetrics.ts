import { Expense } from "../types/expense";
import { Income } from "../types/income";
import {
  Bill,
  ExpectedItem,
  isActivePlanningBill,
  Planning,
} from "../types/planning";
import { listTrackedDailyExpenseTitles } from "../services/budgetServices";
import { isCreditCardExpense } from "./creditCardUtils";
import {
  filterTrackedExpensesForTitle,
  isBillPaymentExpense,
  isConsumoModeradoExpense,
  isExpenseCreatedFrom,
  isTrackedDailyExpense,
  normalizeExpenseTitleKey,
} from "./expenseScopeUtils";
import { getPlannedSplitAmounts } from "./planningDisplayUtils";
import {
  isDateWithinPeriod,
  MovementPeriod,
} from "./consultantClientMetrics";
import { formatCurrency } from "./currencyUtils";

export type FollowUpRowKind =
  | "income"
  | "bill"
  | "consumo_moderado"
  | "tracked_expense"
  | "expected_expense";

export type FollowUpDrillTarget =
  | { screen: "ClientIncomeRecords" }
  | { screen: "IncomeList" }
  | { screen: "Budget" }
  | { screen: "Bills" }
  | { screen: "ClientExpenseRecords"; scope?: string; trackedTitle?: string };

export type FollowUpPanelRow = {
  id: string;
  kind: FollowUpRowKind;
  label: string;
  planned: number;
  actual: number;
  difference: number;
  cardHint?: string;
  drill: FollowUpDrillTarget;
};

export type FollowUpPaymentSplit = {
  cash: number;
  card: number;
};

export type FollowUpPanelSection = {
  id: "rendas" | "gastos";
  title: string;
  rows: FollowUpPanelRow[];
  totalPlanned: number;
  totalActual: number;
  totalDifference: number;
  /** Só em GASTOS: quebra caixa × cartão (planejado e efetivo). */
  plannedSplit?: FollowUpPaymentSplit;
  actualSplit?: FollowUpPaymentSplit;
};

export type FollowUpCardSummary = {
  planned: number;
  actual: number;
  difference: number;
};

export type FollowUpPanelModel = {
  period: MovementPeriod;
  incomeSection: FollowUpPanelSection;
  expenseSection: FollowUpPanelSection;
  /** Totais só de cartão, fora do saldo de caixa. */
  cardSummary: FollowUpCardSummary;
  balancePlanned: number;
  balanceActual: number;
  balanceDifference: number;
};

const sumValues = (items: Array<{ value?: number }>): number =>
  items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

const inPeriodExpenses = (
  expenses: Expense[],
  period: MovementPeriod,
): Expense[] =>
  expenses
    .filter((expense) => isDateWithinPeriod(expense.date, period))
    .filter((expense) => isExpenseCreatedFrom(expense, period.createdAtFrom));

const inPeriodCashExpenses = (
  expenses: Expense[],
  period: MovementPeriod,
): Expense[] =>
  inPeriodExpenses(expenses, period).filter(
    (expense) => !isCreditCardExpense(expense),
  );

const inPeriodCardExpenses = (
  expenses: Expense[],
  period: MovementPeriod,
): Expense[] =>
  inPeriodExpenses(expenses, period).filter(isCreditCardExpense);

const addSplit = (
  target: FollowUpPaymentSplit,
  entry: {
    amount?: number;
    amountCard?: number;
    amountCash?: number;
    paymentMethod?: string;
  },
) => {
  const split = getPlannedSplitAmounts(entry);
  target.cash += split.cash;
  target.card += split.card;
};

const sumPlannedExpenseSplit = (
  planning: Planning | null,
): FollowUpPaymentSplit => {
  const total: FollowUpPaymentSplit = { cash: 0, card: 0 };

  (planning?.bills || [])
    .filter(isActivePlanningBill)
    .forEach((bill) => addSplit(total, bill));

  const cmCard = Number(planning?.consumoModeradoCard) || 0;
  const cmCash = Number(planning?.consumoModeradoCash) || 0;
  if (cmCard !== 0 || cmCash !== 0) {
    total.cash += cmCash;
    total.card += cmCard;
  } else {
    total.cash += Number(planning?.consumoModerado) || 0;
  }

  // Acompanhados: uma entrada por título (mesma regra das linhas).
  listTrackedDailyExpenseTitles(planning).forEach((title) => {
    const fromExpected = (planning?.expectedExpenses || []).find(
      (item) =>
        item.dailyTracking &&
        normalizeExpenseTitleKey(item.source) ===
          normalizeExpenseTitleKey(title),
    );
    const fromBill = (planning?.bills || []).find(
      (bill) =>
        bill.dailyTracking &&
        normalizeExpenseTitleKey(bill.name) ===
          normalizeExpenseTitleKey(title),
    );
    const entry = fromExpected || fromBill;
    if (entry) addSplit(total, entry);
  });

  (planning?.expectedExpenses || [])
    .filter((item) => !item.dailyTracking)
    .forEach((item) => addSplit(total, item));

  return total;
};

export const formatFollowUpPaymentSplit = (
  split?: FollowUpPaymentSplit,
): string | undefined => {
  if (!split) return undefined;
  const cash = Number(split.cash) || 0;
  const card = Number(split.card) || 0;
  if (cash <= 0 && card <= 0) return undefined;
  if (card <= 0) return `Caixa: ${formatCurrency(cash)}`;
  if (cash <= 0) return `Cartão: ${formatCurrency(card)}`;
  return `Caixa: ${formatCurrency(cash)} · Cartão: ${formatCurrency(card)}`;
};

const inPeriodIncomes = (
  incomes: Income[],
  period: MovementPeriod,
): Income[] =>
  incomes
    .filter((income) => isDateWithinPeriod(income.date, period))
    .filter((income) => isExpenseCreatedFrom(income, period.createdAtFrom));

const matchIncomeToSource = (
  incomes: Income[],
  source: string,
): Income[] => {
  const key = normalizeExpenseTitleKey(source);
  if (!key) return [];
  return incomes.filter((income) => {
    const desc = normalizeExpenseTitleKey(income.description);
    const origin = normalizeExpenseTitleKey(income.origin);
    const category = normalizeExpenseTitleKey(income.category);
    return desc === key || origin === key || category === key;
  });
};

/** Planejado da linha = caixa + cartão (evita zerar gasto só no cartão). */
const plannedTotalForEntry = (entry: {
  amount?: number;
  amountCard?: number;
  amountCash?: number;
  paymentMethod?: string;
}): number => getPlannedSplitAmounts(entry).total;

const cardHintForEntry = (entry: {
  amount?: number;
  amountCard?: number;
  amountCash?: number;
  paymentMethod?: string;
}): string | undefined => {
  const split = getPlannedSplitAmounts(entry);
  if (split.card <= 0) return undefined;
  if (split.cash > 0) {
    return `Caixa: ${formatCurrency(split.cash)} · Cartão: ${formatCurrency(split.card)}`;
  }
  return `Cartão: ${formatCurrency(split.card)}`;
};

const consumoPlannedTotal = (planning: Planning | null): number => {
  if (!planning) return 0;
  const card = Number(planning.consumoModeradoCard) || 0;
  const cash = Number(planning.consumoModeradoCash) || 0;
  if (card !== 0 || cash !== 0) return cash + card;
  return Number(planning.consumoModerado) || 0;
};

const consumoCardHint = (planning: Planning | null): string | undefined => {
  if (!planning) return undefined;
  const card = Number(planning.consumoModeradoCard) || 0;
  const cash = Number(planning.consumoModeradoCash) || 0;
  if (card <= 0) return undefined;
  if (cash > 0) {
    return `Caixa: ${formatCurrency(cash)} · Cartão: ${formatCurrency(card)}`;
  }
  return `Cartão: ${formatCurrency(card)}`;
};

const unplannedIncomeLabel = (income: Income): string => {
  const description = String(income.description || "").trim();
  if (description) return description;
  const origin = String(income.origin || "").trim();
  if (origin) return origin;
  const category = String(income.category || "").trim();
  if (category) return category;
  return "Outra renda";
};

const planningAvailableInAccount = (planning: Planning | null): number => {
  if (!planning) return 0;
  return (
    Number(planning.availableInAccount ?? planning.monthlyIncome) || 0
  );
};

const buildIncomeRows = (
  planning: Planning | null,
  incomes: Income[],
  period: MovementPeriod,
): FollowUpPanelRow[] => {
  const periodIncomes = inPeriodIncomes(incomes, period);
  const expected = planning?.expectedIncomes || [];
  const matchedIds = new Set<string>();
  const rows: FollowUpPanelRow[] = [];

  // Dinheiro já na conta no planejamento (entra na renda prevista / saldo).
  const availableInAccount = planningAvailableInAccount(planning);
  if (availableInAccount > 0.005) {
    rows.push({
      id: "income-available-in-account",
      kind: "income",
      label: "Em conta",
      planned: availableInAccount,
      // Já disponível no início do ciclo; não é lançamento de renda.
      actual: availableInAccount,
      difference: 0,
      cardHint: "Saldo inicial do planejamento",
      drill: { screen: "ClientIncomeRecords" },
    });
  }

  const plannedRows: FollowUpPanelRow[] = expected.map(
    (item: ExpectedItem, index) => {
      const label = String(item.source || `Renda ${index + 1}`).trim();
      const planned = Number(item.amount) || 0;
      const matched = matchIncomeToSource(periodIncomes, label);
      matched.forEach((income) => matchedIds.add(income.id));
      const actual = sumValues(matched);
      const isTracked = Boolean(item.dailyTracking);

      return {
        id: `income-${item.id || index}-${normalizeExpenseTitleKey(label)}`,
        kind: "income",
        label,
        planned,
        actual,
        difference: actual - planned,
        drill: isTracked
          ? { screen: "IncomeList" }
          : { screen: "ClientIncomeRecords" },
      };
    },
  );

  // Rendas lançadas no período que não batem com nenhuma expectedIncome.
  const unmatched = periodIncomes.filter(
    (income) => !matchedIds.has(income.id),
  );
  const unplannedGroups = new Map<string, Income[]>();
  unmatched.forEach((income) => {
    const label = unplannedIncomeLabel(income);
    const key =
      normalizeExpenseTitleKey(label) ||
      `outra-${income.id || unplannedGroups.size}`;
    const list = unplannedGroups.get(key) || [];
    list.push(income);
    unplannedGroups.set(key, list);
  });

  const unplannedRows: FollowUpPanelRow[] = [...unplannedGroups.entries()].map(
    ([key, group]) => {
      const label = unplannedIncomeLabel(group[0]);
      const actual = sumValues(group);
      return {
        id: `income-unplanned-${key}`,
        kind: "income",
        label,
        planned: 0,
        actual,
        difference: actual,
        cardHint: "Não planejada",
        drill: group.some((income) => Boolean(income.dailyTracking))
          ? { screen: "IncomeList" }
          : { screen: "ClientIncomeRecords" },
      };
    },
  );

  unplannedRows.sort((a, b) =>
    a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }),
  );

  return [...rows, ...plannedRows, ...unplannedRows];
};

const buildExpenseRows = (
  planning: Planning | null,
  expenses: Expense[],
  period: MovementPeriod,
): FollowUpPanelRow[] => {
  // Linhas de GASTOS: planejado e efetivo consideram caixa + cartão.
  const periodExpenses = inPeriodExpenses(expenses, period);
  const rows: FollowUpPanelRow[] = [];

  const bills = (planning?.bills || []).filter(isActivePlanningBill);
  bills.forEach((bill: Bill, index) => {
    const label = String(bill.name || `Conta ${index + 1}`).trim();
    const planned = plannedTotalForEntry(bill);
    const paid = periodExpenses.filter((expense) => {
      if (!isBillPaymentExpense(expense)) return false;
      if (bill.id && expense.sourceBillId) {
        return String(expense.sourceBillId) === String(bill.id);
      }
      return (
        normalizeExpenseTitleKey(expense.description) ===
        normalizeExpenseTitleKey(label)
      );
    });
    const actual = sumValues(paid);
    rows.push({
      id: `bill-${bill.id || index}-${normalizeExpenseTitleKey(label)}`,
      kind: "bill",
      label,
      planned,
      actual,
      difference: actual - planned,
      cardHint: cardHintForEntry(bill),
      drill: { screen: "Bills" },
    });
  });

  const cmPlanned = consumoPlannedTotal(planning);
  const cmActual = sumValues(
    periodExpenses.filter(isConsumoModeradoExpense),
  );
  rows.push({
    id: "consumo-moderado",
    kind: "consumo_moderado",
    label: "Consumo moderado",
    planned: cmPlanned,
    actual: cmActual,
    difference: cmActual - cmPlanned,
    cardHint: consumoCardHint(planning),
    drill: { screen: "Budget" },
  });

  const trackedTitles = listTrackedDailyExpenseTitles(planning);
  trackedTitles.forEach((title) => {
    const fromExpected = (planning?.expectedExpenses || []).find(
      (item) =>
        item.dailyTracking &&
        normalizeExpenseTitleKey(item.source) ===
          normalizeExpenseTitleKey(title),
    );
    const fromBill = (planning?.bills || []).find(
      (bill) =>
        bill.dailyTracking &&
        normalizeExpenseTitleKey(bill.name) ===
          normalizeExpenseTitleKey(title),
    );
    const plannedEntry = fromExpected || fromBill;
    const planned = plannedEntry
      ? plannedTotalForEntry(plannedEntry)
      : 0;
    const matched = filterTrackedExpensesForTitle(periodExpenses, title);
    const actual = sumValues(matched);
    rows.push({
      id: `tracked-${normalizeExpenseTitleKey(title)}`,
      kind: "tracked_expense",
      label: title,
      planned,
      actual,
      difference: actual - planned,
      cardHint: plannedEntry ? cardHintForEntry(plannedEntry) : undefined,
      drill: {
        screen: "ClientExpenseRecords",
        scope: "acompanhamento",
        trackedTitle: title,
      },
    });
  });

  const otherExpected = (planning?.expectedExpenses || []).filter(
    (item) => !item.dailyTracking,
  );
  otherExpected.forEach((item, index) => {
    const label = String(item.source || `Gasto ${index + 1}`).trim();
    const planned = plannedTotalForEntry(item);
    const matched = periodExpenses.filter((expense) => {
      if (isConsumoModeradoExpense(expense)) return false;
      if (isTrackedDailyExpense(expense)) return false;
      if (isBillPaymentExpense(expense)) return false;
      return (
        normalizeExpenseTitleKey(expense.description) ===
          normalizeExpenseTitleKey(label) ||
        normalizeExpenseTitleKey(expense.category) ===
          normalizeExpenseTitleKey(label)
      );
    });
    const actual = sumValues(matched);
    rows.push({
      id: `expected-${item.id || index}-${normalizeExpenseTitleKey(label)}`,
      kind: "expected_expense",
      label,
      planned,
      actual,
      difference: actual - planned,
      cardHint: cardHintForEntry(item),
      drill: { screen: "ClientExpenseRecords", scope: "geral" },
    });
  });

  return rows;
};

const sectionTotals = (
  id: FollowUpPanelSection["id"],
  title: string,
  rows: FollowUpPanelRow[],
  extras?: Pick<FollowUpPanelSection, "plannedSplit" | "actualSplit">,
): FollowUpPanelSection => {
  const totalPlanned = rows.reduce((sum, row) => sum + row.planned, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.actual, 0);
  return {
    id,
    title,
    rows,
    totalPlanned,
    totalActual,
    totalDifference: totalActual - totalPlanned,
    ...extras,
  };
};

export const buildFollowUpPanelModel = (
  planning: Planning | null,
  expenses: Expense[],
  incomes: Income[],
  period: MovementPeriod,
): FollowUpPanelModel => {
  const incomeSection = sectionTotals(
    "rendas",
    "RENDAS",
    buildIncomeRows(planning, incomes, period),
  );

  const plannedSplit = sumPlannedExpenseSplit(planning);
  const actualCash = sumValues(inPeriodCashExpenses(expenses, period));
  const actualCard = sumValues(inPeriodCardExpenses(expenses, period));
  const actualSplit: FollowUpPaymentSplit = {
    cash: actualCash,
    card: actualCard,
  };

  const expenseSection = sectionTotals(
    "gastos",
    "GASTOS",
    buildExpenseRows(planning, expenses, period),
    { plannedSplit, actualSplit },
  );

  // Saldo de caixa: só a parte dinheiro (cartão não reduz saldo do período).
  const balancePlanned =
    incomeSection.totalPlanned - plannedSplit.cash;
  const balanceActual = incomeSection.totalActual - actualCash;
  const cardPlanned = plannedSplit.card;
  const cardActual = actualCard;

  return {
    period,
    incomeSection,
    expenseSection,
    cardSummary: {
      planned: cardPlanned,
      actual: cardActual,
      difference: cardActual - cardPlanned,
    },
    balancePlanned,
    balanceActual,
    balanceDifference: balanceActual - balancePlanned,
  };
};

export const formatFollowUpDifference = (value: number): string => {
  if (Math.abs(value) < 0.005) return formatCurrency(0);
  if (value < 0) return `(${formatCurrency(Math.abs(value))})`;
  return formatCurrency(value);
};

export type FollowUpCardExpenseItem = {
  id: string;
  description: string;
  category: string;
  value: number;
  date: Date;
  paymentLabel: string;
  cardLast4?: string;
  scopeLabel?: string;
};

export type FollowUpCardCategoryGroup = {
  category: string;
  total: number;
  items: FollowUpCardExpenseItem[];
};

export type FollowUpCardBreakdown = {
  total: number;
  categories: FollowUpCardCategoryGroup[];
};

const paymentMethodLabel = (expense: Expense): string => {
  const method = String(expense.paymentMethod || "")
    .trim()
    .toLowerCase();
  if (method === "credit_card" || method === "credit" || method === "credito") {
    return "Crédito";
  }
  if (method === "debit_card" || method === "debit" || method === "debito") {
    return "Débito";
  }
  if (method === "card" || method === "cartao" || method === "cart") {
    return "Cartão";
  }
  if (expense.cardId) return "Cartão";
  return "Cartão";
};

const cardExpenseScopeLabel = (expense: Expense): string | undefined => {
  if (expense.isConsumoModerado) return "Consumo Moderado";
  if (expense.isTrackedDaily) {
    const title = String(expense.trackedTitle || "").trim();
    return title ? `Acompanhado · ${title}` : "Gasto acompanhado";
  }
  if (expense.sourceBillId) return "Conta / fatura";
  if (expense.installmentPurchaseId) return "Compra parcelada";
  return undefined;
};

/** Gastos efetivos no cartão do período, agrupados por categoria. */
export const buildFollowUpCardBreakdown = (
  expenses: Expense[],
  period: MovementPeriod,
): FollowUpCardBreakdown => {
  const cardExpenses = inPeriodCardExpenses(expenses, period)
    .slice()
    .sort((a, b) => {
      const tb = new Date(b.date).getTime();
      const ta = new Date(a.date).getTime();
      return tb - ta;
    });

  const byCategory = new Map<string, FollowUpCardExpenseItem[]>();

  cardExpenses.forEach((expense) => {
    const category =
      String(expense.category || "").trim() || "Sem categoria";
    const item: FollowUpCardExpenseItem = {
      id: expense.id,
      description:
        String(expense.description || "").trim() || "Sem descrição",
      category,
      value: Number(expense.value) || 0,
      date: expense.date instanceof Date ? expense.date : new Date(expense.date),
      paymentLabel: paymentMethodLabel(expense),
      cardLast4: expense.cardLast4
        ? String(expense.cardLast4).trim()
        : undefined,
      scopeLabel: cardExpenseScopeLabel(expense),
    };
    const list = byCategory.get(category) || [];
    list.push(item);
    byCategory.set(category, list);
  });

  const categories: FollowUpCardCategoryGroup[] = [...byCategory.entries()]
    .map(([category, items]) => ({
      category,
      total: items.reduce((sum, item) => sum + item.value, 0),
      items,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total: categories.reduce((sum, group) => sum + group.total, 0),
    categories,
  };
};
