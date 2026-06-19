import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { userService } from "../../services/userServices";
import chatService from "../../services/chatService";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { expenseServices } from "../../services/expenseServices";
import { incomeServices } from "../../services/incomeServices";
import { planningServices } from "../../services/planningServices";
import { formatCurrency, getBalanceColor } from "../../utils/currencyUtils";
import { useTheme } from "../../contexts/ThemeContext";
import { Planning } from "../../types/planning";
import {
  buildCategoryPlanningComparisons,
  buildVarianceIndicator,
  compareBillPayments,
  computePlannedSpendingSummary,
  countDaysInclusive,
  findPlanningBillForExpense,
  getVarianceColor,
  resolveClientMovementPeriod,
} from "../../utils/consultantClientMetrics";

export const ClientDetail: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const clientId: string = params?.clientId || "";
  const [loading, setLoading] = useState(false);
  const [clientDoc, setClientDoc] = useState<any | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [monthlyIncomes, setMonthlyIncomes] = useState<number>(0);
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [movementPeriodLabel, setMovementPeriodLabel] = useState("Este mês");
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isCompactLayout = screenWidth < 420;
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const insets = useSafeAreaInsets();

  const isSameDay = (a: Date | string, b: Date) => {
    const da = new Date(a);
    return (
      da.getFullYear() === b.getFullYear() &&
      da.getMonth() === b.getMonth() &&
      da.getDate() === b.getDate()
    );
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      Alert.alert("Mensagem vazia", "Escreva uma mensagem antes de enviar.");
      return;
    }
    if (!user?.id || !clientId) return;

    try {
      setSendingMessage(true);
      await chatService.sendDirectMessage(user.id, clientId, trimmed);
      setMessageModalVisible(false);
      setMessageText("");
      Alert.alert("Mensagem enviada", "O cliente será notificado no app.");
    } catch (error: any) {
      console.error("Erro ao enviar mensagem ao cliente:", error);
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível enviar a mensagem agora.",
      );
    } finally {
      setSendingMessage(false);
    }
  };

  useEffect(() => {
    async function load() {
      if (!clientId) return;
      // se o usuário atual for consultor, verificar propriedade do cliente
      try {
        if (user && user.role === "consultor") {
          const client = await userService.getUserById(clientId);
          setClientDoc(client ?? null);
          if (client && (client as any).consultantId !== user.id) {
            navigate("Home");
            return;
          }
        } else {
          // if not a consultant, still try to load client profile for display
          const client = await userService.getUserById(clientId);
          setClientDoc(client ?? null);
        }
      } catch (e) {
        console.warn("Erro na verificação de permissão do consultor", e);
      }
      setLoading(true);
      try {
        const plan = await planningServices.getPlanning(clientId);
        setPlanning(plan ?? null);

        const period = resolveClientMovementPeriod(plan ?? null);
        setMovementPeriodLabel(period.label);

        const monthlyExpensesTotal = await expenseServices.getExpensesTotal(
          clientId,
          period.start,
          period.end,
        );
        const monthlyIncomesTotal = await incomeServices.getIncomesTotal(
          clientId,
          period.start,
          period.end,
        );

        const ex = await expenseServices.getExpenses(clientId, {
          startDate: period.start,
          endDate: period.end,
        });
        const inc = await incomeServices.getIncomes(clientId, {
          startDate: period.start,
          endDate: period.end,
        });
        setExpenses(ex);
        setIncomes(inc);

        setMonthlyExpenses(monthlyExpensesTotal);
        setMonthlyIncomes(monthlyIncomesTotal);

        try {
          const grouped = await expenseServices.getExpensesGroupedByCategory(
            clientId,
            period.start,
            period.end,
          );
          setExpensesByCategory(grouped);
        } catch (e) {
          console.warn("Erro ao agrupar gastos por categoria", e);
        }
      } catch (e) {
        console.warn("Erro ao carregar dados do cliente", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  const movementPeriod = useMemo(
    () => resolveClientMovementPeriod(planning),
    [planning],
  );

  const plannedSummary = useMemo(
    () => computePlannedSpendingSummary(planning, movementPeriod),
    [planning, movementPeriod],
  );

  const billPaymentComparisons = useMemo(
    () => compareBillPayments(planning, expenses, movementPeriod),
    [planning, expenses, movementPeriod],
  );

  const periodDayCount = useMemo(
    () => countDaysInclusive(movementPeriod.start, movementPeriod.end),
    [movementPeriod],
  );

  const actualDailyAverage = useMemo(
    () => (periodDayCount > 0 ? monthlyExpenses / periodDayCount : 0),
    [monthlyExpenses, periodDayCount],
  );

  const totalVariance = useMemo(
    () => buildVarianceIndicator(monthlyExpenses, plannedSummary?.totalPlanned),
    [monthlyExpenses, plannedSummary],
  );

  const dailyVariance = useMemo(
    () =>
      buildVarianceIndicator(
        actualDailyAverage,
        plannedSummary?.plannedDailyAverage,
      ),
    [actualDailyAverage, plannedSummary],
  );

  const categoryComparisons = useMemo(
    () =>
      buildCategoryPlanningComparisons(
        planning,
        plannedSummary,
        expensesByCategory,
      ),
    [planning, plannedSummary, expensesByCategory],
  );

  const renderVarianceBadge = (
    variance: ReturnType<typeof buildVarianceIndicator>,
  ) => (
    <View
      style={[
        styles.varianceBadge,
        isCompactLayout && styles.varianceBadgeCompact,
        { borderColor: getVarianceColor(variance.status) },
      ]}
    >
      <Ionicons
        name={
          variance.status === "above"
            ? "trending-up"
            : variance.status === "below"
              ? "trending-down"
              : variance.status === "equal"
                ? "checkmark-circle"
                : "help-circle"
        }
        size={14}
        color={getVarianceColor(variance.status)}
        style={styles.varianceBadgeIcon}
      />
      <Text
        style={[
          styles.varianceBadgeText,
          isCompactLayout && styles.varianceBadgeTextCompact,
          { color: getVarianceColor(variance.status) },
        ]}
      >
        {variance.label}
      </Text>
    </View>
  );

  // totals (all-time as fallback for lists)
  const balanceMonth = monthlyIncomes - monthlyExpenses;

  return (
    <Layout title="Dados do Cliente" showBackButton={true} showSidebar={false}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 16 + insets.bottom + 96,
        }}
      >
        <Text style={[styles.heading, { color: colors.text }]}>
          Visão Geral
        </Text>
        <View style={styles.actionColumn}>
          <TouchableOpacity
            style={[
              styles.actionButtonFull,
              { backgroundColor: colors.primary },
            ]}
            onPress={() => navigate("ClientPlanning", { clientId })}
          >
            <Text style={styles.actionButtonText}>Abrir Planejamento</Text>
          </TouchableOpacity>

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("ClientExpenseRecords", { clientId })}
            >
              <Text style={styles.actionButtonText}>Registros de Gastos</Text>
            </TouchableOpacity>
          )}

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Bills", { clientId })}
            >
              <Text style={styles.actionButtonText}>Contas a Pagar</Text>
            </TouchableOpacity>
          )}

          {clientDoc?.role === "cliente_premium" && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() =>
                navigate(
                  user && user.role === "consultor"
                    ? "ClientInvestments"
                    : "ClientInvestmentsView",
                  { clientId },
                )
              }
            >
              <Text style={styles.actionButtonText}>Investimentos</Text>
            </TouchableOpacity>
          )}

          {clientDoc?.role === "cliente_premium" && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Metas", { clientId })}
            >
              <Text style={styles.actionButtonText}>Metas</Text>
            </TouchableOpacity>
          )}
          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Wishlist", { clientId })}
            >
              <Text style={styles.actionButtonText}>Lista de Desejos</Text>
            </TouchableOpacity>
          )}

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Recomendacao", { clientId })}
            >
              <Text style={styles.actionButtonText}>Recomendações</Text>
            </TouchableOpacity>
          )}

          {clientDoc && (
            <TouchableOpacity
              style={[
                styles.actionButtonFull,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => navigate("Cartoes", { clientId })}
            >
              <Text style={styles.actionButtonText}>Cartões</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.row, { borderColor: colors.border }]}>
          <View style={[styles.col, isCompactLayout && styles.colCompact]}>
            <Text
              style={[
                styles.label,
                isCompactLayout && styles.labelCompact,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              Gastos ({movementPeriodLabel.toLowerCase()})
            </Text>
            <Text
              style={[
                styles.value,
                isCompactLayout && styles.valueCompact,
                { color: colors.text },
              ]}
            >
              {formatCurrency(monthlyExpenses)}
            </Text>
          </View>
          <View style={[styles.col, isCompactLayout && styles.colCompact]}>
            <Text
              style={[
                styles.label,
                isCompactLayout && styles.labelCompact,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              Renda ({movementPeriodLabel.toLowerCase()})
            </Text>
            <Text
              style={[
                styles.value,
                isCompactLayout && styles.valueCompact,
                { color: colors.text },
              ]}
            >
              {formatCurrency(monthlyIncomes)}
            </Text>
          </View>
          <View style={[styles.col, isCompactLayout && styles.colCompact]}>
            <Text
              style={[
                styles.label,
                isCompactLayout && styles.labelCompact,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              Saldo ({movementPeriodLabel.toLowerCase()})
            </Text>
            <Text
              style={[
                styles.value,
                isCompactLayout && styles.valueCompact,
                { color: getBalanceColor(balanceMonth) },
              ]}
            >
              {formatCurrency(balanceMonth)}
            </Text>
          </View>
        </View>

        {plannedSummary ? (
          <View style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Text style={[styles.summaryCardTitle, { color: colors.text }]}>
              Comparativo com planejamento
            </Text>
            <Text style={[styles.summaryCardSubtitle, { color: colors.textSecondary }]}>
              Período: {movementPeriodLabel}
            </Text>

            <View
              style={[
                styles.metricRow,
                isCompactLayout && styles.metricRowCompact,
              ]}
            >
              <View
                style={[
                  styles.metricBlock,
                  isCompactLayout && styles.metricBlockCompact,
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Gasto total
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatCurrency(monthlyExpenses)}
                </Text>
                <Text style={[styles.metricPlanned, { color: colors.textSecondary }]}>
                  Planejado: {formatCurrency(plannedSummary.totalPlanned)}
                </Text>
                {renderVarianceBadge(totalVariance)}
              </View>

              <View
                style={[
                  styles.metricBlock,
                  isCompactLayout && styles.metricBlockCompact,
                ]}
              >
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Média diária
                </Text>
                <Text style={[styles.metricValue, { color: colors.text }]}>
                  {formatCurrency(actualDailyAverage)}
                </Text>
                <Text style={[styles.metricPlanned, { color: colors.textSecondary }]}>
                  Planejado: {formatCurrency(plannedSummary.plannedDailyAverage)}
                </Text>
                {renderVarianceBadge(dailyVariance)}
              </View>
            </View>
          </View>
        ) : null}

        <Text style={[styles.subheading, { color: colors.text }]}>
          Movimentações do mês
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          {movementPeriodLabel} • {periodDayCount} dia(s) no período
        </Text>

        {billPaymentComparisons.length > 0 ? (
          <>
            <Text
              style={[styles.subheading, { color: colors.text, marginTop: 12 }]}
            >
              Contas pagas vs planejado
            </Text>
            {billPaymentComparisons.map((payment) => {
              const paymentVariance = buildVarianceIndicator(
                payment.paidAmount,
                payment.plannedAmount > 0 ? payment.plannedAmount : undefined,
              );

              return (
                <View
                  key={payment.expenseId}
                  style={[styles.item, { borderColor: colors.border }]}
                >
                  <View style={styles.comparisonHeader}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {payment.billName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {payment.paymentDate.toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <View style={styles.comparisonValues}>
                    <View>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Planejado
                      </Text>
                      <Text style={{ color: colors.text, fontWeight: "700" }}>
                        {payment.plannedAmount > 0
                          ? formatCurrency(payment.plannedAmount)
                          : "—"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Ionicons
                        name={
                          payment.matchesPlan
                            ? "checkmark-circle"
                            : paymentVariance.status === "above"
                              ? "arrow-up-circle"
                              : "arrow-down-circle"
                        }
                        size={20}
                        color={getVarianceColor(paymentVariance.status)}
                      />
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        Pago
                      </Text>
                      <Text
                        style={{
                          color: getVarianceColor(paymentVariance.status),
                          fontWeight: "700",
                        }}
                      >
                        {formatCurrency(payment.paidAmount)}
                      </Text>
                    </View>
                  </View>
                  {payment.plannedAmount > 0 ? (
                    renderVarianceBadge(paymentVariance)
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      Conta sem valor planejado cadastrado
                    </Text>
                  )}
                </View>
              );
            })}
          </>
        ) : null}

        <Text
          style={[styles.subheading, { color: colors.text, marginTop: 12 }]}
        >
          Comparação por categoria
        </Text>
        <View style={{ marginBottom: 12 }}>
          {categoryComparisons.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              Sem dados para comparar
            </Text>
          ) : (
            categoryComparisons.map(({ category, actual, planned, variance }) => {
              const statusColor = getVarianceColor(variance.status);

              return (
                <View
                  key={category}
                  style={[
                    styles.item,
                    isCompactLayout && styles.itemCompact,
                    {
                      borderColor: colors.border,
                      flexDirection: isCompactLayout ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isCompactLayout ? "stretch" : "center",
                    },
                  ]}
                >
                  <View style={isCompactLayout ? styles.itemContentCompact : undefined}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>
                      {category}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {planned !== undefined && planned > 0
                        ? `Planejado: ${formatCurrency(planned)}`
                        : "Sem planejamento"}
                    </Text>
                  </View>
                  <View
                    style={
                      isCompactLayout
                        ? styles.itemValuesCompact
                        : { alignItems: "flex-end" }
                    }
                  >
                    <Text style={{ color: statusColor, fontWeight: "700" }}>
                      {formatCurrency(actual)}
                    </Text>
                    {planned !== undefined && planned > 0 ? (
                      <Text
                        style={{ color: colors.textSecondary, fontSize: 12 }}
                      >
                        {variance.label}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
        {/* Render each day of the month that has any movement */}
        {(() => {
          const days: Date[] = [];
          for (
            let d = new Date(movementPeriod.start);
            d <= movementPeriod.end;
            d.setDate(d.getDate() + 1)
          ) {
            days.push(new Date(d));
          }

          const rendered = days.map((day) => {
            const dayExpenses = expenses.filter((e) =>
              isSameDay(e.date || e.createdAt || e, day),
            );
            const dayIncomes = incomes.filter((i) =>
              isSameDay(i.date || i.createdAt || i, day),
            );

            if (dayExpenses.length === 0 && dayIncomes.length === 0)
              return null;

            return (
              <View
                key={day.toISOString()}
                style={[styles.item, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {day.toLocaleDateString()}
                </Text>
                {dayIncomes.map((inc: any) => (
                  <View
                    key={`inc-${inc.id}`}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 6,
                    }}
                  >
                    <Text style={{ color: colors.text }}>
                      {inc.description || "Renda"}
                    </Text>
                    <Text style={{ color: getBalanceColor(inc.value) }}>
                      {formatCurrency(inc.value)}
                    </Text>
                  </View>
                ))}
                {dayExpenses.map((exp: any) => {
                  const linkedBill = findPlanningBillForExpense(exp, planning);
                  const plannedBillAmount = linkedBill
                    ? Number(linkedBill.amount) || 0
                    : 0;
                  const paymentVariance =
                    plannedBillAmount > 0
                      ? buildVarianceIndicator(exp.value, plannedBillAmount)
                      : null;

                  return (
                    <View key={`exp-${exp.id}`} style={{ marginTop: 6 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={{ color: colors.text, flex: 1 }}>
                          {exp.description || "Gasto"}
                        </Text>
                        <Text style={{ color: getBalanceColor(-exp.value) }}>
                          {formatCurrency(exp.value)}
                        </Text>
                      </View>
                      {linkedBill && plannedBillAmount > 0 ? (
                        <Text
                          style={{
                            color: getVarianceColor(
                              paymentVariance?.status || "unknown",
                            ),
                            fontSize: 12,
                            marginTop: 2,
                          }}
                        >
                          Conta planejada: {formatCurrency(plannedBillAmount)} •{" "}
                          {paymentVariance?.label}
                        </Text>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          });

          return rendered.filter(Boolean).length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>
              Sem movimentações neste período
            </Text>
          ) : (
            rendered
          );
        })()}
      </ScrollView>

      {/* Message Modal (frontend placeholder) */}
      <Modal visible={messageModalVisible} animationType="slide" transparent>
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enviar mensagem ao cliente
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { backgroundColor: colors.inputBackground, color: colors.text },
              ]}
              placeholder="Escreva sua mensagem..."
              placeholderTextColor={colors.placeholder}
              multiline
              value={messageText}
              onChangeText={setMessageText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#ccc" }]}
                onPress={() => {
                  if (sendingMessage) return;
                  setMessageModalVisible(false);
                  setMessageText("");
                }}
                disabled={sendingMessage}
              >
                <Text>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#8c52ff" }]}
                onPress={handleSendMessage}
                disabled={sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff" }}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom action: Enviar mensagem */}
      <View
        style={[
          styles.bottomContainer,
          { backgroundColor: "transparent", bottom: 16 + insets.bottom },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[
            styles.sendMessageButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => setMessageModalVisible(true)}
        >
          <Text style={styles.sendMessageText}>Enviar mensagem ao cliente</Text>
        </TouchableOpacity>
      </View>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  actionColumn: { flexDirection: "column", marginBottom: 12 },
  actionButtonFull: {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  actionButtonText: { color: "#fff", fontWeight: "700" },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  col: { flex: 1, alignItems: "center", paddingHorizontal: 4, minWidth: 0 },
  colCompact: {
    paddingHorizontal: 2,
  },
  label: { fontSize: 12, textAlign: "center" },
  labelCompact: { fontSize: 10, lineHeight: 13 },
  value: { fontSize: 16, fontWeight: "700", marginTop: 6, textAlign: "center" },
  valueCompact: { fontSize: 14, marginTop: 4 },
  item: { padding: 10, borderWidth: 1, borderRadius: 8, marginBottom: 8 },
  itemCompact: { padding: 12, gap: 8 },
  itemContentCompact: { gap: 2 },
  itemValuesCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  summaryCard: {
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  summaryCardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryCardSubtitle: {
    fontSize: 12,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricRowCompact: {
    flexDirection: "column",
    gap: 12,
  },
  metricBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  metricBlockCompact: {
    flex: 0,
    width: "100%",
  },
  metricLabel: {
    fontSize: 12,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  metricPlanned: {
    fontSize: 12,
  },
  varianceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  varianceBadgeCompact: {
    alignSelf: "stretch",
    flexWrap: "wrap",
  },
  varianceBadgeIcon: {
    flexShrink: 0,
  },
  varianceBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    flexShrink: 1,
  },
  varianceBadgeTextCompact: {
    flex: 1,
    lineHeight: 15,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  comparisonValues: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bottomContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 1200,
    alignItems: "center",
  },
  sendMessageButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  sendMessageText: { color: "#fff", fontWeight: "700" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalContent: { width: "90%", borderRadius: 12, padding: 12, borderWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  modalInput: { minHeight: 100, padding: 8, borderRadius: 8, marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
});

export default ClientDetail;
