/**
 * Serviço para calcular ranking baseado em pontos da planilha de consumo moderado
 */
import { query, getDocs } from "firebase/firestore";
import {
  getBudgetsCollection,
  convertBudgetFromFirestore,
  getDocData,
} from "../lib/firestore";
import { userService } from "./userServices";
import rankingPlanilhaService from "./rankingPlanilhaService";

/**
 * Entrada do ranking
 */
export type RankingEntry = {
  userId: string;
  rankingPoints: number;
  /** @deprecated use rankingPoints */
  zeroDays?: number;
};

export const rankingServices = {
  /**
   * Calcular ranking somando pontos da planilha
   */
  async getRanking(topN: number = 20): Promise<RankingEntry[]> {
    try {
      const q = query(getBudgetsCollection());
      const snapshot = await getDocs(q);

      const budgetsByUser: Record<string, ReturnType<typeof convertBudgetFromFirestore>[]> = {};

      snapshot.docs.forEach((doc) => {
        const data: any = getDocData(doc);
        const budget = convertBudgetFromFirestore(data);
        const uid = budget.userId;
        if (!budgetsByUser[uid]) {
          budgetsByUser[uid] = [];
        }
        budgetsByUser[uid].push(budget);
      });

      const arr: RankingEntry[] = Object.entries(budgetsByUser).map(
        ([userId, budgets]) => ({
          userId,
          rankingPoints: rankingPlanilhaService.getTotalPointsFromBudgets(budgets),
          zeroDays: rankingPlanilhaService.getTotalPointsFromBudgets(budgets),
        }),
      );

      const filtered: RankingEntry[] = [];
      for (const entry of arr) {
        if (entry.rankingPoints <= 0) continue;
        try {
          const user = await userService.getUserById(entry.userId);
          if (user?.rankingPreference === "participate") {
            filtered.push(entry);
          }
        } catch (error) {
          console.error(
            `❌ [RANKING SERVICE] Erro ao validar usuário ${entry.userId}:`,
            error,
          );
        }
      }

      filtered.sort((a, b) => b.rankingPoints - a.rankingPoints);

      return filtered.slice(0, topN);
    } catch (error) {
      console.error("❌ [RANKING SERVICE] Erro ao calcular ranking:", error);
      return [];
    }
  },

  async getUserPosition(
    userId: string,
  ): Promise<{ position: number; rankingPoints: number } | null> {
    try {
      const ranking = await this.getRanking(1000);
      const idx = ranking.findIndex((r) => r.userId === userId);
      if (idx === -1) return null;
      return {
        position: idx + 1,
        rankingPoints: ranking[idx].rankingPoints,
      };
    } catch (error) {
      console.error(
        "❌ [RANKING SERVICE] Erro ao buscar posição do usuário:",
        error,
      );
      return null;
    }
  },
};

export default rankingServices;
