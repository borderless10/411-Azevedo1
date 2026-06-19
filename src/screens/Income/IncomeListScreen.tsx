/**
 * Tela de Listagem de Rendas
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { Layout } from "../../components/Layout/Layout";
import { Button } from "../../components/ui/Button/Button";
import { DatePicker } from "../../components/DatePicker";
import incomeServices from "../../services/incomeServices";
import {
  getPlanningCycleLabel,
  planningServices,
} from "../../services/planningServices";
import { Income } from "../../types/income";
import { Planning } from "../../types/planning";
import { formatCurrency } from "../../utils/currencyUtils";
import {
  formatDateForDisplay,
  formatDateToString,
  getEndOfDay,
  getPredefinedPeriodDates,
  getStartOfDay,
} from "../../utils/dateUtils";

type IncomePeriodFilter =
  | "all"
  | "cycle"
  | "this_month"
  | "last_month"
  | "custom";

const resolveFilterDates = (
  filter: IncomePeriodFilter,
  planning: Planning | null,
  customStart: Date,
  customEnd: Date,
): { startDate?: Date; endDate?: Date; label: string } => {
  if (filter === "all") {
    return { label: "Todos os períodos" };
  }

  if (filter === "cycle") {
    const today = new Date();
    const cycleStartDate = planning?.consumoModeradoCycleStartedAt
      ? getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt))
      : null;
    const cycleEndDate = planning?.consumoModeradoCycleEndedAt
      ? getEndOfDay(new Date(planning.consumoModeradoCycleEndedAt))
      : null;

    const startDate = cycleStartDate || getStartOfDay(today);
    const endDate = cycleEndDate || getEndOfDay(today);
    const cycleLabel = getPlanningCycleLabel(planning);

    return {
      startDate,
      endDate,
      label: cycleLabel ? `Ciclo: ${cycleLabel}` : "Ciclo atual",
    };
  }

  if (filter === "this_month") {
    const period = getPredefinedPeriodDates("this_month");
    return {
      startDate: period.startDate,
      endDate: period.endDate,
      label: period.label,
    };
  }

  if (filter === "last_month") {
    const period = getPredefinedPeriodDates("last_month");
    return {
      startDate: period.startDate,
      endDate: period.endDate,
      label: period.label,
    };
  }

  const startDate = getStartOfDay(customStart);
  const endDate = getEndOfDay(customEnd);
  return {
    startDate,
    endDate,
    label: `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`,
  };
};

export const IncomeListScreen = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingIncomeId, setDeletingIncomeId] = useState<string | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [periodFilter, setPeriodFilter] = useState<IncomePeriodFilter>("all");
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [customEndDate, setCustomEndDate] = useState<Date>(() => new Date());
  const [appliedCustomStart, setAppliedCustomStart] = useState<Date>(() => {
    const date = new Date();
    date.setDate(1);
    return date;
  });
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<Date>(
    () => new Date(),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const normalizeSearch = (value: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filteredIncomes = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    if (!query) return incomes;

    return incomes.filter((income) => {
      const searchable = [
        income.description,
        income.category,
        formatCurrency(income.value),
        String(income.value),
        formatDateForDisplay(income.date),
      ]
        .filter(Boolean)
        .join(" ");

      return normalizeSearch(searchable).includes(query);
    });
  }, [incomes, searchQuery]);

  const filteredTotal = useMemo(
    () => filteredIncomes.reduce((acc, income) => acc + income.value, 0),
    [filteredIncomes],
  );

  const hasActiveCycle = Boolean(planning?.consumoModeradoCycleStartedAt);

  const activePeriod = useMemo(
    () =>
      resolveFilterDates(
        periodFilter,
        planning,
        appliedCustomStart,
        appliedCustomEnd,
      ),
    [periodFilter, planning, appliedCustomStart, appliedCustomEnd],
  );

  const loadPlanning = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await planningServices.getPlanning(user.id);
      setPlanning(data);
    } catch (error) {
      console.warn("Erro ao carregar planejamento para filtro de ciclo:", error);
      setPlanning(null);
    }
  }, [user?.id]);

  const loadIncomes = useCallback(async () => {
    if (!user) return;

    try {
      const data = await incomeServices.getIncomes(user.id, {
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate,
      });
      setIncomes(data);
    } catch (error) {
      console.error("❌ Erro ao carregar rendas:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activePeriod.startDate, activePeriod.endDate]);

  useEffect(() => {
    loadPlanning();
  }, [loadPlanning]);

  useEffect(() => {
    setLoading(true);
    loadIncomes();
  }, [loadIncomes]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlanning();
    loadIncomes();
  };

  const handlePeriodFilterChange = (filter: IncomePeriodFilter) => {
    if (filter === "cycle" && !hasActiveCycle) {
      Alert.alert(
        "Ciclo não iniciado",
        "Seu consultor ainda não iniciou um ciclo de consumo moderado.",
      );
      return;
    }

    if (filter === "custom") {
      setCustomStartDate(appliedCustomStart);
      setCustomEndDate(appliedCustomEnd);
      setCustomModalVisible(true);
      return;
    }

    setPeriodFilter(filter);
  };

  const handleApplyCustomDates = () => {
    if (customStartDate > customEndDate) {
      Alert.alert("Datas inválidas", "A data inicial deve ser anterior à final.");
      return;
    }

    setAppliedCustomStart(customStartDate);
    setAppliedCustomEnd(customEndDate);
    setPeriodFilter("custom");
    setCustomModalVisible(false);
  };

  const handleDeleteIncome = (id: string, description: string) => {
    Alert.alert("Excluir renda", `Deseja excluir a renda "${description}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            setDeletingIncomeId(id);
            await incomeServices.deleteIncome(id);
            await loadIncomes();
          } catch (error) {
            console.error("❌ Erro ao excluir renda:", error);
            Alert.alert("Erro", "Não foi possível excluir a renda.");
          } finally {
            setDeletingIncomeId(null);
          }
        },
      },
    ]);
  };

  const groupedByDate = filteredIncomes.reduce(
    (acc, income) => {
      const dateKey = formatDateToString(income.date);
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(income);
      return acc;
    },
    {} as Record<string, Income[]>,
  );

  const groupedEntries = Object.entries(groupedByDate).sort((a, b) =>
    b[0].localeCompare(a[0]),
  );

  const filterOptions: { id: IncomePeriodFilter; label: string }[] = [
    { id: "all", label: "Todos" },
    ...(hasActiveCycle ? [{ id: "cycle" as const, label: "Ciclo" }] : []),
    { id: "this_month", label: "Este mês" },
    { id: "last_month", label: "Mês passado" },
    { id: "custom", label: "Por data" },
  ];

  const renderIncomeItem = (income: Income) => (
    <TouchableOpacity
      key={income.id}
      style={styles.incomeItem}
      onPress={() => navigate("EditIncome", { id: income.id })}
    >
      <View style={styles.incomeItemLeft}>
        <View style={styles.incomeIconContainer}>
          <Ionicons name="cash" size={24} color="#8c52ff" />
        </View>
        <View style={styles.incomeInfo}>
          <Text style={styles.incomeDescription} numberOfLines={1}>
            {income.description}
          </Text>
          <View style={styles.incomeMeta}>
            <Ionicons name="pricetag-outline" size={14} color="#999" />
            <Text style={styles.incomeCategory}>{income.category}</Text>
            <Text style={styles.incomeTime}>
              {formatDateForDisplay(income.date)}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.incomeItemRight}>
        <Text style={styles.incomeValue}>+{formatCurrency(income.value)}</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteIncome(income.id, income.description)}
          disabled={deletingIncomeId === income.id}
        >
          {deletingIncomeId === income.id ? (
            <ActivityIndicator size="small" color="#ff4d6d" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#ff4d6d" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDateGroup = (date: string, dateIncomes: Income[]) => {
    const dayTotal = dateIncomes.reduce((sum, income) => sum + income.value, 0);
    const [year, month, day] = date.split("-").map(Number);
    const displayDate = new Date(year, month - 1, day);

    return (
      <View key={date} style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>
            {formatDateForDisplay(displayDate)}
          </Text>
          <Text style={styles.dateTotal}>+{formatCurrency(dayTotal)}</Text>
        </View>
        <View style={styles.incomeList}>
          {dateIncomes.map(renderIncomeItem)}
        </View>
      </View>
    );
  };

  const layoutProps = {
    title: "Minhas Rendas",
    showBackButton: false,
    showSidebar: true,
  };

  if (loading) {
    return (
      <Layout {...layoutProps}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8c52ff" />
          <Text style={styles.loadingText}>Carregando rendas...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout {...layoutProps}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total Recebido</Text>
              <Text style={styles.totalValue}>{formatCurrency(filteredTotal)}</Text>
              <Text style={styles.totalSubtext}>
                {filteredIncomes.length}{" "}
                {filteredIncomes.length === 1 ? "renda" : "rendas"}
                {searchQuery.trim().length > 0 && incomes.length !== filteredIncomes.length
                  ? ` de ${incomes.length}`
                  : ""}
              </Text>
              <Text style={styles.periodLabel}>{activePeriod.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigate("AddIncome")}
            >
              <Ionicons name="add-circle" size={32} color="#8c52ff" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {filterOptions.map((item) => {
              const active = periodFilter === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.filterChip,
                    active ? styles.filterChipActive : null,
                  ]}
                  onPress={() => handlePeriodFilterChange(item.id)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      active ? styles.filterChipTextActive : null,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por descrição, categoria ou valor..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearSearchButton}
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {incomes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {periodFilter === "all"
                ? "Nenhuma renda ainda"
                : "Nenhuma renda neste período"}
            </Text>
            <Text style={styles.emptySubtext}>
              {periodFilter === "all"
                ? "Comece adicionando sua primeira renda"
                : "Tente outro filtro ou adicione uma nova renda"}
            </Text>
            <Button
              title="Adicionar Renda"
              onPress={() => navigate("AddIncome")}
              variant="primary"
              icon="add"
              style={styles.emptyButton}
            />
          </View>
        ) : filteredIncomes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nenhuma renda encontrada</Text>
            <Text style={styles.emptySubtext}>
              Tente outro termo de busca ou limpe o filtro
            </Text>
            <Button
              title="Limpar busca"
              onPress={() => setSearchQuery("")}
              variant="secondary"
              icon="close"
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#8c52ff"]}
              />
            }
          >
            <View style={styles.content}>
              {groupedEntries.map(([date, dateIncomes]) =>
                renderDateGroup(date, dateIncomes),
              )}
            </View>
          </ScrollView>
        )}
      </View>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filtrar por data</Text>
            <Text style={styles.modalSubtitle}>
              Escolha o intervalo para exibir as rendas
            </Text>

            <DatePicker
              label="Data inicial"
              date={customStartDate}
              onChangeDate={setCustomStartDate}
              maxDate={customEndDate}
            />
            <DatePicker
              label="Data final"
              date={customEndDate}
              onChangeDate={setCustomEndDate}
              minDate={customStartDate}
              maxDate={new Date()}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                onPress={() => setCustomModalVisible(false)}
                variant="secondary"
                icon="close"
                style={styles.modalButton}
              />
              <Button
                title="Aplicar"
                onPress={handleApplyCustomDates}
                variant="primary"
                icon="checkmark"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#ccc",
  },
  header: {
    backgroundColor: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    padding: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8c52ff",
  },
  totalSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  periodLabel: {
    fontSize: 12,
    color: "#a47aff",
    marginTop: 6,
    fontWeight: "600",
  },
  addButton: {
    marginLeft: 16,
  },
  filterRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2b2b2b",
  },
  filterChipActive: {
    backgroundColor: "#8c52ff",
    borderColor: "#8c52ff",
  },
  filterChipText: {
    color: "#ddd",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "#2b2b2b",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#444",
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    paddingVertical: 10,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  dateTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8c52ff",
  },
  incomeList: {
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  incomeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  incomeItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  incomeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a3a1a",
    borderWidth: 1,
    borderColor: "#8c52ff40",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  incomeInfo: {
    flex: 1,
  },
  incomeDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  incomeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  incomeCategory: {
    fontSize: 12,
    color: "#999",
  },
  incomeTime: {
    fontSize: 12,
    color: "#999",
  },
  incomeItemRight: {
    alignItems: "flex-end",
    gap: 8,
    marginLeft: 12,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a1318",
  },
  incomeValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#8c52ff",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ccc",
    marginTop: 24,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginBottom: 32,
  },
  emptyButton: {
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#999",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});

export default IncomeListScreen;
