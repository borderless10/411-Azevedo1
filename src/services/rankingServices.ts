/**
 * Serviço para calcular ranking baseado em pontos da planilha de consumo moderado
 */
import { query, getDocs } from "firebase/firestore";
import {
  getBudgetsCollection,
  convertBudgetFromFirestore,
  getDocData,
} from "../lib/firestore";
import { userService, userParticipatesInRanking } from "./userServices";
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
   * Ranking: todos os clientes com preferência "participar", ordenados por pontos
   * do trimestre civil. Quem ainda não pontuou aparece com 0 pts (final da lista).
   */
  async getRanking(topN: number = 20): Promise<RankingEntry[]> {
    try {
      const [allUsers, snapshot] = await Promise.all([
        userService.getAllUsers(),
        getDocs(query(getBudgetsCollection())),
      ]);

      const budgetsByUser: Record<
        string,
        ReturnType<typeof convertBudgetFromFirestore>[]
      > = {};

      snapshot.docs.forEach((docSnap) => {
        const data: any = getDocData(docSnap);
        const budget = convertBudgetFromFirestore(data);
        const uid = budget.userId;
        if (!budgetsByUser[uid]) {
          budgetsByUser[uid] = [];
        }
        budgetsByUser[uid].push(budget);
      });

      const pointsByUser = new Map<string, number>();
      Object.entries(budgetsByUser).forEach(([userId, budgets]) => {
        pointsByUser.set(
          userId,
          rankingPlanilhaService.getTotalPointsFromBudgets(budgets),
        );
      });

      const arr: RankingEntry[] = allUsers
        .filter(userParticipatesInRanking)
        .map((user) => {
          const rankingPoints = pointsByUser.get(user.id) ?? 0;
          return {
            userId: user.id,
            rankingPoints,
            zeroDays: rankingPoints,
          };
        });

      arr.sort((a, b) => b.rankingPoints - a.rankingPoints);

      return arr.slice(0, topN);
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
