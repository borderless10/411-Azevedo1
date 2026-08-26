/**
 * Serviço para calcular ranking baseado em pontos da planilha de consumo moderado
 */
import { query, getDocs, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  getBudgetsCollection,
  convertBudgetFromFirestore,
  getDocData,
  getAppConfigDoc,
} from "../lib/firestore";
import { userService, userParticipatesInRanking } from "./userServices";
import rankingPlanilhaService from "./rankingPlanilhaService";
import { isCoupleAccount } from "../utils/coupleAccount";
import { formatDateToString } from "../utils/dateUtils";

const RANKING_CONFIG_ID = "ranking";

export type RankingConfig = {
  cutoffDateKey: string | null;
  resetAt?: Date | null;
};

/**
 * Entrada do ranking
 */
export type RankingEntry = {
  userId: string;
  rankingPoints: number;
  /** @deprecated use rankingPoints */
  zeroDays?: number;
};

export type RankingLeague = "individual" | "couple";

export const rankingServices = {
  async getRankingConfig(): Promise<RankingConfig> {
    try {
      const snap = await getDoc(getAppConfigDoc(RANKING_CONFIG_ID));
      if (!snap.exists()) {
        return { cutoffDateKey: null, resetAt: null };
      }
      const data: any = snap.data();
      return {
        cutoffDateKey:
          typeof data.cutoffDateKey === "string" && data.cutoffDateKey
            ? data.cutoffDateKey
            : null,
        resetAt: data.resetAt?.toDate?.() ?? null,
      };
    } catch (error) {
      console.error("❌ [RANKING SERVICE] Erro ao ler config do ranking:", error);
      return { cutoffDateKey: null, resetAt: null };
    }
  },

  /**
   * Zera o ranking para todos: só pontos de dias posteriores à data do reset entram.
   */
  async resetRanking(adminUserId: string): Promise<void> {
    const cutoffDateKey = formatDateToString(new Date());
    await setDoc(getAppConfigDoc(RANKING_CONFIG_ID), {
      cutoffDateKey,
      resetAt: serverTimestamp(),
      resetBy: adminUserId,
    });
  },

  /**
   * Ranking: clientes com preferência "participar", ordenados por pontos
   * do ciclo atual (até o admin resetar). Casais e contas individuais em ligas separadas.
   */
  async getRanking(
    topN: number = 20,
    league: RankingLeague = "individual",
  ): Promise<RankingEntry[]> {
    try {
      const [allUsers, snapshot, config] = await Promise.all([
        userService.getAllUsers(),
        getDocs(query(getBudgetsCollection())),
        this.getRankingConfig(),
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
          rankingPlanilhaService.getTotalPointsFromBudgets(
            budgets,
            config.cutoffDateKey,
          ),
        );
      });

      const arr: RankingEntry[] = allUsers
        .filter(userParticipatesInRanking)
        .filter((user) =>
          league === "couple" ? isCoupleAccount(user) : !isCoupleAccount(user),
        )
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
    league: RankingLeague = "individual",
  ): Promise<{ position: number; rankingPoints: number } | null> {
    try {
      const ranking = await this.getRanking(1000, league);
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
