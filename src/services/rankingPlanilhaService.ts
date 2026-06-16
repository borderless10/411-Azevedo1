/**
 * Pontuação do ranking — planilha de consumo moderado
 */

import { Budget, RankingPlanilhaEntry } from "../types/budget";
import {
  formatDateToString,
  getStartOfDay,
  subtractDays,
} from "../utils/dateUtils";

export const RANKING_PLANILHA_POINTS = {
  ZERO_NEXT_DAY: 2,
  EXPENSE: 1,
  MISSED: 0,
} as const;

export type PlanilhaRegistrationKind = "zero" | "expense";

export const calendarDaysBetween = (from: Date, to: Date): number => {
  const start = getStartOfDay(from).getTime();
  const end = getStartOfDay(to).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24));
};

const getEntryForDate = (
  budget: Budget | null,
  dateKey: string,
): RankingPlanilhaEntry | undefined =>
  (budget?.rankingPlanilhaEntries || []).find(
    (entry) => entry.dateKey === dateKey,
  );

export const hasPlanilhaRegistration = (
  budget: Budget | null,
  targetDate: Date,
): boolean => {
  const dateKey = formatDateToString(targetDate);
  const entry = getEntryForDate(budget, dateKey);
  if (entry) return true;

  const day = targetDate.getDate();
  const zeroRanking = (budget?.zeroConfirmedDays || []).includes(day);
  const zeroNoRanking = (budget?.zeroConfirmedDaysNoRanking || []).includes(day);
  const hasRankingZero = zeroRanking && !zeroNoRanking;
  const dailyEntry = (budget?.dailyExpenses || []).find(
    (item) => item.day === day,
  );
  const hasExpense = Boolean(dailyEntry && dailyEntry.amount > 0);

  return hasRankingZero || hasExpense;
};

const persistEntries = async (
  userId: string,
  monthYear: string,
  budget: Budget | null,
  entries: RankingPlanilhaEntry[],
): Promise<void> => {
  const { budgetServices } = await import("./budgetServices");
  await budgetServices.saveBudget(userId, monthYear, {
    monthlyBudget: budget?.monthlyBudget ?? 0,
    dailyExpenses: budget?.dailyExpenses ?? [],
    zeroConfirmedDays: budget?.zeroConfirmedDays ?? [],
    zeroConfirmedDaysNoRanking: budget?.zeroConfirmedDaysNoRanking ?? [],
    zeroPromptDismissedDays: budget?.zeroPromptDismissedDays ?? [],
    rankingPlanilhaEntries: entries,
  });
};

const getMonthYearFromDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const markMissedDay = async (
  userId: string,
  targetDate: Date,
  registeredAt: Date,
): Promise<void> => {
  const { budgetServices } = await import("./budgetServices");
  const monthYear = getMonthYearFromDate(targetDate);
  const budget = await budgetServices.getBudget(userId, monthYear);
  const dateKey = formatDateToString(targetDate);
  const entries = [...(budget?.rankingPlanilhaEntries || [])];

  if (entries.some((entry) => entry.dateKey === dateKey)) {
    return;
  }

  entries.push({
    dateKey,
    points: RANKING_PLANILHA_POINTS.MISSED,
    type: "missed",
    registeredAt: formatDateToString(registeredAt),
  });

  await persistEntries(userId, monthYear, budget, entries);
};

export const rankingPlanilhaService = {
  calendarDaysBetween,

  async applyMissedPenalties(
    userId: string,
    asOfDate: Date = new Date(),
  ): Promise<void> {
    const { budgetServices } = await import("./budgetServices");
    const today = getStartOfDay(asOfDate);
    const firstDay = subtractDays(today, 2);
    const secondDay = subtractDays(today, 1);

    const monthYearFirst = getMonthYearFromDate(firstDay);
    const monthYearSecond = getMonthYearFromDate(secondDay);

    const [budgetFirst, budgetSecond] = await Promise.all([
      budgetServices.getBudget(userId, monthYearFirst),
      monthYearFirst === monthYearSecond
        ? Promise.resolve(null)
        : budgetServices.getBudget(userId, monthYearSecond),
    ]);

    const budgetForSecond =
      monthYearFirst === monthYearSecond ? budgetFirst : budgetSecond;

    const firstRegistered = hasPlanilhaRegistration(budgetFirst, firstDay);
    const secondRegistered = hasPlanilhaRegistration(budgetForSecond, secondDay);

    if (!firstRegistered && !secondRegistered) {
      await markMissedDay(userId, firstDay, today);
      await markMissedDay(userId, secondDay, today);
    }
  },

  async recordPlanilhaRegistration(
    userId: string,
    targetDate: Date,
    registeredAt: Date = new Date(),
    kind: PlanilhaRegistrationKind,
  ): Promise<{ points: number; applied: boolean; type?: RankingPlanilhaEntry["type"] }> {
    await this.applyMissedPenalties(userId, registeredAt);

    const { budgetServices } = await import("./budgetServices");
    const monthYear = getMonthYearFromDate(targetDate);
    const budget = await budgetServices.getBudget(userId, monthYear);
    const dateKey = formatDateToString(targetDate);
    const entries = [...(budget?.rankingPlanilhaEntries || [])];
    const existing = entries.find((entry) => entry.dateKey === dateKey);

    if (existing) {
      return { points: existing.points, applied: false, type: existing.type };
    }

    const diff = calendarDaysBetween(targetDate, registeredAt);
    let points = RANKING_PLANILHA_POINTS.MISSED;
    let type: RankingPlanilhaEntry["type"] = "missed";

    if (kind === "zero") {
      if (diff === 1) {
        points = RANKING_PLANILHA_POINTS.ZERO_NEXT_DAY;
        type = "zero_next_day";
      }
    } else if (kind === "expense") {
      if (diff === 0 || diff === 1) {
        points = RANKING_PLANILHA_POINTS.EXPENSE;
        type = diff === 0 ? "expense_same_day" : "expense_next_day";
      }
    }

    const entry: RankingPlanilhaEntry = {
      dateKey,
      points,
      type,
      registeredAt: formatDateToString(registeredAt),
    };

    entries.push(entry);
    await persistEntries(userId, monthYear, budget, entries);

    return { points, applied: true, type };
  },

  getTotalPointsFromBudgets(budgets: Budget[]): number {
    return budgets.reduce((total, budget) => {
      const entries = budget.rankingPlanilhaEntries || [];
      return total + entries.reduce((sum, entry) => sum + entry.points, 0);
    }, 0);
  },
};

export default rankingPlanilhaService;
