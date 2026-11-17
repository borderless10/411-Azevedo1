import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Modal,
  Platform,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Layout } from "../../components/Layout/Layout";
import { rankingServices, RankingEntry, RankingLeague } from "../../services/rankingServices";
import { userService } from "../../services/userServices";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { RankingPreference } from "../../types/auth";
import { resolveProfilePhotoUri } from "../../utils/chatDisplayNames";
import { isCoupleAccount } from "../../utils/coupleAccount";
import { useRankingGamification } from "../../hooks/useRankingGamification";
import { buildCrownByUser } from "../../utils/crowns";
import { BadgedAvatar } from "../../components/Gamification/BadgedAvatar";
import { BadgeDetailModal } from "../../components/Gamification/BadgeEmblem";
import { PodiumView } from "../../components/Gamification/PodiumView";
import { PhotoPreviewModal } from "../../components/Gamification/PhotoPreviewModal";
import type { BadgeDefinition } from "../../types/rankingGamification";
import {
  acceptRankingCache,
  prepareRankingCache,
  rankingCacheKey,
  rankingRowsChanged,
} from "../../utils/rankingCache";
import { rankingListConfig } from "../../utils/rankingListConfig";
import {
  resolveAvatarBadgeDefinition,
  resolveAvatarRingDefinition,
} from "../../utils/badgeRules";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import { rankingSeasonPeriodLabel } from "../../utils/rankingSeasonLabel";

type Row = {
  position: number;
  userId: string;
  displayName: string;
  zeroDays: number;
  photoBase64?: string | null;
  photoUrl?: string | null;
  nickname?: string | null;
  role?: string | null;
  isCouple?: boolean;
};

export const RankingScreen = () => {
  const { user, refreshUser } = useAuth();
  const { navigate } = useNavigation();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [selectedPreference, setSelectedPreference] =
    useState<RankingPreference | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [leagueTab, setLeagueTab] = useState<RankingLeague>("individual");
  const leagueTabInitialized = useRef(false);
  const [resetting, setResetting] = useState(false);
  const [purging, setPurging] = useState(false);
  const [selectedPurgeSeasons, setSelectedPurgeSeasons] = useState<number[]>(
    [],
  );
  const [wipeCurrentOnPurge, setWipeCurrentOnPurge] = useState(false);
  const [staleNotice, setStaleNotice] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [cutoffDateKey, setCutoffDateKey] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<"current" | "previous" | "history">(
    "current",
  );
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(
    null,
  );
  const [photoPreview, setPhotoPreview] = useState<{
    uri: string;
    name: string;
    userId: string;
  } | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<number | null>(null);
  const [borderByUser, setBorderByUser] = useState<Map<string, string | null>>(
    new Map(),
  );
  const borderLoadingRef = useRef<Set<string>>(new Set());
  const touchStartXRef = useRef<number | null>(null);
  const holdersBeam = useRef(new Animated.Value(0)).current;
  const [holdersSize, setHoldersSize] = useState({ width: 0, height: 0 });

  // Feixe de luz percorrendo a borda do botão de detentores, em ciclo
  // contínuo. JS driver porque anima a propriedade do traço do SVG.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(holdersBeam, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [holdersBeam]);

  const holdersPerimeter = 2 * (holdersSize.width + holdersSize.height);
  const holdersBeamLength = Math.max(28, holdersPerimeter * 0.22);
  const holdersBeamOffset = holdersBeam.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.max(holdersPerimeter, 1)],
  });
  const gamification = useRankingGamification();
  // Coroas: pódio da última temporada encerrada, até o próximo reset.
  const crownByUser = useMemo(
    () => buildCrownByUser(gamification.seasons),
    [gamification.seasons],
  );
  const leagueRowsCacheRef = useRef<
    Partial<Record<RankingLeague, { rows: Row[]; cutoff: string | null }>>
  >({});
  const photoCacheRef = useRef<Map<string, string | null>>(new Map());
  const lastReloadKeyRef = useRef(reloadKey);

  const isAdminUser = user?.isAdmin === true || user?.role === "admin";
  const canPurgeRankingHistory = isAdminUser && Platform.OS === "web";
  const isCommonUser =
    !user?.isAdmin &&
    user?.role !== "consultor" &&
    user?.role !== "supervisor" &&
    user?.role !== "admin";
  const activeLeague: RankingLeague = leagueTab;
  const listConfig = rankingListConfig(Platform.OS, rows.length);

  const getEffectiveRankingPreference = (): RankingPreference => {
    if (!user) return "unset";

    if (
      user.rankingPreference === "participate" ||
      user.rankingPreference === "view_only" ||
      user.rankingPreference === "hidden" ||
      user.rankingPreference === "unset"
    ) {
      return user.rankingPreference;
    }

    if (user.showInRanking === true) return "participate";
    if (user.showInRanking === false) return "view_only";
    return "unset";
  };

  const rankingPreference = getEffectiveRankingPreference();
  const showLeagueTabs =
    !isCommonUser ||
    rankingPreference === "participate" ||
    rankingPreference === "view_only";

  useEffect(() => {
    if (!user?.id || leagueTabInitialized.current) return;
    setLeagueTab(isCoupleAccount(user) ? "couple" : "individual");
    leagueTabInitialized.current = true;
  }, [user?.id, user?.accountType]);

  useEffect(() => {
    setSelectedPreference(
      rankingPreference === "unset" ? null : rankingPreference,
    );
  }, [rankingPreference]);

  useEffect(() => {
    if (!isCommonUser) {
      setShowPreferenceModal(false);
      return;
    }

    if (rankingPreference === "hidden") {
      setShowPreferenceModal(false);
      navigate("Home");
      return;
    }

    setShowPreferenceModal(rankingPreference === "unset");
  }, [isCommonUser, rankingPreference, navigate]);

  useEffect(() => {
    if (
      isCommonUser &&
      (rankingPreference === "unset" || rankingPreference === "hidden")
    ) {
      setRows([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      if (lastReloadKeyRef.current !== reloadKey) {
        leagueRowsCacheRef.current = {};
        lastReloadKeyRef.current = reloadKey;
        await AsyncStorage.multiRemove([
          rankingCacheKey("individual"),
          rankingCacheKey("couple"),
        ]).catch(() => undefined);
      }
      const memory = leagueRowsCacheRef.current[activeLeague];
      if (memory) {
        setCutoffDateKey(memory.cutoff);
        setRows(memory.rows);
        setLoading(false);
      } else {
        setLoading(true);
      }
      const storedPromise = AsyncStorage.getItem(rankingCacheKey(activeLeague))
        .then((raw) =>
          acceptRankingCache<Row>(raw ? JSON.parse(raw) : null, activeLeague),
        )
        .catch(() => null);
      const networkPromise = Promise.all([
        rankingServices.getRanking(500, activeLeague),
        rankingServices.getRankingConfig(),
      ]);
      const stored = await storedPromise;
      if (mounted && stored && !memory) {
        setRows(stored.rows);
        setCutoffDateKey(stored.cutoffDateKey);
        setLoading(false);
      }
      try {
        const [ranking, config] = await networkPromise;
        if (!mounted) return;
        setCutoffDateKey(config.cutoffDateKey);
        const out: Row[] = ranking.map((r: RankingEntry, i) => ({
          position: i + 1,
          userId: r.userId,
          displayName: r.displayName || r.userId,
          zeroDays: r.rankingPoints,
          nickname: r.nickname ?? null,
          isCouple: r.isCouple,
          photoUrl: r.photoUrl ?? photoCacheRef.current.get(r.userId) ?? null,
        }));
        setStaleNotice(false);
        setRows((current) => (rankingRowsChanged(current, out) ? out : current));
        leagueRowsCacheRef.current[activeLeague] = {
          rows: out,
          cutoff: config.cutoffDateKey,
        };
        await AsyncStorage.setItem(
          rankingCacheKey(activeLeague),
          JSON.stringify(
            prepareRankingCache(activeLeague, config.cutoffDateKey, out),
          ),
        ).catch(() => undefined);

        const missingPhoto = out
          .slice(0, 12)
          .filter((row) => !row.photoUrl && !photoCacheRef.current.has(row.userId));
        if (missingPhoto.length === 0) return;
        const withPhotos = await Promise.all(
          missingPhoto.map(async (row) => {
            try {
              // Documento completo de propósito: o perfil leve descarta
              // photoBase64, e é ele que guarda a foto de quem ainda não
              // tem photoUrl do Storage. Sem isso a foto salva não
              // aparece para os outros no Ranking.
              const profile = await userService.getUserById(row.userId);
              return {
                userId: row.userId,
                photoUrl: resolveProfilePhotoUri(profile),
              };
            } catch {
              return { userId: row.userId, photoUrl: null };
            }
          }),
        );
        if (!mounted) return;
        withPhotos.forEach((item) =>
          photoCacheRef.current.set(item.userId, item.photoUrl),
        );
        const photos = new Map(
          withPhotos.map((item) => [item.userId, item.photoUrl]),
        );
        setRows((current) => {
          const next = current.map((row) =>
            photos.has(row.userId)
              ? { ...row, photoUrl: photos.get(row.userId) }
              : row,
          );
          const entry = leagueRowsCacheRef.current[activeLeague];
          if (entry) entry.rows = next;
          return next;
        });
      } catch (error) {
        console.error("❌ [RANKING SCREEN] Erro ao carregar ranking:", error);
        if (mounted && (memory || stored)) setStaleNotice(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isCommonUser, rankingPreference, activeLeague, reloadKey]);

  const handleResetRanking = () => {
    if (!user?.id || !isAdminUser) return;

    Alert.alert(
      "Reiniciar ranking",
      "Os três primeiros de Individuais e de Casais serão salvos no Pódio Anterior. Depois os pontos serão zerados e os participantes voltam a pontuar a partir de amanhã.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: async () => {
            try {
              setResetting(true);
              const result = await rankingServices.resetRanking(user.id);
              setReloadKey((k) => k + 1);
              Alert.alert(
                "Ranking reiniciado",
                `A edição ${result.seasonNumber} foi encerrada e o pódio ficou salvo.`,
              );
            } catch (error) {
              console.error("❌ [RANKING SCREEN] Erro ao reiniciar ranking:", error);
              Alert.alert("Erro", "Não foi possível reiniciar o ranking.");
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  const togglePurgeSeason = (seasonNumber: number) => {
    setSelectedPurgeSeasons((current) =>
      current.includes(seasonNumber)
        ? current.filter((value) => value !== seasonNumber)
        : [...current, seasonNumber].sort((a, b) => a - b),
    );
  };

  const runPurgeRankingHistory = async (mode: "selected" | "all") => {
    if (!canPurgeRankingHistory || purging) return;
    try {
      setPurging(true);
      const result = await rankingGamificationService.purgeRankingHistory(
        mode === "all"
          ? { deleteAll: true, wipeCurrent: wipeCurrentOnPurge }
          : {
              seasonNumbers: selectedPurgeSeasons,
              wipeCurrent: wipeCurrentOnPurge,
            },
      );
      setSelectedPurgeSeasons([]);
      setReloadKey((key) => key + 1);
      const deleted =
        result.deletedLabels.length > 0
          ? result.deletedLabels.join("\n")
          : "Nenhuma edição histórica.";
      Alert.alert(
        "Histórico apagado",
        `${deleted}${
          result.wipeCurrent ? "\n\nRanking atual também foi zerado." : ""
        }\n\nInsígnias não foram alteradas.`,
      );
    } catch (error) {
      console.error("❌ [RANKING SCREEN] Erro ao apagar histórico:", error);
      Alert.alert("Erro", "Não foi possível apagar o histórico do ranking.");
    } finally {
      setPurging(false);
    }
  };

  const confirmPurgeWithRisks = (
    title: string,
    detail: string,
    confirmLabel: string,
    onConfirm: () => void,
  ) => {
    const wipeLine = wipeCurrentOnPurge
      ? "\n• Os pontos do ranking atual também serão zerados."
      : "";
    Alert.alert(
      title,
      `${detail}

Riscos:
• Ação permanente. Não tem como desfazer.
• Pódios, posições e histórico dessas edições somem do app.
• Coroas ligadas a essas edições deixam de aparecer.
• Insígnias NÃO são apagadas.${wipeLine}

Tem certeza de que deseja continuar?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmação final",
              "Última chance: isso apaga dados de ranking de forma definitiva. Confirma?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: confirmLabel,
                  style: "destructive",
                  onPress: onConfirm,
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handlePurgeSelected = () => {
    if (!canPurgeRankingHistory) return;
    if (selectedPurgeSeasons.length === 0 && !wipeCurrentOnPurge) {
      Alert.alert(
        "Nada selecionado",
        "Marque ao menos uma edição ou a opção de zerar o ranking atual.",
      );
      return;
    }
    const labels = gamification.seasons
      .filter((season) => selectedPurgeSeasons.includes(season.seasonNumber))
      .map((season) => rankingSeasonPeriodLabel(season));
    const detail =
      labels.length > 0
        ? `Você vai apagar:\n${labels.map((label) => `• ${label}`).join("\n")}`
        : "Nenhuma edição histórica marcada. Só a opção de zerar o ranking atual está ativa.";
    confirmPurgeWithRisks(
      "Tem certeza?",
      detail,
      "Sim, apagar",
      () => {
        void runPurgeRankingHistory("selected");
      },
    );
  };

  const handlePurgeAll = () => {
    if (!canPurgeRankingHistory) return;
    if (gamification.seasons.length === 0 && !wipeCurrentOnPurge) {
      Alert.alert(
        "Nada para apagar",
        "Não há edições encerradas. Marque zerar ranking atual se quiser limpar os pontos de agora.",
      );
      return;
    }
    confirmPurgeWithRisks(
      "Tem certeza?",
      "Você vai apagar TODAS as edições encerradas do ranking (pódios e histórico completo).",
      "Sim, apagar tudo",
      () => {
        void runPurgeRankingHistory("all");
      },
    );
  };

  // A borda do próprio usuário vem do auth (recarregado no Perfil após
  // salvar), sem nova consulta: mantém o mapa alinhado à escolha atual
  // em vez da leitura congelada feita na primeira carga da lista.
  useEffect(() => {
    if (!user?.id) return;
    const currentBorder = (user as any)?.activeBadgeBorderId || null;
    setBorderByUser((current) => {
      if (current.get(user.id) === currentBorder) return current;
      const next = new Map(current);
      next.set(user.id, currentBorder);
      return next;
    });
  }, [user?.id, (user as any)?.activeBadgeBorderId]);

  useEffect(() => {
    const ids = new Set<string>();
    rows.slice(0, 20).forEach((row) => ids.add(row.userId));
    gamification.seasons.slice(0, 5).forEach((season) => {
      [...season.podiums.individual, ...season.podiums.couple].forEach((entry) =>
        ids.add(entry.userId),
      );
    });
    const missing = [...ids].filter(
      (id) => !borderByUser.has(id) && !borderLoadingRef.current.has(id),
    );
    if (!missing.length) return;
    missing.forEach((id) => borderLoadingRef.current.add(id));
    let cancelled = false;
    Promise.all(
      missing.map(async (id) => {
        try {
          const profile: any = await userService.getUserLiteById(id);
          return { id, border: profile?.activeBadgeBorderId || null };
        } catch {
          return { id, border: null };
        } finally {
          borderLoadingRef.current.delete(id);
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      setBorderByUser((current) => {
        const next = new Map(current);
        results.forEach((item) => next.set(item.id, item.border));
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [rows, gamification.seasons, borderByUser]);

  // Borda ativa do usuário. Para o próprio usuário vale o auth atual,
  // que o Perfil recarrega ao salvar a borda, e não o mapa congelado.
  const activeBorderDefinitionByUser = (userId: string) => {
    const badgeId =
      userId === user?.id
        ? (user as any)?.activeBadgeBorderId || null
        : borderByUser.get(userId);
    return badgeId
      ? gamification.definitionsById.get(badgeId) || null
      : null;
  };

  // Anel: só a borda ativa. Selo: borda ativa ou primeira concedida.
  const ringDefinitionByUser = (userId: string) =>
    resolveAvatarRingDefinition(activeBorderDefinitionByUser(userId));
  const badgeDefinitionByUser = (userId: string) =>
    resolveAvatarBadgeDefinition(
      activeBorderDefinitionByUser(userId),
      gamification.badgesByUser.get(userId),
    );

  const podiumBorderMap = (entries: { userId: string }[]) => {
    const map = new Map<string, BadgeDefinition | null>();
    entries.forEach((entry) =>
      map.set(entry.userId, ringDefinitionByUser(entry.userId)),
    );
    return map;
  };

  const handleSelectRankingPreference = (preference: RankingPreference) => {
    setSelectedPreference(preference);
  };

  const handleSavePreference = async () => {
    if (!user?.id || !selectedPreference) return;

    try {
      setIsSaving(true);
      await userService.updateUserPreferences(user.id, {
        rankingPreference: selectedPreference,
      });
      await refreshUser();

      if (selectedPreference === "hidden") {
        setShowPreferenceModal(false);
        navigate("Home");
        return;
      }

      setShowPreferenceModal(false);
    } catch (error) {
      console.error("❌ [RANKING SCREEN] Erro ao salvar preferência:", error);
      Alert.alert("Erro", "Não foi possível salvar sua preferência agora.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout title="Ranking — Consumo moderado" showBackButton={false} showSidebar={true}>
      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={mainTab === "current" && !loading ? rows : []}
        keyExtractor={(item) => item.userId}
        initialNumToRender={listConfig.initialNumToRender}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={listConfig.removeClippedSubviews}
        renderItem={({ item: r }) => {
          const photoUri = resolveProfilePhotoUri(r);
          const ringDef = ringDefinitionByUser(r.userId);
          const badgeDef = badgeDefinitionByUser(r.userId);
          return (
          <View style={[styles.row, r.position <= 3 ? styles.rowTop : null]}>
            <View style={styles.posWrapper}>
              <Text style={[styles.pos, r.position <= 3 ? styles.posTop : null]}>
                {r.position}º
              </Text>
            </View>
            <View style={styles.avatarWrapper}>
              <BadgedAvatar
                photoUri={photoUri}
                displayName={r.displayName}
                size={r.position <= 3 ? 56 : 48}
                ringDefinition={ringDef}
                badgeDefinition={badgeDef}
                crownPosition={crownByUser.get(r.userId) ?? null}
                onPhotoPress={() =>
                  setPhotoPreview({
                    uri: photoUri || null,
                    name: r.displayName,
                    userId: r.userId,
                  })
                }
                onBadgePress={badgeDef ? setSelectedBadge : undefined}
              />
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, r.position <= 3 ? styles.nameTop : null]}>
                {r.displayName}
              </Text>
              <Text style={styles.detail}>
                {r.zeroDays} pts{r.isCouple ? " · Casal" : ""}
              </Text>
            </View>
          </View>
          );
        }}
        ListHeaderComponent={
        <>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Ranking — Consumo moderado</Text>
          <TouchableOpacity
            onPress={() => setShowRules((current) => !current)}
            accessibilityLabel="Ver regras do ranking"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showRules ? "information-circle" : "information-circle-outline"}
              size={26}
              color="#B900FF"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.leagueTabs}>
          {(
            [
              ["current", "Ranking Atual"],
              ["previous", "Pódio Anterior"],
              ["history", "Histórico"],
            ] as const
          ).map(([tab, label]) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.leagueTab,
                mainTab === tab && styles.leagueTabActive,
              ]}
              onPress={() => setMainTab(tab)}
            >
              <Text
                style={[
                  styles.leagueTabText,
                  mainTab === tab && styles.leagueTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View
          style={styles.holdersButtonWrap}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setHoldersSize((current) =>
              current.width === width && current.height === height
                ? current
                : { width, height },
            );
          }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver Detentores de Insígnias"
            style={styles.holdersButton}
            onPress={() => navigate("BadgeHolders")}
          >
            <Ionicons name="medal" size={14} color="#e7b958" />
            <Text style={styles.holdersButtonText} numberOfLines={1}>
              Ver Detentores de Insígnias
            </Text>
          </TouchableOpacity>
          {holdersSize.width > 0 ? (
            <View pointerEvents="none" style={styles.holdersBeamLayer}>
              <Svg
                width={holdersSize.width}
                height={holdersSize.height}
                viewBox={`0 0 ${holdersSize.width} ${holdersSize.height}`}
              >
                <AnimatedRect
                  x={1}
                  y={1}
                  width={Math.max(holdersSize.width - 2, 0)}
                  height={Math.max(holdersSize.height - 2, 0)}
                  rx={7}
                  fill="none"
                  stroke="#f3c96b"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={`${holdersBeamLength} ${Math.max(holdersPerimeter - holdersBeamLength, 0)}`}
                  strokeDashoffset={holdersBeamOffset}
                />
              </Svg>
            </View>
          ) : null}
        </View>

        <View
          onTouchStart={(event) => {
            touchStartXRef.current = event.nativeEvent.pageX;
          }}
          onTouchEnd={(event) => {
            const start = touchStartXRef.current;
            touchStartXRef.current = null;
            if (start === null) return;
            const delta = event.nativeEvent.pageX - start;
            if (Math.abs(delta) < 70) return;
            const order = ["current", "previous", "history"] as const;
            const index = order.indexOf(mainTab);
            const next =
              delta < 0
                ? order[Math.min(order.length - 1, index + 1)]
                : order[Math.max(0, index - 1)];
            setMainTab(next);
          }}
        >

        {showLeagueTabs && mainTab !== "history" ? (
          <View style={styles.leagueTabs}>
            <TouchableOpacity
              style={[
                styles.leagueTab,
                activeLeague === "individual" && styles.leagueTabActive,
              ]}
              onPress={() => setLeagueTab("individual")}
            >
              <Text
                style={[
                  styles.leagueTabText,
                  activeLeague === "individual" && styles.leagueTabTextActive,
                ]}
              >
                Individuais
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.leagueTab,
                activeLeague === "couple" && styles.leagueTabActive,
              ]}
              onPress={() => setLeagueTab("couple")}
            >
              <Text
                style={[
                  styles.leagueTabText,
                  activeLeague === "couple" && styles.leagueTabTextActive,
                ]}
              >
                Casais
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {mainTab === "current" ? (
          <>
        {isAdminUser ? (
          <TouchableOpacity
            style={[styles.resetButton, resetting && styles.resetButtonDisabled]}
            onPress={handleResetRanking}
            disabled={resetting}
          >
            {resetting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#fff" />
                <Text style={styles.resetButtonText}>Reiniciar ranking</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canPurgeRankingHistory ? (
          <View style={styles.purgeCard}>
            <Text style={styles.purgeTitle}>Apagar histórico do ranking</Text>
            <Text style={styles.purgeText}>
              Remove edições encerradas (pódios, posições e histórico). Não
              altera insígnias. Disponível só na versão web para admin.
            </Text>
            {gamification.seasons.length === 0 ? (
              <Text style={styles.purgeEmpty}>
                Nenhuma edição encerrada para apagar.
              </Text>
            ) : (
              gamification.seasons.map((season) => {
                const selected = selectedPurgeSeasons.includes(
                  season.seasonNumber,
                );
                return (
                  <TouchableOpacity
                    key={season.seasonNumber}
                    style={[
                      styles.purgeSeasonRow,
                      selected && styles.purgeSeasonRowSelected,
                    ]}
                    onPress={() => togglePurgeSeason(season.seasonNumber)}
                    disabled={purging}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={20}
                      color={selected ? "#FF008A" : "#aaa"}
                    />
                    <Text style={styles.purgeSeasonText}>
                      {rankingSeasonPeriodLabel(season)}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity
              style={styles.purgeOptionRow}
              onPress={() => setWipeCurrentOnPurge((current) => !current)}
              disabled={purging}
            >
              <Ionicons
                name={wipeCurrentOnPurge ? "checkbox" : "square-outline"}
                size={20}
                color={wipeCurrentOnPurge ? "#FF008A" : "#aaa"}
              />
              <Text style={styles.purgeSeasonText}>
                Também zerar ranking atual (pontos)
              </Text>
            </TouchableOpacity>
            <View style={styles.purgeActions}>
              <TouchableOpacity
                style={[
                  styles.purgeButton,
                  purging && styles.resetButtonDisabled,
                ]}
                onPress={handlePurgeSelected}
                disabled={purging}
              >
                {purging ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.resetButtonText}>Apagar selecionadas</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.purgeButtonOutline,
                  purging && styles.resetButtonDisabled,
                ]}
                onPress={handlePurgeAll}
                disabled={purging}
              >
                <Text style={styles.purgeButtonOutlineText}>
                  Apagar todas as edições
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {showRules ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Como funciona</Text>
            <Text style={styles.infoText}>
              O ranking mostra quem mais registra o consumo moderado no aplicativo.
              Quanto mais pontos, melhor a posição. Cada dia vale no máximo uma
              pontuação — registrar vários gastos no mesmo dia não soma pontos
              extras.
            </Text>

            <Text style={styles.infoSubtitle}>Como pontuar</Text>
            <Text style={styles.infoBullet}>• Gasto no app no mesmo dia: 1 pt</Text>
            <Text style={styles.infoBullet}>
              • Gasto do dia anterior registrado no dia seguinte: 1 pt
            </Text>
            <Text style={styles.infoBullet}>
              • Zero no mesmo dia ou zero de ontem confirmado hoje: 2 pts
            </Text>
            <Text style={styles.infoBullet}>
              • Preenchimentos com 2+ dias de atraso: 0 pt
            </Text>

            <Text style={styles.infoSubtitle}>Período do ranking</Text>
            <Text style={styles.infoText}>
              A pontuação acumula até o administrador reiniciar o ranking.
              Reiniciar o ciclo de planejamento não zera o ranking. Contas de
              casal competem só com outros casais; contas individuais competem
              entre si.
              {cutoffDateKey
                ? ` Último reinício: ${cutoffDateKey.split("-").reverse().join("/")}.`
                : ""}
            </Text>

            <Text style={styles.infoSubtitle}>Atenção</Text>
            <Text style={styles.infoText}>
              Se passar 2 dias seguidos sem registrar no aplicativo, esses 2 dias
              ficam com 0 pts. Depois disso, você volta a pontuar normalmente ao
              registrar gastos ou confirmar zero no popup do Início ou na tela
              Consumo Moderado.
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>
          {activeLeague === "couple"
            ? "Classificação — Casais"
            : "Classificação — Individuais"}
        </Text>
        {staleNotice ? (
          <Text style={styles.detail}>
            Sem conexão. Exibindo a última classificação salva.
          </Text>
        ) : null}
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color="#B900FF" />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.loadingRow}>
            <Text style={styles.emptyText}>
              Ainda não há participantes no ranking.
            </Text>
          </View>
        ) : null}
          </>
        ) : mainTab === "previous" ? (
          gamification.loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color="#B900FF" />
            </View>
          ) : gamification.error ? (
            <View style={styles.loadingRow}>
              <Text style={styles.emptyText}>
                Não foi possível carregar o pódio anterior.
              </Text>
            </View>
          ) : !gamification.latestSeason ? (
            <View style={styles.loadingRow}>
              <Text style={styles.emptyText}>
                Ainda não há uma edição encerrada.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                Edição {gamification.latestSeason.seasonNumber} encerrada
                {gamification.latestSeason.endedAt
                  ? ` em ${gamification.latestSeason.endedAt.toLocaleDateString("pt-BR")}`
                  : ""}
              </Text>
              <PodiumView
                entries={gamification.latestSeason.podiums[activeLeague]}
                activeBadgesByUser={gamification.badgesByUser}
                activeBorderDefinitionByUser={podiumBorderMap(
                  gamification.latestSeason.podiums[activeLeague],
                )}
              />
            </>
          )
        ) : gamification.loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color="#B900FF" />
          </View>
        ) : gamification.seasons.length === 0 ? (
          <View style={styles.loadingRow}>
            <Text style={styles.emptyText}>
              Nenhuma edição encerrada até agora.
            </Text>
          </View>
        ) : (
          gamification.seasons.map((season) => (
            <View key={season.seasonNumber} style={styles.seasonCard}>
              <TouchableOpacity
                onPress={() =>
                  setExpandedSeason(
                    expandedSeason === season.seasonNumber
                      ? null
                      : season.seasonNumber,
                  )
                }
              >
                <Text style={styles.seasonTitle}>
                  Edição {season.seasonNumber}
                  {season.endedAt
                    ? ` · ${season.endedAt.toLocaleDateString("pt-BR")}`
                    : ""}
                </Text>
                <Text style={styles.seasonSummary}>
                  Individual:{" "}
                  {season.podiums.individual
                    .map((entry) => entry.displayName)
                    .join(", ") || "sem vencedores"}
                  {"\n"}Casais:{" "}
                  {season.podiums.couple
                    .map((entry) => entry.displayName)
                    .join(", ") || "sem vencedores"}
                </Text>
              </TouchableOpacity>
              {expandedSeason === season.seasonNumber ? (
                <PodiumView
                  entries={season.podiums[activeLeague]}
                  activeBadgesByUser={gamification.badgesByUser}
                  activeBorderDefinitionByUser={podiumBorderMap(
                    season.podiums[activeLeague],
                  )}
                />
              ) : null}
            </View>
          ))
        )}
        </View>
        </>
        }
      />

      <BadgeDetailModal
        definition={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      <PhotoPreviewModal
        visible={Boolean(photoPreview)}
        uri={photoPreview?.uri}
        name={photoPreview?.name}
        userId={photoPreview?.userId}
        rankingPreference="participate"
        onViewProfile={(userId) => {
          setPhotoPreview(null);
          navigate("PublicGamificationProfile", { userId });
        }}
        onClose={() => setPhotoPreview(null)}
      />

      <Modal
        visible={showPreferenceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Como você quer usar o Ranking?
            </Text>
            <Text style={styles.modalSubtitle}>
              Escolha uma opção para continuar. Você pode mudar depois em
              Configurações.
            </Text>

            <TouchableOpacity
              style={[
                styles.optionButton,
                styles.optionPrimary,
                selectedPreference === "participate" && styles.optionSelected,
              ]}
              disabled={isSaving}
              onPress={() => handleSelectRankingPreference("participate")}
            >
              <Text style={styles.optionTitle}>Participar</Text>
              <Text style={styles.optionText}>
                Você aparece no ranking e acompanha as outras pessoas.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedPreference === "view_only" && styles.optionSelected,
              ]}
              disabled={isSaving}
              onPress={() => handleSelectRankingPreference("view_only")}
            >
              <Text style={styles.optionTitle}>Apenas visualizar</Text>
              <Text style={styles.optionText}>
                Você não aparece no ranking, mas pode acompanhar o resultado.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionButton,
                selectedPreference === "hidden" && styles.optionSelected,
              ]}
              disabled={isSaving}
              onPress={() => handleSelectRankingPreference("hidden")}
            >
              <Text style={styles.optionTitle}>Esconder ranking</Text>
              <Text style={styles.optionText}>
                A aba será removida do menu e poderá ser reativada em
                Configurações.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedPreference || isSaving) && styles.saveButtonDisabled,
              ]}
              disabled={!selectedPreference || isSaving}
              onPress={handleSavePreference}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.saveButtonText}> Salvando...</Text>
                </>
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
  header: { color: "#fff", fontSize: 20, fontWeight: "700", flex: 1 },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF008A",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  purgeCard: {
    backgroundColor: "#1a1214",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#5a2430",
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  purgeTitle: {
    color: "#ff8fa3",
    fontSize: 15,
    fontWeight: "700",
  },
  purgeText: {
    color: "#ccc",
    fontSize: 13,
    lineHeight: 18,
  },
  purgeEmpty: {
    color: "#888",
    fontSize: 13,
  },
  purgeSeasonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#22181a",
  },
  purgeSeasonRowSelected: {
    borderWidth: 1,
    borderColor: "#FF008A",
  },
  purgeOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  purgeSeasonText: {
    color: "#eee",
    fontSize: 13,
    flex: 1,
  },
  purgeActions: {
    gap: 8,
    marginTop: 4,
  },
  purgeButton: {
    backgroundColor: "#b91c1c",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  purgeButtonOutline: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF008A",
  },
  purgeButtonOutlineText: {
    color: "#ff8fa3",
    fontWeight: "700",
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: "#171321",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  infoTitle: {
    color: "#B900FF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoSubtitle: {
    color: "#c084fc",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  infoText: {
    color: "#bbb",
    fontSize: 13,
    lineHeight: 20,
  },
  infoBullet: {
    color: "#bbb",
    fontSize: 13,
    lineHeight: 20,
    paddingLeft: 4,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  leagueTabs: {
    flexDirection: "row",
    backgroundColor: "#171321",
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  leagueTab: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  leagueTabActive: {
    backgroundColor: "#B900FF",
  },
  leagueTabText: {
    color: "#aaa",
    fontWeight: "700",
    fontSize: 14,
  },
  leagueTabTextActive: {
    color: "#fff",
  },
  loadingRow: { padding: 40, alignItems: "center" },
  emptyText: { color: "#999", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  pos: { width: 48, color: "#fff", fontSize: 16, fontWeight: "700" },
  info: { flex: 1 },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  detail: { color: "#999", fontSize: 13 },
  holdersButtonWrap: {
    alignSelf: "flex-end",
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: "#241541",
  },
  holdersButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(231, 185, 88, 0.35)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  holdersBeamLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  holdersButtonText: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
  seasonCard: {
    backgroundColor: "#171321",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  seasonTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  seasonSummary: { color: "#999", fontSize: 12, lineHeight: 18, marginTop: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#171321",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2b2b2b",
    gap: 10,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: "#aaa",
    fontSize: 13,
    marginBottom: 4,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#1f1f1f",
  },
  optionPrimary: {
    borderColor: "#B900FF",
  },
  optionTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  optionText: {
    color: "#b7b7b7",
    fontSize: 12,
  },
  optionSelected: {
    borderColor: "#B900FF",
    backgroundColor: "rgba(140,82,255,0.08)",
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  savingText: {
    color: "#b7b7b7",
    fontSize: 12,
  },
  posWrapper: {
    width: 48,
    alignItems: "center",
  },
  rowTop: {
    backgroundColor: "rgba(140,82,255,0.12)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginVertical: 6,
    borderLeftWidth: 6,
    borderLeftColor: "#B900FF",
  },
  posTop: {
    fontSize: 18,
    color: "#B900FF",
    fontWeight: "800",
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarTop: { width: 56, height: 56, borderRadius: 28 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2b2b2b",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: { color: "#fff", fontWeight: "700", fontSize: 14 },
  avatarInitialsTop: { fontSize: 16, fontWeight: "800" },
  nameTop: { fontSize: 17, fontWeight: "800" },
});

export default RankingScreen;
