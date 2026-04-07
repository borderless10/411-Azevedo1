/**
 * Tela de Consumo Moderado
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import expenseServices from "../../services/expenseServices";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { getStartOfDay, getEndOfDay, addDays } from "../../utils/dateUtils";
import { useNavigation } from "../../routes/NavigationContext";
import ZeroPlanilhaConfirmModal from "../../components/ui/ZeroPlanilhaConfirmModal";
import budgetServices from "../../services/budgetServices";
import { Alert } from "react-native";
import { ConsumptionCategoryRelease } from "../../types/planning";
import { toExpenseCategoryLookupKey } from "../../types/category";

export const ConsumoModeradoScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { user } = useAuth();
  const { currentScreen, navigate } = useNavigation() as any;
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<Array<{ date: Date; total: number }>>([]);
  const [tabReleases, setTabReleases] = useState<ConsumptionCategoryRelease[]>(
    [],
  );
  const [activeTabCategory, setActiveTabCategory] = useState<string>("");
  const [categoryDaysMap, setCategoryDaysMap] = useState<
    Record<string, Array<{ date: Date; total: number }>>
  >({});
  const [cycleLabel, setCycleLabel] = useState<string>("");

  const isCreditCardExpense = (exp: any) => {
    return (
      exp.paymentMethod === "credit_card" ||
      (exp.cardId && exp.cardId.length > 0)
    );
  };

  const fetchMonth = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const today = new Date();
      const planning = await planningServices.getPlanning(user.id);
      const cycleStartDate = planning?.consumoModeradoCycleStartedAt
        ? getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt))
        : null;
      const cycleEndDate = planning?.consumoModeradoCycleEndedAt
        ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
        : null;

      const start = cycleStartDate || getStartOfDay(today);
      const end = cycleEndDate || getEndOfDay(today);
      setCycleLabel(getPlanningCycleLabel(planning) || "");

      const releases = Object.values(planning?.categoryReleases || {})
        .filter((release) => release.status === "active")
        .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "pt-BR"));

      setTabReleases(releases);
      if (releases.length > 0) {
        setActiveTabCategory((current) =>
          current &&
          releases.some((release) => release.categoryName === current)
            ? current
            : releases[0].categoryName,
        );
      } else {
        setActiveTabCategory("");
      }

      const expenses = await expenseServices.getExpenses(user.id, {
        startDate: start,
        endDate: end,
      });

      // Filtrar despesas de cartão de crédito (não contabilizam no consumo)
      const filteredExpenses = expenses.filter(
        (exp) => !isCreditCardExpense(exp),
      );
      const map = new Map<string, number>();
      let cursor = getStartOfDay(start);
      const lastDay = getStartOfDay(end);
      while (cursor <= lastDay) {
        map.set(cursor.toDateString(), 0);
        cursor = addDays(cursor, 1);
      }

      // Agregar valores por dia (forçando value como número)
      filteredExpenses.forEach((exp) => {
        const expDate = new Date(exp.date);
        const key = getStartOfDay(expDate).toDateString();
        const prev = map.get(key) ?? 0;
        const val =
          typeof exp.value === "number"
            ? exp.value
            : parseFloat(String(exp.value)) || 0;
        map.set(key, prev + val);
      });

      const list: Array<{ date: Date; total: number }> = [];
      Array.from(map.entries()).forEach(([k, v]) => {
        list.push({ date: new Date(k), total: v });
      });

      const categoryMap: Record<
        string,
        Array<{ date: Date; total: number }>
      > = {};
      if (releases.length > 0) {
        const releaseKeys = releases.map((release) => ({
          categoryName: release.categoryName,
          lookupKey: toExpenseCategoryLookupKey(release.categoryName),
        }));

        const categoryDayBuckets = new Map<string, Map<string, number>>();
        releaseKeys.forEach((release) => {
          const dayMap = new Map<string, number>();
          let dayCursor = getStartOfDay(start);
          while (dayCursor <= lastDay) {
            dayMap.set(dayCursor.toDateString(), 0);
            dayCursor = addDays(dayCursor, 1);
          }
          categoryDayBuckets.set(release.categoryName, dayMap);
        });

        filteredExpenses.forEach((exp) => {
          const expDate = new Date(exp.date);
          const dayKey = getStartOfDay(expDate).toDateString();
          const expenseKey = toExpenseCategoryLookupKey(exp.category);
          const expenseValue =
            typeof exp.value === "number"
              ? exp.value
              : parseFloat(String(exp.value)) || 0;

          releaseKeys.forEach((release) => {
            if (release.lookupKey !== expenseKey) return;
            const dayMap = categoryDayBuckets.get(release.categoryName);
            if (!dayMap) return;
            dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + expenseValue);
          });
        });

        releaseKeys.forEach((release) => {
          const dayMap = categoryDayBuckets.get(release.categoryName);
          if (!dayMap) return;
          categoryMap[release.categoryName] = Array.from(dayMap.entries()).map(
            ([key, value]) => ({
              date: new Date(key),
              total: value,
            }),
          );
        });
      }

      setCategoryDaysMap(categoryMap);

      // Buscar dias já confirmados como zero na planilha
      const budget = await budgetServices.getCurrentBudget(user.id);
      const zeroConfirmedDays = new Set<number>(
        (budget?.zeroConfirmedDays || []).map((d) => Number(d)),
      );

      // Anexar informação de confirmação como propriedade extra (opcional)
      const enriched = list.map((it) => ({
        ...it,
        confirmedZero: zeroConfirmedDays.has(it.date.getDate()),
      }));

      setDays(enriched as any);
    } catch (err) {
      console.error(
        "❌ [CONSUMO] Erro ao buscar gastos para Consumo Moderado:",
        err,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

    // Buscar ao montar e sempre que a tela ficar ativa
    if (currentScreen === "ConsumoModerado") {
      fetchMonth();
    }
  }, [user, currentScreen]);

  const [zeroConfirmVisible, setZeroConfirmVisible] = useState(false);
  const [zeroConfirmDate, setZeroConfirmDate] = useState<Date | null>(null);
  const [zeroConfirmDayLabel, setZeroConfirmDayLabel] = useState("");
  const [confirmingZero, setConfirmingZero] = useState(false);

  const handleOpenNoRecordActions = (date: Date) => {
    const label = date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    Alert.alert("Dia sem registro", `Dia ${label} sem gastos registrados.`, [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Registrar gasto",
        onPress: () => {
          // informar origem para que a tela de cadastro saiba para onde voltar
          navigate("AddExpense", {
            prefillDate: date.toISOString(),
            returnTo: "ConsumoModerado",
          });
        },
      },
      {
        text: "Marcar zero na planilha",
        onPress: () => {
          setZeroConfirmDayLabel(label);
          setZeroConfirmDate(date);
          setZeroConfirmVisible(true);
        },
      },
    ]);
  };

  const handleConfirmZero = async () => {
    if (!user?.id || !zeroConfirmDate) {
      setZeroConfirmVisible(false);
      return;
    }

    try {
      setConfirmingZero(true);
      await budgetServices.confirmZeroExpenseDay(user.id, zeroConfirmDate);
      setZeroConfirmVisible(false);
      setZeroConfirmDate(null);
      // Recarregar lista
      fetchMonth();
    } catch (err) {
      console.error("❌ [CONSUMO] Erro ao confirmar zero:", err);
      Alert.alert("Erro", "Não foi possível confirmar o zero agora.");
    } finally {
      setConfirmingZero(false);
    }
  };

  const isCategoryMode = tabReleases.length > 0;
  const activeRelease = tabReleases.find(
    (release) => release.categoryName === activeTabCategory,
  );
  const displayedDays = isCategoryMode
    ? categoryDaysMap[activeTabCategory] || []
    : days;
  const todayKey = getStartOfDay(new Date()).toDateString();
  const spentToday =
    displayedDays.find(
      (day) => getStartOfDay(day.date).toDateString() === todayKey,
    )?.total || 0;
  const currentDailyLimit = activeRelease?.dailyLimit || 0;
  const dailyBalance = currentDailyLimit - spentToday;

  return (
    <Layout title="Consumo Moderado" showBackButton={false} showSidebar={true}>
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
            <Ionicons name="leaf-outline" size={64} color="#8c52ff" />
            <Text style={styles.title}>Consumo Moderado</Text>
            <Text style={styles.subtitle}>
              Acompanhe e gerencie seu consumo de forma consciente
            </Text>
            {cycleLabel ? (
              <Text style={styles.cycleLabel}>{cycleLabel}</Text>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Consumo do ciclo atual</Text>
            {isCategoryMode ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.tabScroll}
                >
                  {tabReleases.map((release) => {
                    const isActive = release.categoryName === activeTabCategory;
                    return (
                      <TouchableOpacity
                        key={release.categoryName}
                        style={[
                          styles.tabChip,
                          isActive && styles.tabChipActive,
                        ]}
                        onPress={() =>
                          setActiveTabCategory(release.categoryName)
                        }
                      >
                        <Text
                          style={[
                            styles.tabChipText,
                            isActive && styles.tabChipTextActive,
                          ]}
                        >
                          {release.categoryName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.dailySummaryCard}>
                  <Text style={styles.dailySummaryTitle}>
                    Meta diária: {formatCurrency(currentDailyLimit)}
                  </Text>
                  <Text style={styles.dailySummaryText}>
                    Consumido hoje: {formatCurrency(spentToday)}
                  </Text>
                  <Text
                    style={[
                      styles.dailySummaryText,
                      dailyBalance >= 0
                        ? styles.dailyBalancePositive
                        : styles.dailyBalanceNegative,
                    ]}
                  >
                    Saldo diário: {formatCurrency(dailyBalance)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyStateText}>
                Seu consultor ainda não liberou categorias para o Consumo
                Moderado específico.
              </Text>
            )}

            {loading ? (
              <ActivityIndicator color="#8c52ff" style={{ marginTop: 12 }} />
            ) : (
              <View style={{ marginTop: 12 }}>
                {displayedDays.map((d: any) => (
                  <View style={styles.dayRow} key={d.date.toDateString()}>
                    <Text style={styles.dayLabel}>
                      {d.date.toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </Text>

                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      {!isCategoryMode && d.total === 0 && !d.confirmedZero ? (
                        <TouchableOpacity
                          onPress={() => handleOpenNoRecordActions(d.date)}
                          style={{ marginRight: 10 }}
                        >
                          <Ionicons
                            name="alert-circle"
                            size={22}
                            color="#ffcc00"
                          />
                        </TouchableOpacity>
                      ) : null}

                      {!isCategoryMode && d.total === 0 && d.confirmedZero ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#4caf50"
                          style={{ marginRight: 8 }}
                        />
                      ) : null}

                      <Text style={styles.dayAmount}>
                        {formatCurrency(d.total)}
                      </Text>
                    </View>
                  </View>
                ))}
                {!displayedDays.length && isCategoryMode ? (
                  <Text style={styles.emptyStateText}>
                    Nenhum gasto encontrado para a categoria selecionada neste
                    ciclo.
                  </Text>
                ) : null}
              </View>
            )}
            <Text style={[styles.cardText, { marginTop: 14 }]}>
              {isCategoryMode
                ? "Os valores acima consideram apenas os gastos da categoria liberada pelo consultor."
                : "Os valores acima foram extraídos dos gastos que você já cadastrou na tela principal."}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
      <ZeroPlanilhaConfirmModal
        visible={zeroConfirmVisible}
        dayLabel={zeroConfirmDayLabel}
        loading={confirmingZero}
        onConfirm={handleConfirmZero}
        onCancel={() => {
          if (confirmingZero) return;
          setZeroConfirmVisible(false);
          setZeroConfirmDate(null);
        }}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  cycleLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#b89aff",
  },
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  tabScroll: {
    marginTop: 4,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: "#3b3b3b",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#121212",
  },
  tabChipActive: {
    borderColor: "#8c52ff",
    backgroundColor: "#2b174d",
  },
  tabChipText: {
    color: "#cfcfcf",
    fontSize: 12,
    fontWeight: "700",
  },
  tabChipTextActive: {
    color: "#fff",
  },
  dailySummaryCard: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#2a2040",
    borderRadius: 10,
    backgroundColor: "#12101d",
    padding: 12,
  },
  dailySummaryTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  dailySummaryText: {
    color: "#c8bfdf",
    fontSize: 13,
    marginBottom: 2,
  },
  dailyBalancePositive: {
    color: "#4caf50",
  },
  dailyBalanceNegative: {
    color: "#ff6666",
  },
  cardText: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  emptyStateText: {
    color: "#999",
    fontSize: 13,
    marginTop: 10,
    lineHeight: 19,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#222",
  },
  dayLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  dayAmount: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ConsumoModeradoScreen;
