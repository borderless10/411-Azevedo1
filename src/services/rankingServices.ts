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
import { auth, db } from "../lib/firebase";
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
import { resolveRankingPosition } from "../utils/rankingPosition";

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
  photoUrl?: string | null;
  photoUpdatedAt?: number | null;
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
  photoUrl: user.photoUrl || null,
  photoUpdatedAt: user.photoUpdatedAt || null,
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
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : null,
    photoUpdatedAt:
      typeof data.photoUpdatedAt === "number" ? data.photoUpdatedAt : null,
    zeroDays: rankingPoints,
  };
};

export type RankingLeague = "individual" | "couple";

let expectedParticipantsCache: {
  at: number;
  individual: number;
  couple: number;
} | null = null;

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
  async resetRanking(_adminUserId?: string): Promise<{ seasonNumber: number }> {
    // Reset oficial é transacional no servidor: grava o pódio histórico
    // (Individual e Casais) antes de zerar. Sem fallback local inseguro.
    const { rankingGamificationService } = await import(
      "./rankingGamificationService"
    );
    return rankingGamificationService.closeRankingSeason();
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
        photoUrl: entry.photoUrl || "",
        photoUpdatedAt: entry.photoUpdatedAt || null,
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
      if (listed !== null) {
        const expected = await this.countExpectedParticipants(league);
        if (listed.length >= expected) return listed;
        // Resumo incompleto: algum participante ainda não tem snapshot.
        // Reconstrói uma vez e grava todos, senão ele nunca aparece na lista.
      }
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

  async countExpectedParticipants(league: RankingLeague): Promise<number> {
    // Cache curto: sem ele, cada abertura/troca de liga relê todos os usuários.
    const now = Date.now();
    if (
      !expectedParticipantsCache ||
      now - expectedParticipantsCache.at > 60_000
    ) {
      const allUsers = await userService.getAllUsersLite();
      const participants = allUsers.filter(userParticipatesInRanking);
      expectedParticipantsCache = {
        at: now,
        individual: participants.filter((u) => !isCoupleAccount(u)).length,
        couple: participants.filter((u) => isCoupleAccount(u)).length,
      };
    }
    return league === "couple"
      ? expectedParticipantsCache.couple
      : expectedParticipantsCache.individual;
  },

  async listSnapshots(
    topN: number,
    league: RankingLeague,
  ): Promise<RankingEntry[] | null> {
    try {
      const collectionRef = getRankingSnapshotsCollection();
      const probe = await getDocs(query(collectionRef, limit(1)));
      if (probe.empty) return [];
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
        return [];
      }
      throw error;
    }
  },

  async buildRankingFromCollections(): Promise<RankingEntry[]> {
    const [allUsers, snapshot, config] = await Promise.all([
      userService.getAllUsersLite(),
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
    // As regras só permitem gravar o resumo do próprio usuário (admin e
    // supervisor gravam todos pela tela de reset, não por aqui). Gravar o
    // lote inteiro a partir de um cliente comum estoura permission-denied.
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;
    const writable = entries.filter((entry) => entry.userId === currentUid);
    const chunkSize = 400;
    for (let index = 0; index < writable.length; index += chunkSize) {
      const batch = writeBatch(db);
      writable.slice(index, index + chunkSize).forEach((entry) => {
        batch.set(getRankingSnapshotDoc(entry.userId), {
          userId: entry.userId,
          rankingPoints: entry.rankingPoints,
          league: entry.isCouple ? "couple" : "individual",
          displayName: entry.displayName,
          nickname: entry.nickname || "",
          isCouple: entry.isCouple,
          photoUrl: entry.photoUrl || "",
          photoUpdatedAt: entry.photoUpdatedAt || null,
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

  /**
   * Posição do próprio usuário: lê o snapshot dele e os resumos da mesma
   * liga, ordenando em memória. A consulta usa só igualdade em `league`
   * (índice simples) porque misturar liga, pontos e id do documento numa
   * contagem exigia um índice composto inexistente no Firestore.
   * A liga tem poucos resumos, então ordenar aqui é barato e segue o mesmo
   * critério da tela de Ranking: pontos em ordem decrescente e, no empate,
   * id do documento em ordem crescente (ordem implícita do Firestore).
   * Sem snapshot, o usuário não está no ranking: retorna null.
   */
  async getOwnRankingPosition(userId: string): Promise<number | null> {
    if (!userId) return null;
    try {
      const snap = await getDoc(getRankingSnapshotDoc(userId));
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      const league: RankingLeague =
        data.league === "couple" || data.isCouple === true
          ? "couple"
          : "individual";
      const leagueSnap = await getDocs(
        query(getRankingSnapshotsCollection(), where("league", "==", league)),
      );
      const orderedIds = leagueSnap.docs
        .map((docSnap) =>
          entryFromSnapshot(
            docSnap.id,
            docSnap.data() as Record<string, unknown>,
          ),
        )
        .sort(
          (a, b) =>
            b.rankingPoints - a.rankingPoints ||
            (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
        )
        .map((entry) => entry.userId);
      return resolveRankingPosition(orderedIds, userId);
    } catch (error) {
      // Posição no troféu é só visual: falha aqui não pode virar erro
      // vermelho no console nem quebrar a sidebar.
      console.warn("⚠️ [RANKING SERVICE] Posição própria indisponível:", error);
      return null;
    }
  },

  async getUserPosition(
    userId: string,
    league: RankingLeague = "individual",
  ): Promise<{ position: number; rankingPoints: number } | null> {
    try {
      const ranking = await this.getRanking(100, league);
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
