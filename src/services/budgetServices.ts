/**
 * Serviço para gerenciar Orçamentos Mensais
 */

import {
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import {
  getBudgetsCollection,
  getBudgetDoc,
  convertBudgetFromFirestore,
  convertBudgetToFirestore,
  getDocData,
} from "../lib/firestore";
import {
  Budget,
  CreateBudgetData,
  UpdateBudgetData,
  DailyExpense,
} from "../types/budget";
import expenseServices from "./expenseServices";
import {
  getEndOfDay,
  getStartOfDay,
  addDays,
  formatDateToString,
} from "../utils/dateUtils";
import rankingPlanilhaService, {
  type RankingRegistrationResult,
} from "./rankingPlanilhaService";
import {
  isConsumoModeradoExpense,
  isConsumoModeradoHistoryExpense,
  isTrackedDailyExpense,
} from "../utils/expenseScopeUtils";
import { planningServices } from "./planningServices";
import { formatCurrency } from "../utils/currencyUtils";
import { CoupleMember } from "../types/auth";

/**
 * Gerar ID único para o orçamento (userId_YYYY-MM)
 * Conta de casal: userId_YYYY-MM_m1 ou _m2
 */
export const generateBudgetId = (
  userId: string,
  monthYear: string,
  coupleMember?: CoupleMember | null,
): string => {
  if (coupleMember === 1 || coupleMember === 2) {
    return `${userId}_${monthYear}_m${coupleMember}`;
  }
  return `${userId}_${monthYear}`;
};

export const getMonthYearFromDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const listMonthYearsInRange = (start: Date, end: Date): string[] => {
  const months: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor.getTime() <= last.getTime()) {
    months.push(getMonthYearFromDate(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

export const normalizeTrackedTitleKey = (value?: string): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

export type ConsumoModeradoPerformanceIcon =
  | "trending-up"
  | "trending-down"
  | "checkmark-circle"
  | "information-circle-outline";

export interface ConsumoModeradoPerformance {
  budgetValue: number;
  idealDailyAverage: number;
  actualDailyAverage: number;
  totalSpent: number;
  label: string;
  detail: string;
  color: string;
  icon: ConsumoModeradoPerformanceIcon;
}

const isBillPaymentExpense = (expense: { category?: string }): boolean => {
  const normalizedCategory = String(expense?.category || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    normalizedCategory === "conta" ||
    normalizedCategory === "contas" ||
    normalizedCategory === "contas a pagar" ||
    normalizedCategory === "pagamento de conta" ||
    normalizedCategory === "pagamento conta"
  );
};

const buildConsumoModeradoPerformance = (
  budgetValue: number,
  idealDailyAverage: number,
  actualDailyAverage: number,
  totalSpent: number,
): ConsumoModeradoPerformance => {
  if (budgetValue <= 0) {
    return {
      budgetValue: 0,
      idealDailyAverage: 0,
      actualDailyAverage,
      totalSpent,
      label: "Sem planejamento definido",
      detail:
        "Peça ao consultor para preencher o planejamento de consumo moderado.",
      color: "#999",
      icon: "information-circle-outline",
    };
  }

  const difference = actualDailyAverage - idealDailyAverage;
  const tolerance = 0.01;

  if (difference > tolerance) {
    return {
      budgetValue,
      idealDailyAverage,
      actualDailyAverage,
      totalSpent,
      label: "Acima da meta",
      detail: `${formatCurrency(Math.abs(difference))} acima da média diária ideal.`,
      color: "#ff4d6d",
      icon: "trending-up",
    };
  }

  if (difference < -tolerance) {
    return {
      budgetValue,
      idealDailyAverage,
      actualDailyAverage,
      totalSpent,
      label: "Abaixo da meta",
      detail: `${formatCurrency(Math.abs(difference))} abaixo da média diária ideal.`,
      color: "#8c52ff",
      icon: "trending-down",
    };
  }

  return {
    budgetValue,
    idealDailyAverage,
    actualDailyAverage,
    totalSpent,
    label: "Dentro da meta",
    detail: "Sua média diária está alinhada com a meta definida.",
    color: "#c084fc",
    icon: "checkmark-circle",
  };
};

/**
 * Obter mês/ano atual no formato YYYY-MM
 */
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  return getMonthYearFromDate(now);
};

/**
 * Serviço de Orçamentos
 */
export const budgetServices = {
  /**
   * Salvar ou atualizar orçamento do mês
   */
  async saveBudget(
    userId: string,
    monthYear: string,
    data: CreateBudgetData | UpdateBudgetData,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget> {
    console.log("💰 [BUDGET SERVICE] Salvando orçamento...");
    console.log("💰 [BUDGET SERVICE] Dados:", data);

    try {
      const budgetId = generateBudgetId(userId, monthYear, coupleMember);
      const docRef = getBudgetDoc(budgetId);

      // Verificar se já existe
      const existingDoc = await getDoc(docRef);
      const now = new Date();

      let budgetData: any;

      if (existingDoc.exists()) {
        // Atualizar existente
        const existing = convertBudgetFromFirestore(getDocData(existingDoc));
        budgetData = {
          userId,
          monthYear,
          monthlyBudget: data.monthlyBudget ?? existing.monthlyBudget,
          dailyExpenses: data.dailyExpenses ?? existing.dailyExpenses,
          zeroConfirmedDays:
            data.zeroConfirmedDays ?? existing.zeroConfirmedDays ?? [],
          zeroConfirmedDaysNoRanking:
            data.zeroConfirmedDaysNoRanking ??
            existing.zeroConfirmedDaysNoRanking ??
            [],
          zeroPromptDismissedDays:
            data.zeroPromptDismissedDays ??
            existing.zeroPromptDismissedDays ??
            [],
          trackedZeroConfirmedDays:
            data.trackedZeroConfirmedDays ??
            existing.trackedZeroConfirmedDays ??
            {},
          rankingPlanilhaEntries:
            data.rankingPlanilhaEntries ??
            existing.rankingPlanilhaEntries ??
            [],
          createdAt: Timestamp.fromDate(existing.createdAt),
          updatedAt: Timestamp.fromDate(now),
        };
      } else {
        // Criar novo
        budgetData = {
          userId,
          monthYear,
          monthlyBudget: (data as CreateBudgetData).monthlyBudget || 0,
          dailyExpenses: data.dailyExpenses || [],
          zeroConfirmedDays: data.zeroConfirmedDays || [],
          zeroConfirmedDaysNoRanking: data.zeroConfirmedDaysNoRanking || [],
          zeroPromptDismissedDays: data.zeroPromptDismissedDays || [],
          trackedZeroConfirmedDays: data.trackedZeroConfirmedDays || {},
          rankingPlanilhaEntries: data.rankingPlanilhaEntries || [],
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        };
      }

      await setDoc(docRef, budgetData);
      console.log("✅ [BUDGET SERVICE] Orçamento salvo com ID:", budgetId);

      const budget: Budget = {
        id: budgetId,
        userId,
        monthYear,
        monthlyBudget: budgetData.monthlyBudget,
        dailyExpenses: budgetData.dailyExpenses,
        zeroConfirmedDays: budgetData.zeroConfirmedDays || [],
        zeroConfirmedDaysNoRanking: budgetData.zeroConfirmedDaysNoRanking || [],
        zeroPromptDismissedDays: budgetData.zeroPromptDismissedDays || [],
        trackedZeroConfirmedDays: budgetData.trackedZeroConfirmedDays || {},
        rankingPlanilhaEntries: budgetData.rankingPlanilhaEntries || [],
        createdAt: budgetData.createdAt.toDate(),
        updatedAt: budgetData.updatedAt.toDate(),
      };

      return budget;
    } catch (error) {
      console.error("❌ [BUDGET SERVICE] Erro ao salvar orçamento:", error);
      throw error;
    }
  },

  /**
   * Reinicia os dados do orçamento do mês referência sem alterar o teto mensal.
   */
  async resetBudgetForDate(
    userId: string,
    referenceDate: Date = new Date(),
    coupleMember?: CoupleMember | null,
  ): Promise<Budget> {
    const monthYear = getMonthYearFromDate(referenceDate);
    const currentBudget = await this.getBudget(
      userId,
      monthYear,
      coupleMember,
    );

    return this.saveBudget(
      userId,
      monthYear,
      {
        monthlyBudget: currentBudget?.monthlyBudget,
        dailyExpenses: [],
        zeroConfirmedDays: [],
        zeroConfirmedDaysNoRanking: [],
        zeroPromptDismissedDays: [],
        trackedZeroConfirmedDays: {},
        rankingPlanilhaEntries: currentBudget?.rankingPlanilhaEntries ?? [],
      },
      coupleMember,
    );
  },

  async resetCoupleBudgetsForDate(
    userId: string,
    referenceDate: Date = new Date(),
  ): Promise<void> {
    await Promise.all([
      this.resetBudgetForDate(userId, referenceDate, 1),
      this.resetBudgetForDate(userId, referenceDate, 2),
    ]);
  },

  /**
   * Buscar orçamento de um mês específico
   */
  async getBudget(
    userId: string,
    monthYear: string,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget | null> {
    console.log("💰 [BUDGET SERVICE] Buscando orçamento:", monthYear);

    try {
      const budgetId = generateBudgetId(userId, monthYear, coupleMember);
      const docRef = getBudgetDoc(budgetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log("⚠️ [BUDGET SERVICE] Orçamento não encontrado");
        return null;
      }

      const budget = convertBudgetFromFirestore(getDocData(docSnap));
      console.log("✅ [BUDGET SERVICE] Orçamento encontrado:", budget);
      return budget;
    } catch (error) {
      console.error("❌ [BUDGET SERVICE] Erro ao buscar orçamento:", error);
      throw error;
    }
  },

  /**
   * Buscar orçamento do mês atual
   */
  async getCurrentBudget(
    userId: string,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget | null> {
    const currentMonthYear = getCurrentMonthYear();
    return this.getBudget(userId, currentMonthYear, coupleMember);
  },

  /**
   * Atualizar orçamento mensal
   */
  async updateMonthlyBudget(
    userId: string,
    monthYear: string,
    monthlyBudget: number,
  ): Promise<Budget> {
    console.log("💰 [BUDGET SERVICE] Atualizando orçamento mensal...");

    return this.saveBudget(userId, monthYear, { monthlyBudget });
  },

  /**
   * Adicionar ou atualizar gasto de um dia
   */
  async updateDailyExpense(
    userId: string,
    monthYear: string,
    day: number,
    amount: number,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget> {
    console.log("💰 [BUDGET SERVICE] Atualizando gasto do dia", day);

    try {
      const budget = await this.getBudget(userId, monthYear, coupleMember);

      if (!budget) {
        const saved = await this.saveBudget(
          userId,
          monthYear,
          {
            monthlyBudget: 0,
            dailyExpenses: [{ day, amount }],
          },
          coupleMember,
        );

        if (amount > 0) {
          const [year, month] = monthYear.split("-").map(Number);
          const targetDate = new Date(year, month - 1, day);
          await rankingPlanilhaService.recordPlanilhaRegistration(
            userId,
            targetDate,
            new Date(),
            "expense",
            coupleMember,
          );
        }

        return saved;
      }

      const updatedExpenses = [...budget.dailyExpenses];
      const existingIndex = updatedExpenses.findIndex((exp) => exp.day === day);

      if (existingIndex >= 0) {
        updatedExpenses[existingIndex] = { day, amount };
      } else {
        updatedExpenses.push({ day, amount });
      }

      const updatedZeroConfirmedDays = (budget.zeroConfirmedDays || []).filter(
        (d) => d !== day || amount <= 0,
      );
      const updatedZeroNoRankingDays = (
        budget.zeroConfirmedDaysNoRanking || []
      ).filter((d) => d !== day || amount <= 0);

      updatedExpenses.sort((a, b) => a.day - b.day);

      const saved = await this.saveBudget(
        userId,
        monthYear,
        {
          monthlyBudget: budget.monthlyBudget,
          dailyExpenses: updatedExpenses,
          zeroConfirmedDays: updatedZeroConfirmedDays,
          zeroConfirmedDaysNoRanking: updatedZeroNoRankingDays,
        },
        coupleMember,
      );

      if (amount > 0) {
        const [year, month] = monthYear.split("-").map(Number);
        const targetDate = new Date(year, month - 1, day);
        await rankingPlanilhaService.recordPlanilhaRegistration(
          userId,
          targetDate,
          new Date(),
          "expense",
          coupleMember,
        );
      }

      return saved;
    } catch (error) {
      console.error(
        "❌ [BUDGET SERVICE] Erro ao atualizar gasto diário:",
        error,
      );
      throw error;
    }
  },

  async confirmZeroExpenseDay(
    userId: string,
    date: Date,
    coupleMember?: CoupleMember | null,
  ): Promise<{
    budget: Budget;
    ranking: Awaited<
      ReturnType<typeof rankingPlanilhaService.recordPlanilhaRegistration>
    >;
  }> {
    const monthYear = getMonthYearFromDate(date);
    const day = date.getDate();

    const budget = await this.getBudget(userId, monthYear, coupleMember);

    if (!budget) {
      const saved = await this.saveBudget(
        userId,
        monthYear,
        {
          monthlyBudget: 0,
          dailyExpenses: [{ day, amount: 0 }],
          zeroConfirmedDays: [day],
        },
        coupleMember,
      );
      const ranking = await rankingPlanilhaService.recordPlanilhaRegistration(
        userId,
        date,
        new Date(),
        "zero",
        coupleMember,
      );
      return { budget: saved, ranking };
    }

    const dailyExpenses = [...(budget.dailyExpenses || [])];
    const dayIndex = dailyExpenses.findIndex((item) => item.day === day);

    if (dayIndex >= 0) {
      dailyExpenses[dayIndex] = { day, amount: 0 };
    } else {
      dailyExpenses.push({ day, amount: 0 });
    }

    dailyExpenses.sort((a, b) => a.day - b.day);

    const zeroConfirmedSet = new Set<number>(budget.zeroConfirmedDays || []);
    zeroConfirmedSet.add(day);
    const zeroNoRankingSet = new Set<number>(
      budget.zeroConfirmedDaysNoRanking || [],
    );
    zeroNoRankingSet.delete(day);

    const saved = await this.saveBudget(
      userId,
      monthYear,
      {
        monthlyBudget: budget.monthlyBudget,
        dailyExpenses,
        zeroConfirmedDays: Array.from(zeroConfirmedSet).sort((a, b) => a - b),
        zeroConfirmedDaysNoRanking: Array.from(zeroNoRankingSet).sort(
          (a, b) => a - b,
        ),
      },
      coupleMember,
    );

    const ranking = await rankingPlanilhaService.recordPlanilhaRegistration(
      userId,
      date,
      new Date(),
      "zero",
      coupleMember,
    );

    return { budget: saved, ranking };
  },

  async reconcileConsumoModeradoDay(
    userId: string,
    date: Date,
    coupleMember?: CoupleMember | null,
  ): Promise<RankingRegistrationResult | null> {
    const monthYear = getMonthYearFromDate(date);
    const day = date.getDate();
    const remaining = await expenseServices.getExpenses(userId, {
      startDate: getStartOfDay(date),
      endDate: getEndOfDay(date),
      coupleMember: coupleMember || undefined,
    });
    const remainingTotal = remaining
      .filter(isConsumoModeradoHistoryExpense)
      .reduce((sum, expense) => sum + (Number(expense.value) || 0), 0);

    const budget = await this.getBudget(userId, monthYear, coupleMember);
    if (!budget && remainingTotal <= 0) return null;

    const updatedExpenses = ((budget?.dailyExpenses || []) as DailyExpense[]).filter(
      (item) => item.day !== day,
    );
    if (remainingTotal > 0) {
      updatedExpenses.push({ day, amount: remainingTotal });
      updatedExpenses.sort((a, b) => a.day - b.day);
    }

    const updatedZeroConfirmedDays =
      remainingTotal > 0
        ? (budget?.zeroConfirmedDays || []).filter((item) => item !== day)
        : budget?.zeroConfirmedDays || [];

    await this.saveBudget(
      userId,
      monthYear,
      {
        monthlyBudget: budget?.monthlyBudget || 0,
        dailyExpenses: updatedExpenses,
        zeroConfirmedDays: updatedZeroConfirmedDays,
        zeroConfirmedDaysNoRanking: budget?.zeroConfirmedDaysNoRanking || [],
      },
      coupleMember,
    );

    if (remainingTotal > 0) {
      return rankingPlanilhaService.recordPlanilhaRegistration(
        userId,
        date,
        new Date(),
        "expense",
        coupleMember,
      );
    }

    return null;
  },

  async correctConsumoModeradoDayToZero(
    userId: string,
    date: Date,
    coupleMember?: CoupleMember | null,
  ): Promise<{
    budget: Budget;
    ranking: RankingRegistrationResult;
  }> {
    const deletedCount =
      await expenseServices.deleteConsumoModeradoExpensesForDay(
        userId,
        date,
        coupleMember || undefined,
      );

    if (deletedCount === 0) {
      throw new Error("Não há gastos de consumo moderado neste dia para corrigir.");
    }

    return this.confirmZeroExpenseDay(userId, date, coupleMember);
  },

  async confirmZeroExpenseDayForTracked(
    userId: string,
    date: Date,
    trackedTitle: string,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget> {
    const monthYear = getMonthYearFromDate(date);
    const day = date.getDate();
    const titleKey = normalizeTrackedTitleKey(trackedTitle);

    if (!titleKey) {
      throw new Error("Título do acompanhamento inválido");
    }

    const budget = await this.getBudget(userId, monthYear, coupleMember);
    const trackedMap = { ...(budget?.trackedZeroConfirmedDays || {}) };
    const daysSet = new Set<number>(trackedMap[titleKey] || []);
    daysSet.add(day);
    trackedMap[titleKey] = Array.from(daysSet).sort((a, b) => a - b);

    return this.saveBudget(
      userId,
      monthYear,
      {
        monthlyBudget: budget?.monthlyBudget ?? 0,
        dailyExpenses: budget?.dailyExpenses ?? [],
        zeroConfirmedDays: budget?.zeroConfirmedDays ?? [],
        zeroConfirmedDaysNoRanking: budget?.zeroConfirmedDaysNoRanking ?? [],
        zeroPromptDismissedDays: budget?.zeroPromptDismissedDays ?? [],
        trackedZeroConfirmedDays: trackedMap,
        rankingPlanilhaEntries: budget?.rankingPlanilhaEntries ?? [],
      },
      coupleMember,
    );
  },

  async isDayExpensePromptResolved(
    userId: string,
    date: Date,
    coupleMember?: CoupleMember | null,
  ): Promise<boolean> {
    const monthYear = getMonthYearFromDate(date);
    const day = date.getDate();
    const budget = await this.getBudget(userId, monthYear, coupleMember);

    if (budget) {
      if ((budget.zeroConfirmedDays || []).includes(day)) return true;
      if ((budget.zeroConfirmedDaysNoRanking || []).includes(day)) return true;
      if ((budget.zeroPromptDismissedDays || []).includes(day)) return true;

      const dailyEntry = (budget.dailyExpenses || []).find(
        (item) => item.day === day,
      );
      if (dailyEntry && dailyEntry.amount > 0) return true;
    }

    const expenses = await expenseServices.getExpenses(userId, {
      startDate: getStartOfDay(date),
      endDate: getEndOfDay(date),
      coupleMember: coupleMember || undefined,
    });

    const planilhaTotal = expenses
      .filter((item) => isConsumoModeradoExpense(item))
      .reduce((sum, item) => sum + item.value, 0);
    return planilhaTotal > 0;
  },

  async dismissExpensePromptForDay(
    userId: string,
    date: Date,
    coupleMember?: CoupleMember | null,
  ): Promise<Budget> {
    const monthYear = getMonthYearFromDate(date);
    const day = date.getDate();
    const budget = await this.getBudget(userId, monthYear, coupleMember);

    if (!budget) {
      return this.saveBudget(
        userId,
        monthYear,
        {
          monthlyBudget: 0,
          dailyExpenses: [],
          zeroConfirmedDays: [],
          zeroConfirmedDaysNoRanking: [],
          zeroPromptDismissedDays: [day],
        },
        coupleMember,
      );
    }

    const dismissedSet = new Set<number>(budget.zeroPromptDismissedDays || []);
    dismissedSet.add(day);

    return this.saveBudget(
      userId,
      monthYear,
      {
        monthlyBudget: budget.monthlyBudget,
        dailyExpenses: budget.dailyExpenses,
        zeroConfirmedDays: budget.zeroConfirmedDays,
        zeroConfirmedDaysNoRanking: budget.zeroConfirmedDaysNoRanking,
        zeroPromptDismissedDays: Array.from(dismissedSet).sort((a, b) => a - b),
      },
      coupleMember,
    );
  },

  async syncRankingPenalties(
    userId: string,
    asOfDate: Date = new Date(),
    coupleMember?: CoupleMember | null,
  ): Promise<void> {
    await rankingPlanilhaService.applyMissedPenalties(
      userId,
      asOfDate,
      coupleMember,
    );
  },

  async getAllBudgets(userId: string): Promise<Budget[]> {
    console.log("💰 [BUDGET SERVICE] Buscando todos os orçamentos...");

    try {
      const q = query(getBudgetsCollection(), where("userId", "==", userId));

      const snapshot = await getDocs(q);
      const budgets = snapshot.docs.map((doc) =>
        convertBudgetFromFirestore(getDocData(doc)),
      );

      // Ordenar por mês/ano (mais recente primeiro)
      budgets.sort((a, b) => b.monthYear.localeCompare(a.monthYear));

      console.log("💰 [BUDGET SERVICE] Total de orçamentos:", budgets.length);
      return budgets;
    } catch (error) {
      console.error("❌ [BUDGET SERVICE] Erro ao buscar orçamentos:", error);
      throw error;
    }
  },

  async getConsumoModeradoPerformance(
    userId: string,
  ): Promise<ConsumoModeradoPerformance | null> {
    try {
      const planning = await planningServices.getPlanning(userId);
      const budgetValue = Number(planning?.consumoModerado ?? 0);
      const plannedCycleDurationDays = Number(
        planning?.consumoModeradoCycleDurationDays || 0,
      );

      const today = new Date();
      const cycleStartedAtRaw = planning?.consumoModeradoCycleStartedAt
        ? new Date(planning.consumoModeradoCycleStartedAt)
        : null;
      const cycleStartDate = cycleStartedAtRaw
        ? getStartOfDay(cycleStartedAtRaw)
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

      let start: Date;
      let end: Date;
      if (!cycleStartDate && !cycleEndDate) {
        start = getStartOfDay(
          new Date(today.getFullYear(), today.getMonth(), 1),
        );
        end = getEndOfDay(
          new Date(today.getFullYear(), today.getMonth() + 1, 0),
        );
      } else {
        start = cycleStartDate || getStartOfDay(today);
        end = cycleEndDate || getEndOfDay(today);
      }

      const cycleDates: Date[] = [];
      let dateCursor = getStartOfDay(start);
      const lastDate = getStartOfDay(end);
      while (dateCursor <= lastDate) {
        cycleDates.push(new Date(dateCursor));
        dateCursor = addDays(dateCursor, 1);
      }

      const daysInCycle = Math.max(
        1,
        Math.floor(
          (lastDate.getTime() - getStartOfDay(start).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );
      const daysForIdealTarget =
        plannedCycleDurationDays > 0 ? plannedCycleDurationDays : daysInCycle;
      const idealDailyAverage =
        budgetValue > 0 && daysForIdealTarget > 0
          ? budgetValue / daysForIdealTarget
          : 0;

      const [plainBudget, member1Budget, member2Budget] = await Promise.all([
        this.getCurrentBudget(userId),
        this.getCurrentBudget(userId, 1),
        this.getCurrentBudget(userId, 2),
      ]);
      const zeroConfirmedDays = Array.from(
        new Set([
          ...(plainBudget?.zeroConfirmedDays || []),
          ...(member1Budget?.zeroConfirmedDays || []),
          ...(member2Budget?.zeroConfirmedDays || []),
        ]),
      );
      const budget = member1Budget || member2Budget || plainBudget;

      const expenses = await expenseServices.getExpenses(userId, {
        startDate: start,
        endDate: end,
        createdAtFrom: cycleStartedAtRaw || undefined,
      });

      const expensesForModerado = expenses.filter((expense) => {
        if (isTrackedDailyExpense(expense)) return false;
        if (isBillPaymentExpense(expense)) return false;
        return true;
      });

      const map = new Map<number, number>();
      let cursor = getStartOfDay(start);
      while (cursor <= getStartOfDay(end)) {
        map.set(cursor.getDate(), 0);
        cursor = addDays(cursor, 1);
      }

      expensesForModerado.forEach((expense) => {
        const dayNum = new Date(expense.date).getDate();
        const prev = map.get(dayNum) ?? 0;
        const value =
          typeof expense.value === "number"
            ? expense.value
            : parseFloat(String(expense.value)) || 0;
        map.set(dayNum, prev + value);
      });

      const computed: DailyExpense[] = Array.from(map.entries())
        .map(([day, amount]) => ({ day, amount }))
        .sort((a, b) => a.day - b.day);

      const dailyExpenses =
        (budget?.dailyExpenses || []).length > 0
          ? (() => {
              const byDay = new Map<number, number>();
              computed.forEach((item) => byDay.set(item.day, item.amount));
              (budget?.dailyExpenses || []).forEach((item) => {
                const existing = byDay.get(item.day) ?? 0;
                byDay.set(item.day, existing > 0 ? existing : item.amount);
              });
              return Array.from(byDay.entries())
                .map(([day, amount]) => ({ day, amount }))
                .sort((a, b) => a.day - b.day);
            })()
          : computed;

      const totalSpent = dailyExpenses.reduce(
        (sum, item) => sum + item.amount,
        0,
      );

      const countedDays = cycleDates.filter((date) => {
        const day = date.getDate();
        const hasExpense = dailyExpenses.some(
          (item) => item.day === day && item.amount > 0,
        );
        const isZeroConfirmed = zeroConfirmedDays.includes(day);
        return hasExpense || isZeroConfirmed;
      }).length;

      const actualDailyAverage =
        countedDays > 0 ? totalSpent / countedDays : 0;

      return buildConsumoModeradoPerformance(
        budgetValue,
        idealDailyAverage,
        actualDailyAverage,
        totalSpent,
      );
    } catch (error) {
      console.error(
        "❌ [BUDGET SERVICE] Erro ao calcular performance do consumo moderado:",
        error,
      );
      return null;
    }
  },

  /**
   * Calcular estatísticas do orçamento
   */
  calculateStats(budget: Budget, currentDay: number) {
    const totalSpent = budget.dailyExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0,
    );

    const daysInMonth = new Date(
      parseInt(budget.monthYear.split("-")[0]),
      parseInt(budget.monthYear.split("-")[1]),
      0,
    ).getDate();

    const idealDailyAverage = budget.monthlyBudget / daysInMonth;
    const actualDailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;
    const isOverBudget =
      actualDailyAverage > idealDailyAverage && budget.monthlyBudget > 0;

    return {
      totalSpent,
      daysInMonth,
      idealDailyAverage,
      actualDailyAverage,
      isOverBudget,
      remainingBudget: budget.monthlyBudget - totalSpent,
      percentageUsed:
        budget.monthlyBudget > 0
          ? (totalSpent / budget.monthlyBudget) * 100
          : 0,
    };
  },
};

export const listConfirmedZeroDays = async (
  userId: string,
  start: Date,
  end: Date,
): Promise<{
  consumoDateKeys: string[];
  trackedByTitleKey: Record<string, string[]>;
}> => {
  const rangeStart = getStartOfDay(start);
  const rangeEnd = getEndOfDay(end);
  const consumoDateKeys: string[] = [];
  const trackedByTitleKey: Record<string, string[]> = {};

  const monthYears = listMonthYearsInRange(rangeStart, rangeEnd);
  await Promise.all(
    monthYears.map(async (monthYear) => {
      const budgets = await Promise.all([
        budgetServices.getBudget(userId, monthYear),
        budgetServices.getBudget(userId, monthYear, 1),
        budgetServices.getBudget(userId, monthYear, 2),
      ]);
      const existing = budgets.filter(Boolean);
      if (existing.length === 0) return;

      const [year, month] = monthYear.split("-").map(Number);
      const toDateKey = (day: number): string | null => {
        const date = new Date(year, month - 1, day, 12);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1) {
          return null;
        }
        if (date < rangeStart || date > rangeEnd) return null;
        return formatDateToString(date);
      };

      existing.forEach((budget) => {
        if (!budget) return;
        const consumoDays = new Set<number>([
          ...(budget.zeroConfirmedDays || []),
          ...(budget.zeroConfirmedDaysNoRanking || []),
        ]);
        consumoDays.forEach((day) => {
          const dateKey = toDateKey(day);
          if (dateKey) consumoDateKeys.push(dateKey);
        });

        Object.entries(budget.trackedZeroConfirmedDays || {}).forEach(
          ([titleKey, days]) => {
            days.forEach((day) => {
              const dateKey = toDateKey(day);
              if (!dateKey) return;
              if (!trackedByTitleKey[titleKey]) {
                trackedByTitleKey[titleKey] = [];
              }
              trackedByTitleKey[titleKey].push(dateKey);
            });
          },
        );
      });
    }),
  );

  return { consumoDateKeys, trackedByTitleKey };
};

export default budgetServices;
