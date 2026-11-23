import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  buildFollowUpPanelModel,
  FollowUpDrillTarget,
  FollowUpPanelRow,
  FollowUpPanelSection,
  formatFollowUpDifference,
  formatFollowUpPaymentSplit,
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
    options?: { emphasize?: boolean; isDiff?: boolean },
  ) => {
    const emphasize = options?.emphasize;
    const isDiff = options?.isDiff;
    let tone = colors.text;
    if (isDiff) {
      tone =
        Math.abs(value) < 0.005
          ? colors.textSecondary
          : value > 0
            ? "#FF008A"
            : "#4caf50";
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

  const renderRow = (row: FollowUpPanelRow) => (
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
      {renderMoneyCell(row.difference, { isDiff: true })}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.textSecondary}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  const renderSection = (section: FollowUpPanelSection) => (
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
        section.rows.map(renderRow)
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
        })}
        <View style={styles.chevronSpacer} />
      </View>
      {section.id === "gastos" ? (
        <View style={styles.splitSummary}>
          <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>
            Planejado ·{" "}
            {formatFollowUpPaymentSplit(section.plannedSplit) ||
              "Sem split caixa/cartão"}
          </Text>
          <Text style={[styles.splitLabel, { color: colors.textSecondary }]}>
            Efetivo ·{" "}
            {formatFollowUpPaymentSplit(section.actualSplit) ||
              "Sem lançamentos"}
          </Text>
          <Text style={[styles.splitHint, { color: colors.textSecondary }]}>
            Os totais da tabela usam só o caixa no saldo. O cartão aparece aqui
            para acompanhar sem dupla contagem.
          </Text>
        </View>
      ) : null}
    </View>
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
            efetivo nas telas já existentes. Parte no cartão não entra no saldo
            de caixa.
          </Text>

          {renderSection(model.incomeSection)}
          {renderSection(model.expenseSection)}

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
              })}
              <View style={styles.chevronSpacer} />
            </View>
          </View>
        </ScrollView>
      )}
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
  splitSummary: {
    marginTop: 8,
    gap: 4,
  },
  splitLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  splitHint: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 2,
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
});

export default ClientFollowUpPanelScreen;
