/**
 * Rendas acompanhadas — hub no mesmo espírito de Gastos acompanhados.
 * Lista apenas rendas com dailyTracking no planejamento; cada item abre TrackedIncomeScreen.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { formatCurrency } from "../../utils/currencyUtils";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { ExpectedItem } from "../../types/planning";
import { normalizeExpenseTitleKey } from "../../utils/expenseScopeUtils";

type TrackedIncomeItem = {
  title: string;
  plannedAmount: number;
};

const getPlannedAmount = (item: ExpectedItem) => {
  const amountCard = Number(item?.amountCard);
  const amountCash = Number(item?.amountCash);
  const hasSplit = Number.isFinite(amountCard) || Number.isFinite(amountCash);
  if (hasSplit) {
    return (
      (Number.isFinite(amountCard) ? amountCard : 0) +
      (Number.isFinite(amountCash) ? amountCash : 0)
    );
  }
  return Number(item?.amount) || 0;
};

const buildTrackedIncomeItems = (
  expectedIncomes: ExpectedItem[] = [],
): TrackedIncomeItem[] => {
  const byKey = new Map<string, TrackedIncomeItem>();

  expectedIncomes.forEach((item) => {
    if (!item.dailyTracking) return;
    const title = String(item.source || "").trim();
    if (!title) return;

    const key = normalizeExpenseTitleKey(title);
    const existing = byKey.get(key);
    const amount = getPlannedAmount(item);

    if (existing) {
      existing.plannedAmount += amount;
      return;
    }

    byKey.set(key, { title, plannedAmount: amount });
  });

  return Array.from(byKey.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "pt-BR"),
  );
};

export const IncomeListScreen = () => {
  const { user } = useAuth();
  const { currentScreen, navigate, params } = useNavigation() as any;
  const clientId = String(params?.clientId || "");
  const isSpectator =
    !!clientId &&
    (user?.role === "consultor" || user?.role === "admin" || !!user?.isAdmin);
  const ownerId = isSpectator ? clientId : user?.id || "";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [loading, setLoading] = useState(true);
  const [trackedItems, setTrackedItems] = useState<TrackedIncomeItem[]>([]);
  const [planningCycleLabel, setPlanningCycleLabel] = useState("");

  useEffect(() => {
    if (currentScreen === "IncomeList" && ownerId) {
      loadTrackedIncomes();
    }
  }, [currentScreen, ownerId]);

  useEffect(() => {
    if (!loading) {
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
    }
  }, [loading]);

  const loadTrackedIncomes = async () => {
    if (!ownerId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const planning = await planningServices.getPlanning(ownerId);
      setPlanningCycleLabel(getPlanningCycleLabel(planning) || "");
      setTrackedItems(
        buildTrackedIncomeItems(planning?.expectedIncomes || []),
      );
    } catch (error) {
      console.error("Erro ao carregar rendas acompanhadas:", error);
      Alert.alert("Erro", "Não foi possível carregar as rendas acompanhadas");
    } finally {
      setLoading(false);
    }
  };

  const openTrackedIncome = (title: string) => {
    navigate("TrackedIncome", {
      trackedTitle: title,
      clientId: clientId || undefined,
    });
  };

  if (loading) {
    return (
      <Layout
        title="Rendas Acompanhadas"
        showBackButton={isSpectator}
        showSidebar={!isSpectator}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando rendas...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Rendas Acompanhadas"
      showBackButton={isSpectator}
      showSidebar={!isSpectator}
    >
      <ScrollView style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Ionicons name="analytics-outline" size={64} color="#8c52ff" />
            <Text style={styles.title}>Rendas Acompanhadas</Text>
            <Text style={styles.subtitle}>
              Selecione uma renda para registrar e acompanhar dia a dia
            </Text>
            {isSpectator ? (
              <Text style={styles.spectatorHint}>
                Visualização do cliente (somente leitura)
              </Text>
            ) : null}
            {planningCycleLabel ? (
              <Text style={styles.cycleLabel}>{planningCycleLabel}</Text>
            ) : null}
          </View>

          {trackedItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color="#666"
              />
              <Text style={styles.emptyTitle}>
                Nenhuma renda acompanhada configurada
              </Text>
              <Text style={styles.emptyText}>
                Apenas rendas marcadas com acompanhamento diário no planejamento
                aparecem aqui. Rendas avulsas ou sem acompanhamento não entram
                nesta lista.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {trackedItems.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.card}
                  onPress={() => openTrackedIncome(item.title)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardLeft}>
                    <View style={styles.iconWrap}>
                      <Ionicons name="cash-outline" size={22} color="#8c52ff" />
                    </View>
                    <View style={styles.cardTextWrap}>
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.cardMeta}>
                        Previsto no ciclo:{" "}
                        {formatCurrency(item.plannedAmount)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#8c52ff" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  loadingText: {
    color: "#999",
    marginTop: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  spectatorHint: {
    marginTop: 10,
    fontSize: 13,
    color: "#c084fc",
    textAlign: "center",
  },
  cycleLabel: {
    marginTop: 8,
    fontSize: 13,
    color: "#8c52ff",
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    padding: 16,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(140, 82, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardTextWrap: {
    flex: 1,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#999",
    fontSize: 13,
    marginTop: 4,
  },
  emptyState: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#141414",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});

export default IncomeListScreen;
