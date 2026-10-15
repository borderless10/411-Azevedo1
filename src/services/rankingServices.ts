/**
 * Serviço para calcular ranking baseado em pontos da planilha de consumo moderado
 */
import {
  query,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  getBudgetsCollection,
  convertBudgetFromFirestore,
  getDocData,
  getAppConfigDoc,
  getRankingSnapshotsCollection,
  getRankingSnapshotDoc,
} from "../lib/firestore";
import { userService, userParticipatesInRanking } from "./userServices";
import rankingPlanilhaService from "./rankingPlanilhaService";
import { getCoupleDisplayName, isCoupleAccount } from "../utils/coupleAccount";
import { formatDateToString } from "../utils/dateUtils";
import { User } from "../types/auth";

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
  displayName: string;
  nickname?: string | null;
  isCouple: boolean;
  /** @deprecated use rankingPoints */
  zeroDays?: number;
};

const displayNameFor = (user: User): string =>
  isCoupleAccount(user)
    ? getCoupleDisplayName(user)
    : user.nickname || user.username || user.name || user.email || user.id;

const snapshotFromUser = (
  user: User,
  rankingPoints: number,
): RankingEntry => ({
  userId: user.id,
  rankingPoints,
  displayName: displayNameFor(user),
  nickname: user.nickname ?? null,
  isCouple: isCoupleAccount(user),
  zeroDays: rankingPoints,
});

const entryFromSnapshot = (id: string, data: Record<string, unknown>): RankingEntry => {
  const rankingPoints = Number(data.rankingPoints) || 0;
  return {
    userId: id,
    rankingPoints,
    displayName: String(data.displayName || id),
    nickname: typeof data.nickname === "string" ? data.nickname : null,
    isCouple: data.isCouple === true,
    zeroDays: rankingPoints,
  };
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
    await this.zeroSnapshots();
  },

  async refreshUserSnapshot(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const [user, config, { budgetServices }] = await Promise.all([
        userService.getUserById(userId),
        this.getRankingConfig(),
        import("./budgetServices"),
      ]);
      const ref = getRankingSnapshotDoc(userId);
      if (!user || !userParticipatesInRanking(user)) {
        const existing = await getDoc(ref);
        if (existing.exists()) await deleteDoc(ref);
        return;
      }
      const budgets = await budgetServices.getAllBudgets(userId);
      const rankingPoints = rankingPlanilhaService.getTotalPointsFromBudgets(
        budgets,
        config.cutoffDateKey,
      );
      const entry = snapshotFromUser(user, rankingPoints);
      await setDoc(ref, {
        userId: entry.userId,
        rankingPoints: entry.rankingPoints,
        league: entry.isCouple ? "couple" : "individual",
        displayName: entry.displayName,
        nickname: entry.nickname || "",
        isCouple: entry.isCouple,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("❌ [RANKING SERVICE] Erro ao gravar resumo:", error);
    }
  },

  /**
   * Ranking: lê os resumos. Se ainda não existirem, calcula uma vez e grava.
   */
  async getRanking(
    topN: number = 20,
    league: RankingLeague = "individual",
  ): Promise<RankingEntry[]> {
    try {
      const listed = await this.listSnapshots(topN, league);
      if (listed) return listed;
      const built = await this.buildRankingFromCollections();
      if (built.length === 0) return [];
      await this.writeSnapshots(built);
      return built
        .filter((entry) =>
          league === "couple" ? entry.isCouple : !entry.isCouple,
        )
        .slice(0, topN);
    } catch (error) {
      console.error("❌ [RANKING SERVICE] Erro ao calcular ranking:", error);
      return [];
    }
  },

  async listSnapshots(
    topN: number,
    league: RankingLeague,
  ): Promise<RankingEntry[] | null> {
    try {
      const collectionRef = getRankingSnapshotsCollection();
      const probe = await getDocs(query(collectionRef, limit(1)));
      if (probe.empty) return null;
      const snapshot = await getDocs(
        query(
          collectionRef,
          where("league", "==", league),
          orderBy("rankingPoints", "desc"),
          limit(topN),
        ),
      );
      return snapshot.docs.map((docSnap) =>
        entryFromSnapshot(docSnap.id, docSnap.data() as Record<string, unknown>),
      );
    } catch (error) {
      const code = String((error as { code?: string })?.code || "");
      if (
        code.includes("failed-precondition") ||
        code.includes("permission-denied")
      ) {
        return null;
      }
      throw error;
    }
  },

  async buildRankingFromCollections(): Promise<RankingEntry[]> {
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
      const budget = convertBudgetFromFirestore(getDocData(docSnap));
      const uid = budget.userId;
      if (!budgetsByUser[uid]) budgetsByUser[uid] = [];
      budgetsByUser[uid].push(budget);
    });

    return allUsers
      .filter(userParticipatesInRanking)
      .map((user) =>
        snapshotFromUser(
          user,
          rankingPlanilhaService.getTotalPointsFromBudgets(
            budgetsByUser[user.id] || [],
            config.cutoffDateKey,
          ),
        ),
      )
      .sort((a, b) => b.rankingPoints - a.rankingPoints);
  },

  async writeSnapshots(entries: RankingEntry[]): Promise<void> {
    const chunkSize = 400;
    for (let index = 0; index < entries.length; index += chunkSize) {
      const batch = writeBatch(db);
      entries.slice(index, index + chunkSize).forEach((entry) => {
        batch.set(getRankingSnapshotDoc(entry.userId), {
          userId: entry.userId,
          rankingPoints: entry.rankingPoints,
          league: entry.isCouple ? "couple" : "individual",
          displayName: entry.displayName,
          nickname: entry.nickname || "",
          isCouple: entry.isCouple,
          updatedAt: serverTimestamp(),
        });
      });
      try {
        await batch.commit();
      } catch (error) {
        console.error("❌ [RANKING SERVICE] Erro ao gravar resumos:", error);
      }
    }
  },

  async zeroSnapshots(): Promise<void> {
    const snapshot = await getDocs(getRankingSnapshotsCollection());
    const chunkSize = 400;
    for (let index = 0; index < snapshot.docs.length; index += chunkSize) {
      const batch = writeBatch(db);
      snapshot.docs.slice(index, index + chunkSize).forEach((docSnap) => {
        batch.set(
          docSnap.ref,
          { rankingPoints: 0, updatedAt: serverTimestamp() },
          { merge: true },
        );
      });
      await batch.commit();
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
