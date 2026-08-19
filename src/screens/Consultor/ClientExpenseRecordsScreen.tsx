import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { userService } from "../../services/userServices";
import { expenseServices } from "../../services/expenseServices";
import { planningServices } from "../../services/planningServices";
import {
  listConfirmedZeroDays,
  normalizeTrackedTitleKey,
} from "../../services/budgetServices";
import { Expense } from "../../types/expense";
import { Planning } from "../../types/planning";
import { formatCurrency, getBalanceColor } from "../../utils/currencyUtils";
import { formatDateToString } from "../../utils/dateUtils";
import {
  buildVarianceIndicator,
  computeConsultantScopeDailyMetrics,
  getVarianceColor,
  resolveClientMovementPeriod,
} from "../../utils/consultantClientMetrics";
import {
  CONSULTANT_EXPENSE_SCOPE_LABELS,
  ConsultantExpenseScope,
  filterExpensesByConsultantScope,
  filterTrackedExpensesForTitle,
  getExpenseScopeBadge,
} from "../../utils/expenseScopeUtils";

type ConfirmedZero = {
  dateKey: string;
  source: string;
};

const SCOPE_OPTIONS: ConsultantExpenseScope[] = [
  "all",
  "consumo_moderado",
  "acompanhamento",
  "contas",
  "geral",
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Débito",
  credit_card: "Crédito",
  other: "Outro",
};

const isSameDay = (value: Date | string | undefined, day: Date) => {
  if (!value) return false;
  const date = new Date(value);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
};

export const ClientExpenseRecordsScreen: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const { colors } = useTheme();
  const clientId: string = params?.clientId || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientName, setClientName] = useState("");
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [confirmedZeros, setConfirmedZeros] = useState<ConfirmedZero[]>([]);
  const [scope, setScope] = useState<ConsultantExpenseScope>(
    SCOPE_OPTIONS.includes(params?.scope) ? params.scope : "consumo_moderado",
  );
  const [trackedTitle, setTrackedTitle] = useState<string>(
    String(params?.trackedTitle || ""),
  );
  const [clientViewPickerVisible, setClientViewPickerVisible] = useState(false);

  const movementPeriod = useMemo(
    () => resolveClientMovementPeriod(planning),
    [planning],
  );

  const trackedTitles = useMemo(() => {
    if (!planning) return [] as string[];

    const names = new Set<string>();
    (planning.bills || [])
      .filter((bill) => bill.dailyTracking)
      .forEach((bill) => {
        if (bill.name?.trim()) names.add(bill.name.trim());
      });
    (planning.expectedExpenses || [])
      .filter((item) => item.dailyTracking)
      .forEach((item) => {
        const label = String(item.source || "").trim();
        if (label) names.add(label);
      });

    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [planning]);

  const loadData = useCallback(async () => {
    if (!clientId) return;

    try {
      if (user?.role === "consultor") {
        const client = await userService.getUserById(clientId);
        if (client && (client as any).consultantId !== user.id) {
          navigate("ConsultorHome");
          return;
        }
        setClientName(client?.name || "Cliente");
      } else {
        const client = await userService.getUserById(clientId);
        setClientName(client?.name || "Cliente");
      }

      const plan = await planningServices.getPlanning(clientId);
      setPlanning(plan ?? null);

      const period = resolveClientMovementPeriod(plan ?? null);
      const data = await expenseServices.getExpenses(clientId, {
        startDate: period.start,
        endDate: period.end,
        createdAtFrom: period.createdAtFrom,
      });
      setExpenses(data);

      const titlesByKey: Record<string, string> = {};
      (plan?.bills || [])
        .filter((bill) => bill.dailyTracking)
        .forEach((bill) => {
          const label = bill.name?.trim();
          if (label) titlesByKey[normalizeTrackedTitleKey(label)] = label;
        });
      (plan?.expectedExpenses || [])
        .filter((item) => item.dailyTracking)
        .forEach((item) => {
          const label = String(item.source || "").trim();
          if (label) titlesByKey[normalizeTrackedTitleKey(label)] = label;
        });

      const zeros = await listConfirmedZeroDays(
        clientId,
        period.start,
        period.end,
      );
      const mapped: ConfirmedZero[] = [
        ...zeros.consumoDateKeys.map((dateKey) => ({
          dateKey,
          source: "Consumo Moderado",
        })),
        ...Object.entries(zeros.trackedByTitleKey).flatMap(
          ([titleKey, dateKeys]) =>
            dateKeys.map((dateKey) => ({
              dateKey,
              source: titlesByKey[titleKey] || "Acompanhamento",
            })),
        ),
      ];
      setConfirmedZeros(mapped);
    } catch (error) {
      console.warn("Erro ao carregar registros de gasto do cliente", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, navigate, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (scope !== "acompanhamento") {
      setTrackedTitle("");
    }
  }, [scope]);

  const filteredExpenses = useMemo(() => {
    let result = filterExpensesByConsultantScope(expenses, scope);
    if (scope === "acompanhamento" && trackedTitle) {
      result = filterTrackedExpensesForTitle(result, trackedTitle);
    }
    return result;
  }, [expenses, scope, trackedTitle]);

  const filteredZeros = useMemo(() => {
    if (scope === "contas" || scope === "geral") return [] as ConfirmedZero[];

    return confirmedZeros.filter((zero) => {
      if (scope === "consumo_moderado") {
        return zero.source === "Consumo Moderado";
      }
      if (scope === "acompanhamento") {
        if (zero.source === "Consumo Moderado") return false;
        if (!trackedTitle) return true;
        return (
          normalizeTrackedTitleKey(zero.source) ===
          normalizeTrackedTitleKey(trackedTitle)
        );
      }
      return true;
    });
  }, [confirmedZeros, scope, trackedTitle]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.value, 0),
    [filteredExpenses],
  );

  const dailyMetrics = useMemo(
    () =>
      computeConsultantScopeDailyMetrics(
        planning,
        movementPeriod,
        scope,
        filteredExpenses,
        trackedTitle || undefined,
        filteredZeros.map((zero) => zero.dateKey),
      ),
    [planning, movementPeriod, scope, filteredExpenses, trackedTitle, filteredZeros],
  );

  const totalVariance = useMemo(
    () =>
      buildVarianceIndicator(
        filteredTotal,
        dailyMetrics.plannedBudget > 0 ? dailyMetrics.plannedBudget : undefined,
      ),
    [filteredTotal, dailyMetrics.plannedBudget],
  );

  const includeEmptyDays =
    scope === "all" ||
    scope === "consumo_moderado" ||
    scope === "acompanhamento";

  const daysWithExpenses = useMemo(() => {
    const days: Date[] = [];
    for (
      let cursor = new Date(movementPeriod.start);
      cursor <= movementPeriod.end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      days.push(new Date(cursor));
    }

    return days
      .map((day) => {
        const dateKey = formatDateToString(day);
        const dayExpenses = filteredExpenses.filter((expense) =>
          isSameDay(expense.date, day),
        );
        const dayZeros = filteredZeros.filter((zero) => zero.dateKey === dateKey);
        const isEmpty = dayExpenses.length === 0 && dayZeros.length === 0;
        if (isEmpty && !includeEmptyDays) return null;

        const dayTotal = dayExpenses.reduce(
          (sum, expense) => sum + expense.value,
          0,
        );

        return { day, dayExpenses, dayTotal, zeros: dayZeros, isEmpty };
      })
      .filter(Boolean)
      .reverse() as Array<{
      day: Date;
      dayExpenses: Expense[];
      dayTotal: number;
      zeros: ConfirmedZero[];
      isEmpty: boolean;
    }>;
  }, [filteredExpenses, filteredZeros, includeEmptyDays, movementPeriod]);

  const missingDaysCount = useMemo(
    () => daysWithExpenses.filter((entry) => entry.isEmpty).length,
    [daysWithExpenses],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openClientView = (kind: "consumo" | "acompanhamento", title?: string) => {
    setClientViewPickerVisible(false);
    const returnToParams = {
      clientId,
      scope,
      trackedTitle: title || trackedTitle,
    };

    if (kind === "consumo") {
      navigate("Budget", {
        clientId,
        returnTo: "ClientExpenseRecords",
        returnToParams,
      });
      return;
    }
    if (!title) return;
    navigate("CategoryBudget", {
      clientId,
      trackedTitle: title,
      returnTo: "ClientExpenseRecords",
      returnToParams,
    });
  };

  const handleOpenClientView = () => {
    if (scope === "consumo_moderado") {
      openClientView("consumo");
      return;
    }

    if (scope === "acompanhamento") {
      const title =
        trackedTitle || (trackedTitles.length === 1 ? trackedTitles[0] : "");
      if (title) {
        openClientView("acompanhamento", title);
        return;
      }
    }

    setClientViewPickerVisible(true);
  };

  return (
    <Layout
      title="Registros de Gastos"
      showBackButton
      showSidebar={false}
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <Text style={[styles.clientName, { color: colors.text }]}>
            {clientName}
          </Text>
          <Text style={[styles.periodHint, { color: colors.textSecondary }]}>
            {movementPeriod.label} •{" "}
            {movementPeriod.start.toLocaleDateString("pt-BR")} até{" "}
            {movementPeriod.end.toLocaleDateString("pt-BR")}
          </Text>

          <View
            style={[
              styles.summaryCard,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total vs planejado · {CONSULTANT_EXPENSE_SCOPE_LABELS[scope]}
              {scope === "acompanhamento" && trackedTitle
                ? ` · ${trackedTitle}`
                : ""}
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricBlock}>
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Gasto
                </Text>
                <Text
                  style={[
                    styles.summarySplitValue,
                    {
                      color:
                        totalVariance.status === "unknown"
                          ? colors.text
                          : getVarianceColor(totalVariance.status),
                    },
                  ]}
                >
                  {formatCurrency(filteredTotal)}
                </Text>
              </View>

              <View style={styles.metricBlock}>
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Planejado
                </Text>
                <Text style={[styles.summarySplitValue, { color: colors.text }]}>
                  {dailyMetrics.plannedBudget > 0
                    ? formatCurrency(dailyMetrics.plannedBudget)
                    : "—"}
                </Text>
              </View>
            </View>

            {dailyMetrics.plannedBudget > 0 ? (
              <View
                style={[
                  styles.varianceBadge,
                  { borderColor: getVarianceColor(totalVariance.status) },
                ]}
              >
                <Ionicons
                  name={
                    totalVariance.status === "above"
                      ? "trending-up"
                      : totalVariance.status === "below"
                        ? "trending-down"
                        : "checkmark-circle"
                  }
                  size={14}
                  color={getVarianceColor(totalVariance.status)}
                />
                <Text
                  style={[
                    styles.varianceText,
                    { color: getVarianceColor(totalVariance.status) },
                  ]}
                >
                  {totalVariance.label}
                </Text>
              </View>
            ) : (
              <Text
                style={[styles.summaryCount, { color: colors.textSecondary }]}
              >
                Sem valor planejado para este filtro
              </Text>
            )}

            <Text style={[styles.summaryCount, { color: colors.textSecondary }]}>
              {filteredExpenses.length} registro(s)
              {filteredZeros.length > 0
                ? ` · ${filteredZeros.length} zero(s)`
                : ""}
              {missingDaysCount > 0
                ? ` · ${missingDaysCount} sem registro`
                : ""}
            </Text>
          </View>

          <View
            style={[
              styles.metricsCard,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.metricsTitle, { color: colors.text }]}>
              Média diária
            </Text>
            <Text style={[styles.metricsHint, { color: colors.textSecondary }]}>
              Meta com base em {dailyMetrics.cycleDays} dia(s) do ciclo
            </Text>

            <View style={styles.metricsRow}>
              <View style={styles.metricBlock}>
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Deveria
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {dailyMetrics.idealDailyAverage > 0
                    ? formatCurrency(dailyMetrics.idealDailyAverage)
                    : "—"}
                </Text>
                {dailyMetrics.plannedBudget > 0 ? (
                  <Text
                    style={[
                      styles.metricSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    de {formatCurrency(dailyMetrics.plannedBudget)}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.metricSubtext,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Sem planejamento
                  </Text>
                )}
              </View>

              <View style={styles.metricBlock}>
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Média atual
                </Text>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color:
                        dailyMetrics.actualDailyAverage > 0
                          ? getVarianceColor(dailyMetrics.variance.status)
                          : colors.text,
                    },
                  ]}
                >
                  {dailyMetrics.countedDays > 0
                    ? formatCurrency(dailyMetrics.actualDailyAverage)
                    : "—"}
                </Text>
                <Text
                  style={[styles.metricSubtext, { color: colors.textSecondary }]}
                >
                  {dailyMetrics.countedDays} dia(s) preenchidos
                </Text>
              </View>

              <View style={styles.metricBlock}>
                <Text
                  style={[styles.metricLabel, { color: colors.textSecondary }]}
                >
                  Hoje
                </Text>
                <Text
                  style={[
                    styles.metricValue,
                    {
                      color:
                        dailyMetrics.todaySpent > 0
                          ? getBalanceColor(-dailyMetrics.todaySpent)
                          : colors.text,
                    },
                  ]}
                >
                  {formatCurrency(dailyMetrics.todaySpent)}
                </Text>
                {dailyMetrics.idealDailyAverage > 0 ? (
                  <Text
                    style={[
                      styles.metricSubtext,
                      {
                        color: getVarianceColor(
                          dailyMetrics.todaySpent > dailyMetrics.idealDailyAverage
                            ? "above"
                            : dailyMetrics.todaySpent <
                                dailyMetrics.idealDailyAverage
                              ? "below"
                              : "equal",
                        ),
                      },
                    ]}
                  >
                    {dailyMetrics.todaySpent > dailyMetrics.idealDailyAverage
                      ? `${formatCurrency(
                          dailyMetrics.todaySpent -
                            dailyMetrics.idealDailyAverage,
                        )} acima`
                      : dailyMetrics.todaySpent <
                          dailyMetrics.idealDailyAverage
                        ? `${formatCurrency(
                            dailyMetrics.idealDailyAverage -
                              dailyMetrics.todaySpent,
                          )} abaixo`
                        : "Na meta"}
                  </Text>
                ) : null}
              </View>
            </View>

            {dailyMetrics.idealDailyAverage > 0 &&
            dailyMetrics.countedDays > 0 ? (
              <View
                style={[
                  styles.varianceBadge,
                  { borderColor: getVarianceColor(dailyMetrics.variance.status) },
                ]}
              >
                <Ionicons
                  name={
                    dailyMetrics.variance.status === "above"
                      ? "trending-up"
                      : dailyMetrics.variance.status === "below"
                        ? "trending-down"
                        : "checkmark-circle"
                  }
                  size={14}
                  color={getVarianceColor(dailyMetrics.variance.status)}
                />
                <Text
                  style={[
                    styles.varianceText,
                    { color: getVarianceColor(dailyMetrics.variance.status) },
                  ]}
                >
                  {dailyMetrics.variance.label}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.filterTitle, { color: colors.text }]}>
            Filtrar por tipo
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {SCOPE_OPTIONS.map((option) => {
              const active = scope === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.chip,
                    {
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary : colors.card,
                    },
                  ]}
                  onPress={() => setScope(option)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: active ? "#fff" : colors.text },
                    ]}
                  >
                    {CONSULTANT_EXPENSE_SCOPE_LABELS[option]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {scope === "acompanhamento" && trackedTitles.length > 0 ? (
            <>
              <Text
                style={[styles.filterTitle, { color: colors.text, marginTop: 4 }]}
              >
                Filtrar acompanhamento
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      borderColor: !trackedTitle ? colors.primary : colors.border,
                      backgroundColor: !trackedTitle
                        ? colors.primary
                        : colors.card,
                    },
                  ]}
                  onPress={() => setTrackedTitle("")}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: !trackedTitle ? "#fff" : colors.text },
                    ]}
                  >
                    Todos
                  </Text>
                </TouchableOpacity>
                {trackedTitles.map((title) => {
                  const active = trackedTitle === title;
                  return (
                    <TouchableOpacity
                      key={title}
                      style={[
                        styles.chip,
                        {
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : colors.card,
                        },
                      ]}
                      onPress={() => setTrackedTitle(title)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: active ? "#fff" : colors.text },
                        ]}
                      >
                        {title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <TouchableOpacity
            style={[
              styles.clientViewButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleOpenClientView}
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.clientViewButtonText}>Visão do cliente</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Registros por dia
          </Text>

          {daysWithExpenses.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { borderColor: colors.border, backgroundColor: colors.card },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={28}
                color={colors.textSecondary}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhum gasto ou zero encontrado para este filtro no período.
              </Text>
            </View>
          ) : (
            daysWithExpenses.map(({ day, dayExpenses, dayTotal, zeros, isEmpty }) => (
              <View
                key={day.toISOString()}
                style={[
                  styles.dayCard,
                  {
                    borderColor: isEmpty ? "#ff4d6d" : colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayTitle, { color: colors.text }]}>
                    {day.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.dayTotal,
                      {
                        color: isEmpty
                          ? "#ff4d6d"
                          : zeros.length > 0 && dayExpenses.length === 0
                            ? colors.primary
                            : getBalanceColor(-dayTotal),
                      },
                    ]}
                  >
                    {isEmpty ? "Sem registro" : formatCurrency(dayTotal)}
                  </Text>
                </View>

                {isEmpty ? (
                  <View
                    style={[
                      styles.expenseRow,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="alert-circle"
                        size={16}
                        color="#ff4d6d"
                      />
                      <Text
                        style={[
                          styles.expenseTitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Cliente não registrou gasto nem zero neste dia
                      </Text>
                    </View>
                  </View>
                ) : null}

                {zeros.map((zero) => (
                  <View
                    key={`${zero.dateKey}-${zero.source}`}
                    style={[
                      styles.expenseRow,
                      { borderTopColor: colors.border },
                    ]}
                  >
                    <View style={styles.expenseMain}>
                      <Text style={[styles.expenseTitle, { color: colors.text }]}>
                        Zero confirmado
                      </Text>
                      <View style={styles.metaRow}>
                        <View
                          style={[
                            styles.badge,
                            { backgroundColor: `${colors.primary}22` },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: colors.primary }]}
                          >
                            {zero.source}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text
                      style={[styles.expenseValue, { color: colors.primary }]}
                    >
                      {formatCurrency(0)}
                    </Text>
                  </View>
                ))}

                {dayExpenses.map((expense) => {
                  const badge = getExpenseScopeBadge(expense);
                  const paymentLabel = expense.paymentMethod
                    ? PAYMENT_METHOD_LABELS[expense.paymentMethod] ||
                      expense.paymentMethod
                    : null;

                  return (
                    <View
                      key={expense.id}
                      style={[
                        styles.expenseRow,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <View style={styles.expenseMain}>
                        <Text style={[styles.expenseTitle, { color: colors.text }]}>
                          {expense.description || "Gasto"}
                        </Text>
                        <View style={styles.metaRow}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: `${colors.primary}22` },
                            ]}
                          >
                            <Text
                              style={[styles.badgeText, { color: colors.primary }]}
                            >
                              {badge}
                            </Text>
                          </View>
                          {paymentLabel ? (
                            <Text
                              style={[
                                styles.paymentText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {paymentLabel}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.expenseValue,
                          { color: getBalanceColor(-expense.value) },
                        ]}
                      >
                        {formatCurrency(expense.value)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
        <Modal
          visible={clientViewPickerVisible}
          animationType="fade"
          transparent
        >
          <View
            style={[
              styles.modalOverlay,
              { backgroundColor: "rgba(0,0,0,0.5)" },
            ]}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Visão do cliente
              </Text>
              <Text
                style={[styles.modalHint, { color: colors.textSecondary }]}
              >
                Escolha a tela que o cliente vê no app
              </Text>
              <ScrollView style={styles.clientViewList}>
                <TouchableOpacity
                  style={[
                    styles.clientViewItem,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => openClientView("consumo")}
                >
                  <Text
                    style={[styles.clientViewItemText, { color: colors.text }]}
                  >
                    Consumo Moderado
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {trackedTitles.map((title) => (
                  <TouchableOpacity
                    key={title}
                    style={[
                      styles.clientViewItem,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => openClientView("acompanhamento", title)}
                  >
                    <Text
                      style={[
                        styles.clientViewItemText,
                        { color: colors.text },
                      ]}
                    >
                      {title}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[
                  styles.modalCancelButton,
                  { backgroundColor: colors.border },
                ]}
                onPress={() => setClientViewPickerVisible(false)}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        </>
      )}
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
  },
  periodHint: {
    fontSize: 12,
    marginTop: -4,
  },
  summaryCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summarySplitValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryCount: {
    fontSize: 12,
  },
  metricsCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  metricsTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  metricsHint: {
    fontSize: 11,
    marginTop: -6,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricLabel: {
    fontSize: 11,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  metricSubtext: {
    fontSize: 10,
    lineHeight: 13,
  },
  varianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  varianceText: {
    fontSize: 12,
    fontWeight: "600",
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 24,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
  dayCard: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dayTotal: {
    fontSize: 15,
    fontWeight: "700",
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  expenseMain: {
    flex: 1,
    gap: 6,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  paymentText: {
    fontSize: 11,
  },
  expenseValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  clientViewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  clientViewButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  clientViewList: {
    maxHeight: 280,
    marginBottom: 12,
  },
  clientViewItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  clientViewItemText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalCancelButton: {
    alignSelf: "flex-end",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});
