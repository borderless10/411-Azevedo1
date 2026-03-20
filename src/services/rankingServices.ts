/**
 * Serviço para calcular ranking baseado em dias com "zero na planilha"
 */
import { query, getDocs } from "firebase/firestore";
import {
  getBudgetsCollection,
  convertBudgetFromFirestore,
  getDocData,
} from "../lib/firestore";

/**
 * Entrada do ranking
 */
export type RankingEntry = {
  userId: string;
  zeroDays: number;
};

export const rankingServices = {
  /**
   * Calcular ranking agregando zeroConfirmedDays por userId
   */
  async getRanking(topN: number = 20): Promise<RankingEntry[]> {
    try {
      const q = query(getBudgetsCollection());
      const snapshot = await getDocs(q);

      const counts: Record<string, number> = {};

      snapshot.docs.forEach((doc) => {
        const data: any = getDocData(doc);
        const budget = convertBudgetFromFirestore(data);
        const uid = budget.userId;
        const zeros = Array.isArray(budget.zeroConfirmedDays)
          ? budget.zeroConfirmedDays.length
          : 0;
        counts[uid] = (counts[uid] || 0) + zeros;
      });

      const arr: RankingEntry[] = Object.entries(counts).map(
        ([userId, zeroDays]) => ({ userId, zeroDays }),
      );

      arr.sort((a, b) => b.zeroDays - a.zeroDays);

      return arr.slice(0, topN);
    } catch (error) {
      console.error("❌ [RANKING SERVICE] Erro ao calcular ranking:", error);
      return [];
    }
  },

  async getUserPosition(
    userId: string,
  ): Promise<{ position: number; zeroDays: number } | null> {
    try {
      const ranking = await this.getRanking(1000);
      const idx = ranking.findIndex((r) => r.userId === userId);
      if (idx === -1) return null;
      return { position: idx + 1, zeroDays: ranking[idx].zeroDays };
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
