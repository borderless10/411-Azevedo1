import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { Layout } from "../../components/Layout/Layout";
import { rankingServices, RankingEntry } from "../../services/rankingServices";
import { userService } from "../../services/userServices";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { RankingPreference } from "../../types/auth";

type Row = {
  position: number;
  userId: string;
  displayName: string;
  zeroDays: number;
  photoBase64?: string | null;
  nickname?: string | null;
  role?: string | null;
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

  const isCommonUser = !user?.isAdmin && user?.role !== "consultor";

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
      setLoading(true);
      try {
        const ranking = await rankingServices.getRanking(50);
        const out: Row[] = [];

        for (let i = 0; i < ranking.length; i++) {
          const r: RankingEntry = ranking[i];
          let display = r.userId;
          let photo: string | null = null;
          let nickname: string | null = null;
          let role: string | null = null;
          try {
            const u = await userService.getUserById(r.userId);
            if (u) {
              display =
                u.nickname || u.username || u.name || u.email || display;
              photo = (u as any).photoBase64 ?? null;
              nickname = (u as any).nickname ?? null;
              role = (u as any).role ?? null;
            }
          } catch (e) {
            // ignore
          }
          out.push({
            position: i + 1,
            userId: r.userId,
            displayName: display,
            zeroDays: r.zeroDays,
            photoBase64: photo,
            nickname,
            role,
          });
        }

        if (mounted) setRows(out);
      } catch (error) {
        console.error("❌ [RANKING SCREEN] Erro ao carregar ranking:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [isCommonUser, rankingPreference]);

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
    <Layout title="Ranking" showBackButton={false} showSidebar={true}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.header}>Ranking — Zeros na planilha</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="large" color="#8c52ff" />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.loadingRow}>
            <Text style={styles.emptyText}>
              Ainda não há participantes no ranking.
            </Text>
          </View>
        ) : (
          rows.map((r) => (
            <View
              key={r.userId}
              style={[styles.row, r.position <= 3 ? styles.rowTop : null]}
            >
              <View style={styles.posWrapper}>
                <Text
                  style={[styles.pos, r.position <= 3 ? styles.posTop : null]}
                >
                  {r.position}º
                </Text>
              </View>

              <View style={styles.avatarWrapper}>
                {r.photoBase64 ? (
                  <Image
                    source={{ uri: `data:image/png;base64,${r.photoBase64}` }}
                    style={[
                      styles.avatar,
                      r.position <= 3 ? styles.avatarTop : null,
                    ]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      r.position <= 3 ? styles.avatarTop : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.avatarInitials,
                        r.position <= 3 ? styles.avatarInitialsTop : null,
                      ]}
                    >
                      {r.displayName
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.info}>
                <Text
                  style={[styles.name, r.position <= 3 ? styles.nameTop : null]}
                >
                  {r.displayName}
                </Text>
                <Text style={styles.detail}>{r.zeroDays} dias com zero</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

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
  header: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#161616",
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
    borderColor: "#8c52ff",
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
    borderColor: "#8c52ff",
    backgroundColor: "rgba(140,82,255,0.08)",
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#8c52ff",
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
    borderLeftColor: "#8c52ff",
  },
  posTop: {
    fontSize: 18,
    color: "#8c52ff",
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
