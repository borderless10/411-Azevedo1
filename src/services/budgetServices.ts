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
} from 'firebase/firestore';
import {
  getBudgetsCollection,
  getBudgetDoc,
  convertBudgetFromFirestore,
  convertBudgetToFirestore,
  getDocData,
} from '../lib/firestore';
import {
  Budget,
  CreateBudgetData,
  UpdateBudgetData,
  DailyExpense,
} from '../types/budget';

/**
 * Gerar ID único para o orçamento (userId_YYYY-MM)
 */
const generateBudgetId = (userId: string, monthYear: string): string => {
  return `${userId}_${monthYear}`;
};

/**
 * Obter mês/ano atual no formato YYYY-MM
 */
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
    data: CreateBudgetData | UpdateBudgetData
  ): Promise<Budget> {
    console.log('💰 [BUDGET SERVICE] Salvando orçamento...');
    console.log('💰 [BUDGET SERVICE] Dados:', data);

    try {
      const budgetId = generateBudgetId(userId, monthYear);
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
          createdAt: Timestamp.fromDate(now),
          updatedAt: Timestamp.fromDate(now),
        };
      }

      await setDoc(docRef, budgetData);
      console.log('✅ [BUDGET SERVICE] Orçamento salvo com ID:', budgetId);

      const budget: Budget = {
        id: budgetId,
        userId,
        monthYear,
        monthlyBudget: budgetData.monthlyBudget,
        dailyExpenses: budgetData.dailyExpenses,
        createdAt: budgetData.createdAt.toDate(),
        updatedAt: budgetData.updatedAt.toDate(),
      };

      return budget;
    } catch (error) {
      console.error('❌ [BUDGET SERVICE] Erro ao salvar orçamento:', error);
      throw error;
    }
  },

  /**
   * Buscar orçamento de um mês específico
   */
  async getBudget(userId: string, monthYear: string): Promise<Budget | null> {
    console.log('💰 [BUDGET SERVICE] Buscando orçamento:', monthYear);

    try {
      const budgetId = generateBudgetId(userId, monthYear);
      const docRef = getBudgetDoc(budgetId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('⚠️ [BUDGET SERVICE] Orçamento não encontrado');
        return null;
      }

      const budget = convertBudgetFromFirestore(getDocData(docSnap));
      console.log('✅ [BUDGET SERVICE] Orçamento encontrado:', budget);
      return budget;
    } catch (error) {
      console.error('❌ [BUDGET SERVICE] Erro ao buscar orçamento:', error);
      throw error;
    }
  },

  /**
   * Buscar orçamento do mês atual
   */
  async getCurrentBudget(userId: string): Promise<Budget | null> {
    const currentMonthYear = getCurrentMonthYear();
    return this.getBudget(userId, currentMonthYear);
  },

  /**
   * Atualizar orçamento mensal
   */
  async updateMonthlyBudget(
    userId: string,
    monthYear: string,
    monthlyBudget: number
  ): Promise<Budget> {
    console.log('💰 [BUDGET SERVICE] Atualizando orçamento mensal...');

    return this.saveBudget(userId, monthYear, { monthlyBudget });
  },

  /**
   * Adicionar ou atualizar gasto de um dia
   */
  async updateDailyExpense(
    userId: string,
    monthYear: string,
    day: number,
    amount: number
  ): Promise<Budget> {
    console.log('💰 [BUDGET SERVICE] Atualizando gasto do dia', day);

    try {
      // Buscar orçamento atual
      const budget = await this.getBudget(userId, monthYear);
      
      if (!budget) {
        // Se não existe, criar novo com o gasto
        return this.saveBudget(userId, monthYear, {
          monthlyBudget: 0,
          dailyExpenses: [{ day, amount }],
        });
      }

      // Atualizar array de gastos diários
      const updatedExpenses = [...budget.dailyExpenses];
      const existingIndex = updatedExpenses.findIndex(exp => exp.day === day);

      if (existingIndex >= 0) {
        updatedExpenses[existingIndex] = { day, amount };
      } else {
        updatedExpenses.push({ day, amount });
      }

      // Ordenar por dia
      updatedExpenses.sort((a, b) => a.day - b.day);

      return this.saveBudget(userId, monthYear, {
        monthlyBudget: budget.monthlyBudget,
        dailyExpenses: updatedExpenses,
      });
    } catch (error) {
      console.error('❌ [BUDGET SERVICE] Erro ao atualizar gasto diário:', error);
      throw error;
    }
  },

  /**
   * Buscar todos os orçamentos do usuário
   */
  async getAllBudgets(userId: string): Promise<Budget[]> {
    console.log('💰 [BUDGET SERVICE] Buscando todos os orçamentos...');

    try {
      const q = query(
        getBudgetsCollection(),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const budgets = snapshot.docs.map((doc) =>
        convertBudgetFromFirestore(getDocData(doc))
      );

      // Ordenar por mês/ano (mais recente primeiro)
      budgets.sort((a, b) => b.monthYear.localeCompare(a.monthYear));

      console.log('💰 [BUDGET SERVICE] Total de orçamentos:', budgets.length);
      return budgets;
    } catch (error) {
      console.error('❌ [BUDGET SERVICE] Erro ao buscar orçamentos:', error);
      throw error;
    }
  },

  /**
   * Calcular estatísticas do orçamento
   */
  calculateStats(budget: Budget, currentDay: number) {
    const totalSpent = budget.dailyExpenses.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );
    
    const daysInMonth = new Date(
      parseInt(budget.monthYear.split('-')[0]),
      parseInt(budget.monthYear.split('-')[1]),
      0
    ).getDate();

    const idealDailyAverage = budget.monthlyBudget / daysInMonth;
    const actualDailyAverage = currentDay > 0 ? totalSpent / currentDay : 0;
    const isOverBudget = actualDailyAverage > idealDailyAverage && budget.monthlyBudget > 0;

    return {
      totalSpent,
      daysInMonth,
      idealDailyAverage,
      actualDailyAverage,
      isOverBudget,
      remainingBudget: budget.monthlyBudget - totalSpent,
      percentageUsed: budget.monthlyBudget > 0 
        ? (totalSpent / budget.monthlyBudget) * 100 
        : 0,
    };
  },
};

export default budgetServices;
