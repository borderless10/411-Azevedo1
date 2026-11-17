import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BadgeDetailModal, BadgeEmblemRow } from "../../components/Gamification/BadgeEmblem";
import { BadgedAvatar } from "../../components/Gamification/BadgedAvatar";
import { PhotoPreviewModal } from "../../components/Gamification/PhotoPreviewModal";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import {
  PublicGamificationProfileUnavailableError,
  publicGamificationProfileService,
} from "../../services/publicGamificationProfileService";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; profile: PublicGamificationProfile }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };
import { rankingGamificationService } from "../../services/rankingGamificationService";
import type { PublicGamificationProfile } from "../../types/publicGamificationProfile";
import type { BadgeDefinition } from "../../types/rankingGamification";
import {
  resolveAvatarBadgeDefinition,
  resolveAvatarRingDefinition,
} from "../../utils/badgeRules";

export const PublicGamificationProfileScreen = () => {
  const { params } = useNavigation();
  const userId = typeof params?.userId === "string" ? params.userId : "";
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(null);
  const [photoVisible, setPhotoVisible] = useState(false);
  const profile = loadState.kind === "ready" ? loadState.profile : null;

  useEffect(
    () =>
      rankingGamificationService.subscribeBadgeDefinitions(
        setDefinitions,
        () => {},
      ),
    [],
  );

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setLoadState({
        kind: "error",
        message: "Usuário não informado para este perfil.",
      });
      return () => {
        mounted = false;
      };
    }
    setLoadState({ kind: "loading" });
    publicGamificationProfileService
      .getByUserId(userId)
      .then((data) => {
        if (mounted) setLoadState({ kind: "ready", profile: data });
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        if (loadError instanceof PublicGamificationProfileUnavailableError) {
          setLoadState({ kind: "unavailable" });
          return;
        }
        setLoadState({
          kind: "error",
          message:
            loadError instanceof Error && loadError.message
              ? loadError.message
              : "Não foi possível carregar as conquistas agora. Tente novamente.",
        });
      });
    return () => {
      mounted = false;
    };
  }, [userId, reloadKey]);

  const definitionsById = useMemo(
    () => new Map(definitions.map((definition) => [definition.id, definition])),
    [definitions],
  );
  const badges = (profile?.activeBadgeIds || [])
    .map((badgeId) => definitionsById.get(badgeId))
    .filter((definition): definition is BadgeDefinition => Boolean(definition));
  const activeBorder = profile?.activeBadgeBorderId
    ? definitionsById.get(profile.activeBadgeBorderId) || null
    : null;
  const ringDefinition = resolveAvatarRingDefinition(activeBorder);
  const badgeDefinition = resolveAvatarBadgeDefinition(activeBorder, badges);

  return (
    <Layout title="Perfil de conquistas" showBackButton>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {loadState.kind === "loading" ? (
          <View style={styles.stateCard}>
            <ActivityIndicator size="large" color="#8c52ff" />
            <Text style={styles.stateText}>Carregando conquistas...</Text>
          </View>
        ) : loadState.kind === "unavailable" ? (
          <View style={styles.stateCard}>
            <Ionicons name="lock-closed-outline" size={34} color="#999" />
            <Text style={styles.stateText}>
              Este perfil de conquistas não está disponível.
            </Text>
            <Text style={styles.stateDetail}>
              O usuário não participa publicamente do ranking.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setReloadKey((key) => key + 1)}
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : loadState.kind === "error" || !profile ? (
          <View style={styles.stateCard}>
            <Ionicons name="cloud-offline-outline" size={34} color="#999" />
            <Text style={styles.stateText}>
              {loadState.kind === "error"
                ? loadState.message
                : "Não foi possível carregar as conquistas agora. Tente novamente."}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setReloadKey((key) => key + 1)}
              accessibilityRole="button"
              accessibilityLabel="Tentar novamente"
            >
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <BadgedAvatar
                photoUri={profile.photoUrl}
                displayName={profile.displayName}
                size={112}
                ringDefinition={ringDefinition}
                badgeDefinition={badgeDefinition}
                onPhotoPress={
                  profile.photoUrl ? () => setPhotoVisible(true) : undefined
                }
                onBadgePress={badgeDefinition ? setSelectedBadge : undefined}
              />
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.league}>
                {profile.isCouple ? "Ranking de casais" : "Ranking individual"}
              </Text>
            </View>

            <View style={styles.metrics}>
              <Metric label="Pontos atuais" value={profile.currentRankingPoints} />
              <Metric
                label="Máximo registrado"
                value={profile.maxRankingPointsEver}
              />
              <Metric
                label="Temporadas"
                value={profile.seasonsParticipated}
              />
            </View>

            {profile.maxRankingPointsIsPartial ? (
              <Text style={styles.limitation}>
                O máximo histórico considera os registros disponíveis desde o
                início deste perfil e os pódios anteriores recuperáveis.
              </Text>
            ) : null}

            <Text style={styles.sectionTitle}>Coroas históricas</Text>
            <View style={styles.crowns}>
              <Crown label="Ouro" count={profile.crownsGold} color="#f3c96b" />
              <Crown label="Prata" count={profile.crownsSilver} color="#c7ced9" />
              <Crown label="Bronze" count={profile.crownsBronze} color="#c9874f" />
            </View>

            <Text style={styles.sectionTitle}>Insígnias</Text>
            {badges.length ? (
              <View style={styles.badgesCard}>
                <BadgeEmblemRow
                  definitions={badges}
                  max={badges.length}
                  size={38}
                  onPress={setSelectedBadge}
                />
                {activeBorder ? (
                  <Text style={styles.activeBorder}>
                    Borda ativa: {activeBorder.name}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.empty}>Nenhuma insígnia ativa.</Text>
            )}

            <Text style={styles.sectionTitle}>Pódios por temporada</Text>
            {profile.podiumFinishes.length ? (
              [...profile.podiumFinishes]
                .sort((a, b) => b.seasonNumber - a.seasonNumber)
                .map((finish) => (
                  <View
                    key={`${finish.seasonNumber}-${finish.league}`}
                    style={styles.podiumRow}
                  >
                    <Ionicons
                      name="trophy"
                      size={22}
                      color={
                        finish.position === 1
                          ? "#f3c96b"
                          : finish.position === 2
                            ? "#c7ced9"
                            : "#c9874f"
                      }
                    />
                    <View style={styles.podiumInfo}>
                      <Text style={styles.podiumTitle}>
                        Edição {finish.seasonNumber} · {finish.position}º lugar
                      </Text>
                      <Text style={styles.podiumDetail}>
                        {finish.rankingPoints} pts ·{" "}
                        {finish.league === "couple" ? "Casais" : "Individual"}
                      </Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.empty}>Nenhum pódio registrado.</Text>
            )}
          </>
        )}
      </ScrollView>

      <BadgeDetailModal
        definition={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
      <PhotoPreviewModal
        visible={photoVisible}
        uri={profile?.photoUrl}
        name={profile?.displayName}
        onClose={() => setPhotoVisible(false)}
      />
    </Layout>
  );
};

const Metric = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.metric}>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const Crown = ({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) => (
  <View style={styles.crown}>
    <Ionicons name="trophy" size={28} color={color} />
    <Text style={[styles.crownCount, { color }]}>{count}</Text>
    <Text style={styles.crownLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  content: { padding: 18, paddingBottom: 40, gap: 14 },
  stateCard: { alignItems: "center", gap: 12, paddingVertical: 56 },
  stateText: { color: "#aaa", fontSize: 15, textAlign: "center" },
  stateDetail: { color: "#777", fontSize: 13, textAlign: "center" },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#8c52ff",
    alignItems: "center",
    justifyContent: "center",
  },
  retryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  hero: { alignItems: "center", gap: 7, marginBottom: 4 },
  name: { color: "#fff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  league: { color: "#c084fc", fontSize: 14, fontWeight: "600" },
  metrics: { flexDirection: "row", gap: 8 },
  metric: {
    flex: 1,
    minHeight: 92,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171717",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2d2d2d",
    padding: 10,
  },
  metricValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  metricLabel: { color: "#999", fontSize: 11, textAlign: "center", marginTop: 4 },
  limitation: { color: "#777", fontSize: 11, lineHeight: 16 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800", marginTop: 8 },
  crowns: { flexDirection: "row", gap: 8 },
  crown: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#171717",
    borderRadius: 14,
    paddingVertical: 14,
  },
  crownCount: { fontSize: 20, fontWeight: "800", marginTop: 3 },
  crownLabel: { color: "#999", fontSize: 12 },
  badgesCard: {
    backgroundColor: "#171717",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  activeBorder: { color: "#c084fc", fontSize: 13, fontWeight: "700" },
  podiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 14,
  },
  podiumInfo: { flex: 1 },
  podiumTitle: { color: "#fff", fontSize: 14, fontWeight: "700" },
  podiumDetail: { color: "#999", fontSize: 12, marginTop: 3 },
  empty: { color: "#888", fontSize: 13 },
});

export default PublicGamificationProfileScreen;
