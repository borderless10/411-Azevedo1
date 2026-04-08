/**
 * Tela de Recomendação
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { recommendationServices } from "../../services/recommendationServices";
import { Recommendation } from "../../types/recommendation";

const formatDay = (date: Date): string => {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, "").slice(0, 6);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
};

const getTodayAsInput = (): string => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  return `${dd} ${mm} ${yy}`;
};

const formatDateToInput = (date: Date): string => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd} ${mm} ${yy}`;
};

const parseDateInput = (value: string): Date | null => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 6) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = 2000 + Number(digits.slice(4, 6));

  if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);
  const isValid =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isValid ? parsed : null;
};

export const RecomendacaoScreen = () => {
  const { user } = useAuth();
  const { params } = useNavigation() as any;
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [recommendationDate, setRecommendationDate] = useState(getTodayAsInput);
  const [topicInputs, setTopicInputs] = useState<string[]>([""]);
  const [editingRecommendation, setEditingRecommendation] =
    useState<Recommendation | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const targetUserId =
    params?.clientId && user?.role === "consultor" ? params.clientId : user?.id;
  const isConsultantCreatingForClient =
    user?.role === "consultor" && Boolean(params?.clientId);

  const loadRecommendations = async () => {
    if (!targetUserId) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data =
        await recommendationServices.getRecommendations(targetUserId);
      setRecommendations(data);
    } catch (error) {
      console.error("❌ [RECOMENDACOES] Erro ao carregar:", error);
      Alert.alert("Erro", "Não foi possível carregar as recomendações");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    if (!isConsultantCreatingForClient) return;
    setEditingRecommendation(null);
    setRecommendationDate(getTodayAsInput());
    setTopicInputs([""]);
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (recommendation: Recommendation) => {
    if (!isConsultantCreatingForClient) return;

    setEditingRecommendation(recommendation);
    setRecommendationDate(formatDateToInput(recommendation.recommendationDate));
    setTopicInputs(
      recommendation.topics.length > 0 ? recommendation.topics : [""],
    );
    setShowCreateModal(true);
  };

  const handleDeleteRecommendation = (recommendation: Recommendation) => {
    if (!isConsultantCreatingForClient) return;

    Alert.alert("Excluir recomendação", "Deseja remover esta recomendação?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await recommendationServices.deleteRecommendation(
              recommendation.id,
            );
            await loadRecommendations();
          } catch (error) {
            console.error("❌ [RECOMENDACOES] Erro ao excluir:", error);
            Alert.alert("Erro", "Não foi possível excluir a recomendação.");
          }
        },
      },
    ]);
  };

  const handleDateInputChange = (value: string) => {
    setRecommendationDate(formatDateInput(value));
  };

  const handleTopicChange = (index: number, value: string) => {
    setTopicInputs((previous) =>
      previous.map((topic, currentIndex) =>
        currentIndex === index ? value : topic,
      ),
    );
  };

  const handleAddTopicField = () => {
    setTopicInputs((previous) => [...previous, ""]);
  };

  const handleRemoveTopicField = (index: number) => {
    setTopicInputs((previous) => {
      if (previous.length === 1) {
        return [""];
      }

      return previous.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const handleCreateRecommendation = async () => {
    if (!user?.id || !targetUserId) {
      return;
    }

    const parsedDate = parseDateInput(recommendationDate);
    const topics = topicInputs.map((topic) => topic.trim()).filter(Boolean);

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      Alert.alert("Data inválida", "Use 6 dígitos no formato DD MM YY.");
      return;
    }

    if (topics.length === 0) {
      Alert.alert("Tópicos obrigatórios", "Informe pelo menos um tópico.");
      return;
    }

    try {
      setSaving(true);
      if (editingRecommendation) {
        await recommendationServices.updateRecommendation(
          editingRecommendation.id,
          {
            recommendationDate: parsedDate,
            topics,
          },
        );
      } else {
        await recommendationServices.createRecommendation(
          targetUserId,
          user.id,
          {
            recommendationDate: parsedDate,
            topics,
          },
        );
      }
      setShowCreateModal(false);
      setEditingRecommendation(null);
      await loadRecommendations();
    } catch (error: any) {
      console.error("❌ [RECOMENDACOES] Erro ao criar:", error);
      Alert.alert("Erro", error?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadRecommendations();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [params?.clientId, user?.id]);

  return (
    <Layout
      title="Recomendações"
      showBackButton={isConsultantCreatingForClient}
      showSidebar={!isConsultantCreatingForClient}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View
            style={[
              styles.headerCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.headerTopRow}>
              <Ionicons name="bulb" size={28} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Recomendações financeiras
              </Text>
            </View>
            <Text
              style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            >
              {isConsultantCreatingForClient
                ? "Registre orientações para este cliente acompanhar na aba de recomendações."
                : "Acompanhe aqui as orientações enviadas pelo seu consultor."}
            </Text>
          </View>

          {isConsultantCreatingForClient && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenCreateModal}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Nova recomendação</Text>
            </TouchableOpacity>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : recommendations.length === 0 ? (
            <View
              style={[
                styles.emptyState,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhuma recomendação ainda
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.textSecondary }]}
              >
                {isConsultantCreatingForClient
                  ? "Adicione a primeira recomendação para este cliente."
                  : "Quando seu consultor enviar novas recomendações, elas aparecerão aqui."}
              </Text>
            </View>
          ) : (
            <View style={styles.listWrap}>
              {recommendations.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.dateBadge}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#fff"
                      />
                      <Text style={styles.dateBadgeText}>
                        {formatDay(item.recommendationDate)}
                      </Text>
                    </View>

                    {isConsultantCreatingForClient && (
                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleOpenEditModal(item)}
                        >
                          <Ionicons
                            name="pencil"
                            size={18}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.iconButton}
                          onPress={() => handleDeleteRecommendation(item)}
                        >
                          <Ionicons name="trash" size={18} color="#ff4d6d" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.topicsWrap}>
                    {item.topics.map((topic, idx) => (
                      <View
                        key={`${item.id}-${idx}`}
                        style={[
                          styles.topicRow,
                          {
                            borderColor: colors.primary,
                            backgroundColor: `${colors.primary}14`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.primary}
                        />
                        <Text
                          style={[styles.topicChipText, { color: colors.text }]}
                        >
                          {topic}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />

          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingRecommendation
                  ? "Editar recomendação"
                  : "Nova recomendação"}
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Data (DD MM YY)
            </Text>
            <TextInput
              value={recommendationDate}
              onChangeText={handleDateInputChange}
              placeholder="08 04 26"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              autoCapitalize="none"
              keyboardType="number-pad"
              maxLength={8}
            />

            <View style={styles.topicHeaderRow}>
              <Text
                style={[styles.fieldLabel, { color: colors.textSecondary }]}
              >
                Tópicos
              </Text>
              <TouchableOpacity
                style={[
                  styles.addTopicButton,
                  {
                    borderColor: colors.primary,
                    backgroundColor: `${colors.primary}22`,
                  },
                ]}
                onPress={handleAddTopicField}
              >
                <Ionicons name="add" size={16} color={colors.primary} />
                <Text
                  style={[styles.addTopicButtonText, { color: colors.primary }]}
                >
                  Adicionar tópico
                </Text>
              </TouchableOpacity>
            </View>

            {topicInputs.map((topic, index) => (
              <View key={`topic-input-${index}`} style={styles.topicInputRow}>
                <TextInput
                  value={topic}
                  onChangeText={(value) => handleTopicChange(index, value)}
                  placeholder={`Tópico ${index + 1}`}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.input,
                    styles.topicInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  onPress={() => handleRemoveTopicField(index)}
                  style={styles.removeTopicButton}
                  accessibilityLabel={`Remover tópico ${index + 1}`}
                >
                  <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Dica: use textos curtos e objetivos em cada tópico.
            </Text>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleCreateRecommendation}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingRecommendation
                    ? "Salvar alterações"
                    : "Salvar recomendação"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingWrap: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginTop: 10,
  },
  emptySubtitle: {
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },
  listWrap: {
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconButton: {
    padding: 4,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#8c52ff",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  dateBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  topicsWrap: {
    flexDirection: "column",
    gap: 8,
  },
  topicRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topicChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    paddingBottom: 20,
    gap: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  topicHeaderRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  addTopicButton: {
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addTopicButtonText: {
    fontWeight: "600",
    fontSize: 12,
  },
  topicInputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  topicInput: {
    flex: 1,
    minHeight: 72,
    textAlignVertical: "top",
  },
  removeTopicButton: {
    paddingHorizontal: 6,
    paddingTop: 12,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});

export default RecomendacaoScreen;
