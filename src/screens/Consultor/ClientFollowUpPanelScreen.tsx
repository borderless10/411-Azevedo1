import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useNavigation } from "../../routes/NavigationContext";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../contexts/ThemeContext";
import { userService } from "../../services/userServices";
import { planningServices } from "../../services/planningServices";
import { expenseServices } from "../../services/expenseServices";
import { incomeServices } from "../../services/incomeServices";
import { Planning } from "../../types/planning";
import { Expense } from "../../types/expense";
import { Income } from "../../types/income";
import { formatCurrency } from "../../utils/currencyUtils";
import { profileDisplayName } from "../../utils/chatDisplayNames";
import { resolveClientMovementPeriod } from "../../utils/consultantClientMetrics";
import {
  buildFollowUpCardBreakdown,
  buildFollowUpPanelModel,
  FollowUpDrillTarget,
  FollowUpPanelRow,
  FollowUpPanelSection,
  formatFollowUpDifference,
} from "../../utils/followUpPanelMetrics";
import { formatDateForDisplay } from "../../utils/dateUtils";

export const ClientFollowUpPanelScreen: React.FC = () => {
  const { params, navigate } = useNavigation() as any;
  const { user } = useAuth();
  const { colors } = useTheme();
  const clientId: string = params?.clientId || "";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clientName, setClientName] = useState("");
  const [planning, setPlanning] = useState<Planning | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [cardModalVisible, setCardModalVisible] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      if (user?.role === "consultor") {
        const client = await userService.getUserById(clientId);
        if (client && (client as any).consultantId !== user.id) {
          navigate("Home");
          return;
        }
        setClientName(profileDisplayName(client, "Cliente"));
      } else {
        const client = await userService.getUserById(clientId);
        setClientName(profileDisplayName(client, "Cliente"));
      }

      const plan = await planningServices.getPlanning(clientId);
      setPlanning(plan ?? null);
      const period = resolveClientMovementPeriod(plan ?? null);

      const [ex, inc] = await Promise.all([
        expenseServices.getExpenses(clientId, {
          startDate: period.start,
          endDate: period.end,
          createdAtFrom: period.createdAtFrom,
        }),
        incomeServices.getIncomes(clientId, {
          startDate: period.start,
          endDate: period.end,
          createdAtFrom: period.createdAtFrom,
        }),
      ]);
      setExpenses(ex);
      setIncomes(inc);
    } catch (error) {
      console.warn("[FOLLOW-UP PANEL] Erro ao carregar", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, navigate, user?.id, user?.role]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const period = useMemo(
    () => resolveClientMovementPeriod(planning),
    [planning],
  );

  const model = useMemo(
    () => buildFollowUpPanelModel(planning, expenses, incomes, period),
    [planning, expenses, incomes, period],
  );

  const cardBreakdown = useMemo(
    () => buildFollowUpCardBreakdown(expenses, period),
    [expenses, period],
  );

  const openDrill = (drill: FollowUpDrillTarget) => {
    const base = {
      clientId,
      returnTo: "ClientFollowUpPanel",
      returnToParams: { clientId },
    };
    switch (drill.screen) {
      case "Budget":
        navigate("Budget", base);
        return;
      case "Bills":
        navigate("Bills", base);
        return;
      case "IncomeList":
        navigate("IncomeList", base);
        return;
      case "ClientIncomeRecords":
        navigate("ClientIncomeRecords", base);
        return;
      case "ClientExpenseRecords":
        navigate("ClientExpenseRecords", {
          ...base,
          scope: drill.scope,
          trackedTitle: drill.trackedTitle,
        });
        return;
      default:
        return;
    }
  };

  const renderMoneyCell = (
    value: number,
    options?: {
      emphasize?: boolean;
      isDiff?: boolean;
      /** Renda/saldo: positivo = bom (verde). Gasto: positivo = ruim (vermelho). */
      goodWhenPositive?: boolean;
    },
  ) => {
    const emphasize = options?.emphasize;
    const isDiff = options?.isDiff;
    const goodWhenPositive = Boolean(options?.goodWhenPositive);
    let tone = colors.text;
    if (isDiff) {
      if (Math.abs(value) < 0.005) {
        tone = colors.textSecondary;
      } else if (value > 0) {
        tone = goodWhenPositive ? "#4caf50" : "#FF008A";
      } else {
        tone = goodWhenPositive ? "#FF008A" : "#4caf50";
      }
    }
    return (
      <View style={styles.colMoney}>
        <Text
          style={[
            styles.money,
            emphasize && styles.moneyEmphasize,
            { color: tone },
          ]}
          numberOfLines={2}
        >
          {isDiff ? formatFollowUpDifference(value) : formatCurrency(value)}
        </Text>
      </View>
    );
  };

  const renderHeaderRow = () => (
    <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
      <View style={styles.colCategory}>
        <Text style={[styles.headerText, { color: colors.textSecondary }]}>
          Categoria
        </Text>
      </View>
      <View style={styles.colMoney}>
        <Text style={[styles.headerText, styles.moneyHeader, { color: colors.textSecondary }]}>
          Planejado
        </Text>
      </View>
      <View style={styles.colMoney}>
        <Text style={[styles.headerText, styles.moneyHeader, { color: colors.textSecondary }]}>
          Efetivo
        </Text>
      </View>
      <View style={styles.colMoney}>
        <Text style={[styles.headerText, styles.moneyHeader, { color: colors.textSecondary }]}>
          Diferença
        </Text>
      </View>
      <View style={styles.chevronSpacer} />
    </View>
  );

  const renderRow = (
    row: FollowUpPanelRow,
    options?: { goodWhenPositive?: boolean },
  ) => (
    <TouchableOpacity
      key={row.id}
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={() => openDrill(row.drill)}
      activeOpacity={0.7}
    >
      <View style={styles.colCategory}>
        <Text style={[styles.rowLabel, { color: colors.text }]} numberOfLines={2}>
          {row.label}
        </Text>
        {row.cardHint ? (
          <Text
            style={[styles.cardHint, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {row.cardHint}
          </Text>
        ) : null}
      </View>
      {renderMoneyCell(row.planned)}
      {renderMoneyCell(row.actual)}
      {renderMoneyCell(row.difference, {
        isDiff: true,
        goodWhenPositive: options?.goodWhenPositive,
      })}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const renderSection = (section: FollowUpPanelSection) => {
    const incomeTone = section.id === "rendas";
    return (
      <View
        key={section.id}
        style={[styles.sectionCard, { borderColor: colors.border, backgroundColor: colors.card }]}
      >
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>
          {section.title}
        </Text>
        {renderHeaderRow()}
        {section.rows.length === 0 ? (
          <Text style={[styles.emptyRows, { color: colors.textSecondary }]}>
            Sem itens no planejamento.
          </Text>
        ) : (
          section.rows.map((row) =>
            renderRow(row, { goodWhenPositive: incomeTone }),
          )
        )}
        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <View style={styles.colCategory}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total de {section.id === "rendas" ? "rendas" : "gastos"}
            </Text>
          </View>
          {renderMoneyCell(section.totalPlanned, { emphasize: true })}
          {renderMoneyCell(section.totalActual, { emphasize: true })}
          {renderMoneyCell(section.totalDifference, {
            emphasize: true,
            isDiff: true,
            goodWhenPositive: incomeTone,
          })}
          <View style={styles.chevronSpacer} />
        </View>
      </View>
    );
  };

  const renderCardSummary = () => {
    const { cardSummary } = model;
    const hasCard =
      Math.abs(cardSummary.planned) > 0.005 ||
      Math.abs(cardSummary.actual) > 0.005;
    if (!hasCard) return null;

    return (
      <TouchableOpacity
        style={[
          styles.cardSection,
          { borderColor: colors.primary, backgroundColor: colors.card },
        ]}
        onPress={() => setCardModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={styles.cardSectionHeader}>
          <Ionicons name="card-outline" size={18} color={colors.primary} />
          <Text style={[styles.sectionTitle, styles.cardSectionTitle, { color: colors.primary }]}>
            GASTOS NO CARTÃO
          </Text>
        </View>
        <Text style={[styles.cardSectionHint, { color: colors.textSecondary }]}>
          Separado do caixa. Toque para ver por categoria.
        </Text>
        {renderHeaderRow()}
        <View style={styles.balanceRow}>
          <View style={styles.colCategory}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total no cartão
            </Text>
          </View>
          {renderMoneyCell(cardSummary.planned, { emphasize: true })}
          {renderMoneyCell(cardSummary.actual, { emphasize: true })}
          {renderMoneyCell(cardSummary.difference, {
            emphasize: true,
            isDiff: true,
          })}
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.textSecondary}
            style={styles.chevron}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderCardExpensesModal = () => (
    <Modal
      visible={cardModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setCardModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Gastos no cartão
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {clientName || "Cliente"} · {model.period.label}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setCardModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.modalTotalBar,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTotalLabel, { color: colors.textSecondary }]}>
              Total efetivo no período
            </Text>
            <Text style={[styles.modalTotalValue, { color: colors.primary }]}>
              {formatCurrency(cardBreakdown.total)}
            </Text>
          </View>

          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {cardBreakdown.categories.length === 0 ? (
              <Text style={[styles.emptyRows, { color: colors.textSecondary }]}>
                Nenhum lançamento no cartão neste período.
              </Text>
            ) : (
              cardBreakdown.categories.map((group) => (
                <View
                  key={group.category}
                  style={[
                    styles.categoryBlock,
                    { borderColor: colors.border },
                  ]}
                >
                  <View style={styles.categoryHeader}>
                    <Text
                      style={[styles.categoryTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {group.category}
                    </Text>
                    <Text
                      style={[styles.categoryTotal, { color: colors.primary }]}
                    >
                      {formatCurrency(group.total)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {group.items.length}{" "}
                    {group.items.length === 1 ? "lançamento" : "lançamentos"}
                  </Text>
                  {group.items.map((item) => (
                    <View
                      key={item.id}
                      style={[
                        styles.cardExpenseRow,
                        { borderTopColor: colors.border },
                      ]}
                    >
                      <View style={styles.cardExpenseMain}>
                        <Text
                          style={[styles.cardExpenseDesc, { color: colors.text }]}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                        <Text
                          style={[
                            styles.cardExpenseMeta,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {formatDateForDisplay(item.date)} · {item.paymentLabel}
                          {item.cardLast4 ? ` · final ${item.cardLast4}` : ""}
                        </Text>
                        {item.scopeLabel ? (
                          <Text
                            style={[
                              styles.cardExpenseScope,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.scopeLabel}
                          </Text>
                        ) : null}
                      </View>
                      <Text
                        style={[
                          styles.cardExpenseValue,
                          { color: colors.text },
                        ]}
                      >
                        {formatCurrency(item.value)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.modalCloseBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCardModalVisible(false)}
          >
            <Text style={styles.modalCloseBtnText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (!clientId) {
    return (
      <Layout title="Acompanhamento financeiro" showBackButton showSidebar={false}>
        <View style={styles.center}>
          <Text style={{ color: colors.text }}>Cliente não informado.</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      title="Acompanhamento financeiro"
      showBackButton
      showSidebar={false}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor={colors.primary}
            />
          }
        >
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            VISÃO | Acompanhamento financeiro
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {clientName || "Cliente"} · {model.period.label}
          </Text>
          <Text style={[styles.periodHint, { color: colors.textSecondary }]}>
            {formatDateForDisplay(model.period.start)} a{" "}
            {formatDateForDisplay(model.period.end)}
          </Text>
          <Text style={[styles.legend, { color: colors.textSecondary }]}>
            Planejado é só leitura. Toque numa linha para ver ou corrigir o
            efetivo. Gastos de caixa e cartão ficam em cards separados.
          </Text>

          {renderSection(model.incomeSection)}
          {renderSection(model.expenseSection)}
          {renderCardSummary()}

          <View
            style={[
              styles.balanceCard,
              { borderColor: colors.primary, backgroundColor: colors.card },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              SALDO FINANCEIRO
            </Text>
            {renderHeaderRow()}
            <View style={styles.balanceRow}>
              <View style={styles.colCategory}>
                <Text style={[styles.totalLabel, { color: colors.text }]}>
                  Saldo (caixa)
                </Text>
              </View>
              {renderMoneyCell(model.balancePlanned, { emphasize: true })}
              {renderMoneyCell(model.balanceActual, { emphasize: true })}
              {renderMoneyCell(model.balanceDifference, {
                emphasize: true,
                isDiff: true,
                goodWhenPositive: true,
              })}
              <View style={styles.chevronSpacer} />
            </View>
          </View>
        </ScrollView>
      )}
      {renderCardExpensesModal()}
    </Layout>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  periodHint: {
    fontSize: 12,
    marginTop: 2,
  },
  legend: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 4,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  balanceCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  cardSection: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  cardSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardSectionTitle: {
    marginBottom: 0,
  },
  cardSectionHint: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
  },
  moneyHeader: {
    textAlign: "center",
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  colCategory: {
    flex: 1.2,
    minWidth: 88,
    paddingRight: 4,
  },
  colMoney: {
    width: 78,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardHint: {
    fontSize: 10,
    marginTop: 2,
    lineHeight: 13,
  },
  money: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  moneyEmphasize: {
    fontWeight: "800",
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  emptyRows: {
    fontSize: 12,
    paddingVertical: 10,
  },
  chevron: {
    marginLeft: 2,
    width: 16,
  },
  chevronSpacer: {
    width: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalTotalBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalTotalLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalTotalValue: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 8,
    gap: 10,
  },
  categoryBlock: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
  },
  categoryTotal: {
    fontSize: 14,
    fontWeight: "800",
  },
  categoryCount: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  cardExpenseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardExpenseMain: {
    flex: 1,
  },
  cardExpenseDesc: {
    fontSize: 13,
    fontWeight: "600",
  },
  cardExpenseMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  cardExpenseScope: {
    fontSize: 10,
    marginTop: 2,
  },
  cardExpenseValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  modalCloseBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});

export default ClientFollowUpPanelScreen;
