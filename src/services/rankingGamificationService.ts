import {
  onSnapshot,
  orderBy,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../lib/firebase";
import {
  getBadgeDefinitionsCollection,
  getRankingSeasonsCollection,
  getUserBadgeGrantsCollection,
} from "../lib/firestore";
import type {
  BadgeDefinition,
  BadgeDefinitionInput,
  RankingSeason,
  UserBadgeGrant,
} from "../types/rankingGamification";

const functions = getFunctions(app, "southamerica-east1");

const call = <Req, Res>(name: string) =>
  httpsCallable<Req, Res>(functions, name);

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return null;
};

const mapSeason = (id: string, data: any): RankingSeason => ({
  seasonNumber: Number(data.seasonNumber) || Number(id) || 0,
  previousCutoffDateKey: data.previousCutoffDateKey || null,
  cutoffDateKey: String(data.cutoffDateKey || ""),
  endedAt: toDate(data.endedAt),
  resetBy: String(data.resetBy || ""),
  podiums: {
    individual: Array.isArray(data.podiums?.individual)
      ? data.podiums.individual
      : [],
    couple: Array.isArray(data.podiums?.couple) ? data.podiums.couple : [],
  },
});

const mapDefinition = (id: string, data: any): BadgeDefinition => ({
  id,
  name: String(data.name || id),
  meaning: String(data.meaning || ""),
  description: String(data.description || ""),
  icon: data.icon,
  primaryColor: String(data.primaryColor || "#B900FF"),
  secondaryColor: String(data.secondaryColor || "#c0c6d4"),
  borderPreset: data.borderPreset,
  isOfficial: data.isOfficial === true,
  isActive: data.isActive !== false,
  createdBy: data.createdBy || null,
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

const mapGrant = (id: string, data: any): UserBadgeGrant => ({
  id,
  userId: String(data.userId || ""),
  badgeId: String(data.badgeId || ""),
  status: data.status === "revoked" ? "revoked" : "active",
  grantedBy: String(data.grantedBy || ""),
  grantedAt: toDate(data.grantedAt),
  revokedBy: data.revokedBy || null,
  revokedAt: toDate(data.revokedAt),
});

export const rankingGamificationService = {
  async closeRankingSeason(): Promise<{ seasonNumber: number }> {
    const result = await call<
      Record<string, never>,
      { seasonNumber: number }
    >("closeRankingSeason")({});
    return result.data;
  },

  async purgeRankingHistory(input: {
    seasonNumbers?: number[];
    deleteAll?: boolean;
    wipeCurrent?: boolean;
  }): Promise<{
    deletedSeasonNumbers: number[];
    deletedLabels: string[];
    wipeCurrent: boolean;
    seasonCounter: number;
  }> {
    const result = await call<
      {
        seasonNumbers?: number[];
        deleteAll?: boolean;
        wipeCurrent?: boolean;
      },
      {
        deletedSeasonNumbers: number[];
        deletedLabels: string[];
        wipeCurrent: boolean;
        seasonCounter: number;
      }
    >("purgeRankingHistory")(input);
    return result.data;
  },

  async upsertBadgeDefinition(definition: BadgeDefinitionInput): Promise<void> {
    await call("upsertBadgeDefinition")({ definition });
  },

  async setBadgeDefinitionActive(badgeId: string, isActive: boolean): Promise<void> {
    await call("setBadgeDefinitionActive")({ badgeId, isActive });
  },

  async deleteBadgeDefinition(
    badgeId: string,
  ): Promise<{ archived: boolean; deleted: boolean }> {
    const result = await call<
      { badgeId: string },
      { archived: boolean; deleted: boolean }
    >("deleteBadgeDefinition")({ badgeId });
    return result.data;
  },

  async grantBadge(userId: string, badgeId: string): Promise<void> {
    await call("grantBadge")({ userId, badgeId });
  },

  async revokeBadge(userId: string, badgeId: string): Promise<void> {
    await call("revokeBadge")({ userId, badgeId });
  },

  async selectBadgeBorder(badgeId: string | null): Promise<void> {
    await call("selectBadgeBorder")({ badgeId });
  },

  subscribeSeasons(
    onData: (seasons: RankingSeason[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(getRankingSeasonsCollection(), orderBy("endedAt", "desc")),
      (snap) =>
        onData(
          snap.docs
            .map((docSnap) => mapSeason(docSnap.id, docSnap.data()))
            .filter((season) => season.seasonNumber > 0),
        ),
      (error) => onError(error as Error),
    );
  },

  subscribeBadgeDefinitions(
    onData: (definitions: BadgeDefinition[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      getBadgeDefinitionsCollection(),
      (snap) =>
        onData(
          snap.docs
            .map((docSnap) => mapDefinition(docSnap.id, docSnap.data()))
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        ),
      (error) => onError(error as Error),
    );
  },

  subscribeActiveGrants(
    onData: (grants: UserBadgeGrant[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(getUserBadgeGrantsCollection(), where("status", "==", "active")),
      (snap) => onData(snap.docs.map((docSnap) => mapGrant(docSnap.id, docSnap.data()))),
      (error) => onError(error as Error),
    );
  },

  subscribeUserGrants(
    userId: string,
    onData: (grants: UserBadgeGrant[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(
        getUserBadgeGrantsCollection(),
        where("userId", "==", userId),
        where("status", "==", "active"),
      ),
      (snap) => onData(snap.docs.map((docSnap) => mapGrant(docSnap.id, docSnap.data()))),
      (error) => onError(error as Error),
    );
  },
};