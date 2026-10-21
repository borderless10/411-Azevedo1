import { useEffect, useMemo, useState } from "react";
import { rankingGamificationService } from "../services/rankingGamificationService";
import type {
  BadgeDefinition,
  RankingSeason,
  UserBadgeGrant,
} from "../types/rankingGamification";

export const useRankingGamification = (enabled = true) => {
  const [seasons, setSeasons] = useState<RankingSeason[]>([]);
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [grants, setGrants] = useState<UserBadgeGrant[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let settled = 0;
    const done = () => {
      settled += 1;
      if (settled >= 3) setLoading(false);
    };
    const onError = (err: Error) => {
      setError(err.message || "Erro ao carregar conquistas");
      done();
    };
    const unsubs = [
      rankingGamificationService.subscribeSeasons((data) => {
        setSeasons(data);
        done();
      }, onError),
      rankingGamificationService.subscribeBadgeDefinitions((data) => {
        setDefinitions(data);
        done();
      }, onError),
      rankingGamificationService.subscribeActiveGrants((data) => {
        setGrants(data);
        done();
      }, onError),
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, [enabled]);

  const grantsByUser = useMemo(() => {
    const map = new Map<string, UserBadgeGrant[]>();
    grants.forEach((grant) => {
      const list = map.get(grant.userId) || [];
      list.push(grant);
      map.set(grant.userId, list);
    });
    return map;
  }, [grants]);

  const definitionsById = useMemo(() => {
    const map = new Map<string, BadgeDefinition>();
    definitions.forEach((definition) => map.set(definition.id, definition));
    return map;
  }, [definitions]);

  const badgesByUser = useMemo(() => {
    const map = new Map<string, BadgeDefinition[]>();
    grants.forEach((grant) => {
      const definition = definitionsById.get(grant.badgeId);
      if (!definition) return;
      const list = map.get(grant.userId) || [];
      list.push(definition);
      map.set(grant.userId, list);
    });
    return map;
  }, [grants, definitionsById]);

  return {
    seasons,
    latestSeason: seasons[0] || null,
    definitions,
    definitionsById,
    grants,
    grantsByUser,
    badgesByUser,
    loading,
    error,
  };
};
