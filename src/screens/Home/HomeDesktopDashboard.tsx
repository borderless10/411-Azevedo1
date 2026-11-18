/**
 * Composição desktop da Home — software financeiro, não mobile ampliado.
 * Sem CardWaveBg/PNG; KPIs em grid; transações em tabela.
 */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DesktopGlowCard } from "../../components/ui/DesktopGlowCard";
import MaskedAmount from "../../components/ui/MaskedAmount";
import {
  PieChart,
  DesktopEvolutionChart,
  type LineChartData,
} from "../../components/Charts";
import { desktop } from "../../theme/desktopTokens";
import { premium } from "../../theme/visaoPremium";
import type { Income } from "../../types/income";
import type { Expense } from "../../types/expense";
import { incomeTransactionLabel } from "../../utils/incomeEntry";
import { formatCurrency } from "../../utils/currencyUtils";
import { formatDateForDisplay } from "../../utils/dateUtils";
import {
  getExpenseScopeLabel,
  shouldShowExpenseCategoryTag,
} from "../../utils/expenseScopeUtils";

type Tx = { item: Income | Expense; type: "income" | "expense" };

type Props = {
  displayName: string;
  showValues: boolean;
  onToggleValues: () => void;
  activePeriodLabel: string;
  expectedIncomes: number | null;
  expectedExpenses: number | null;
  expectedSavings: number | null;
  totalIncome: number;
  realizedExpenseTotal: number;
  realizedBalance: number;
  isStaff: boolean;
  onOpenPlanning: () => void;
  onOpenBudget: () => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onIncomeList: () => void;
  onExpenseList: () => void;
  onShowSavingsHelp: () => void;
  consumo: {
    label: string;
    detail: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
    actualDailyAverage: number;
    idealDailyAverage: number;
  } | null;
  pieData: {
    category: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  lineData: LineChartData[];
  filterType: "all" | "income" | "expense";
  onFilter: (v: "all" | "income" | "expense") => void;
  searchTerm: string;
  onSearch: (v: string) => void;
  transactions: Tx[];
  onEdit: (id: string, type: "income" | "expense") => void;
  onDelete: (
    id: string,
    type: "income" | "expense",
    description: string,
    value: number,
  ) => void;
};

const Kpi: React.FC<{
  label: string;
  value: number | null;
  showValues: boolean;
  variant: "income" | "expense" | "savings" | "balance";
  sub?: string;
  onPress?: () => void;
}> = ({ label, value, showValues, variant, sub, onPress }) => {
  const inner = (
    <DesktopGlowCard variant={variant} contentStyle={styles.kpiInner}>
      <Text style={styles.kpiLabel}>{label}</Text>
      {value === null ? (
        <Text style={styles.kpiValue}>-</Text>
      ) : (
        <MaskedAmount value={value} style={styles.kpiValue} />
      )}
      {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
    </DesktopGlowCard>
  );
  if (!onPress) return <View style={styles.kpiCell}>{inner}</View>;
  return (
    <TouchableOpacity style={styles.kpiCell} onPress={onPress} activeOpacity={0.9}>
      {inner}
    </TouchableOpacity>
  );
};

export const HomeDesktopDashboard: React.FC<Props> = (props) => {
  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.hello}>Olá,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {props.displayName}
          </Text>
          <Text style={styles.period}>{props.activePeriodLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={props.onToggleValues}
          style={styles.eyeBtn}
          accessibilityLabel={
            props.showValues ? "Ocultar valores" : "Mostrar valores"
          }
        >
          <Ionicons
            name={props.showValues ? "eye" : "eye-off"}
            size={22}
            color={premium.purpleSoft}
          />
        </TouchableOpacity>
      </View>

      {!props.isStaff ? (
        <View style={[styles.kpiGrid, { gap: 14 }]}>
          <Kpi
            label="Recursos disponíveis"
            value={props.expectedIncomes}
            showValues={props.showValues}
            variant="income"
            sub="Planejado"
            onPress={props.onOpenPlanning}
          />
          <Kpi
            label="Gasto esperado"
            value={props.expectedExpenses}
            showValues={props.showValues}
            variant="expense"
            sub="Planejado"
            onPress={props.onOpenPlanning}
          />
          <Kpi
            label="Poupança esperada"
            value={props.expectedSavings}
            showValues={props.showValues}
            variant="savings"
            sub={props.activePeriodLabel}
          />
          <Kpi
            label="Rendas realizadas"
            value={props.totalIncome}
            showValues={props.showValues}
            variant="income"
            sub={props.activePeriodLabel}
          />
          <Kpi
            label="Gastos realizados"
            value={props.realizedExpenseTotal}
            showValues={props.showValues}
            variant="expense"
            sub={props.activePeriodLabel}
          />
          <Kpi
            label="Saldo"
            value={props.realizedBalance}
            showValues={props.showValues}
            variant="balance"
            sub={props.activePeriodLabel}
          />
        </View>
      ) : (
        <View style={styles.kpiGrid}>
          <Kpi
            label="Total recebido"
            value={props.totalIncome}
            showValues={props.showValues}
            variant="income"
          />
          <Kpi
            label="Total gasto"
            value={props.realizedExpenseTotal}
            showValues={props.showValues}
            variant="expense"
          />
        </View>
      )}

      <View style={styles.actionsRow}>
        {[
          {
            label: "Adicionar renda",
            icon: "add-circle" as const,
            onPress: props.onAddIncome,
            color: premium.purple,
            tone: "purple" as const,
          },
          {
            label: "Adicionar gasto",
            icon: "remove-circle" as const,
            onPress: props.onAddExpense,
            color: premium.magenta,
            tone: "magenta" as const,
          },
          {
            label: "Rendas",
            icon: "cash-outline" as const,
            onPress: props.onIncomeList,
            color: "#a47aff",
            tone: "purple" as const,
          },
          {
            label: "Gastos",
            icon: "receipt-outline" as const,
            onPress: props.onExpenseList,
            color: "#ff6b8a",
            tone: "magenta" as const,
          },
          {
            label: "Planejamento",
            icon: "calendar" as const,
            onPress: props.onOpenPlanning,
            color: premium.purpleBright,
            tone: "purple" as const,
          },
        ].map((a) => (
          <TouchableOpacity
            key={a.label}
            style={styles.actionBtn}
            onPress={a.onPress}
            activeOpacity={0.85}
            {...(Platform.OS === "web"
              ? ({
                  dataSet: {
                    homeAction: "1",
                    homeActionTone: a.tone,
                  },
                } as object)
              : {})}
          >
            <Ionicons name={a.icon} size={18} color={a.color} />
            <Text style={styles.actionBtnText}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.analyticsRow}>
        {props.consumo ? (
          <TouchableOpacity
            style={styles.analyticsMain}
            onPress={props.onOpenBudget}
            activeOpacity={0.9}
          >
            <DesktopGlowCard variant="magenta" contentStyle={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Consumo moderado</Text>
                <Ionicons
                  name={props.consumo.icon}
                  size={20}
                  color={props.consumo.color}
                />
              </View>
              <Text style={[styles.status, { color: props.consumo.color }]}>
                {props.consumo.label}
              </Text>
              <Text style={styles.detail}>
                {props.showValues
                  ? props.consumo.detail
                  : props.consumo.detail.replace(/R\$\s*[\d.,]+/g, "R$ •••")}
              </Text>
              <View style={styles.metaBox}>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Média realizada</Text>
                  <MaskedAmount
                    value={props.consumo.actualDailyAverage}
                    style={styles.metaValue}
                  />
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Média diária ideal</Text>
                  <MaskedAmount
                    value={props.consumo.idealDailyAverage}
                    style={styles.metaValue}
                  />
                </View>
              </View>
            </DesktopGlowCard>
          </TouchableOpacity>
        ) : null}

        {(props.pieData.length > 0 || props.lineData.length > 0) && (
          <View style={styles.chartsCol}>
            {props.pieData.length > 0 ? (
              <DesktopGlowCard
                variant="neutral"
                contentStyle={{ alignItems: "center" }}
              >
                <Text
                  style={[styles.sectionTitle, { alignSelf: "flex-start" }]}
                >
                  Gastos por categoria
                </Text>
                <PieChart data={props.pieData} size={160} />
              </DesktopGlowCard>
            ) : null}
            {props.lineData.length > 0 ? (
              <DesktopGlowCard variant="neutral" contentStyle={{ gap: 6 }}>
                <Text style={styles.sectionTitle}>Evolução (7 dias)</Text>
                <DesktopEvolutionChart
                  data={props.lineData}
                  showValues={props.showValues}
                  height={180}
                />
              </DesktopGlowCard>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.txSection}>
        <View style={styles.txToolbar}>
          <Text style={styles.sectionTitle}>Transações</Text>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color={desktop.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar…"
              placeholderTextColor={desktop.textMuted}
              value={props.searchTerm}
              onChangeText={props.onSearch}
            />
          </View>
          <View style={styles.filterRow}>
            {(
              [
                ["all", "Todas"],
                ["income", "Rendas"],
                ["expense", "Gastos"],
              ] as const
            ).map(([id, label]) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.filterChip,
                  props.filterType === id && styles.filterChipOn,
                ]}
                onPress={() => props.onFilter(id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    props.filterType === id && styles.filterChipTextOn,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <DesktopGlowCard variant="neutral" contentStyle={{ padding: 0 }}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colDesc]}>Descrição</Text>
            <Text style={[styles.th, styles.colType]}>Tipo</Text>
            <Text style={[styles.th, styles.colValue]}>Valor</Text>
            <Text style={[styles.th, styles.colDate]}>Data</Text>
            <Text style={[styles.th, styles.colActions]}>Ações</Text>
          </View>
          {props.transactions.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma transação</Text>
            </View>
          ) : (
            props.transactions.map((tx) => {
              const id = String((tx.item as { id?: string }).id || "");
              const isIncome = tx.type === "income";
              const income = tx.item as Income;
              const expense = tx.item as Expense;
              const desc = isIncome
                ? incomeTransactionLabel(income)
                : expense.description || "Sem descrição";
              const value = tx.item.value;
              const date = formatDateForDisplay(tx.item.date);
              const typeLabel = isIncome
                ? "Renda"
                : getExpenseScopeLabel(expense) || "Gasto";
              return (
                <View key={`${tx.type}-${id}`} style={styles.tr}>
                  <Text style={[styles.td, styles.colDesc]} numberOfLines={2}>
                    {desc}
                    {!isIncome && shouldShowExpenseCategoryTag(expense)
                      ? ` · ${expense.category}`
                      : ""}
                  </Text>
                  <Text style={[styles.td, styles.colType]}>{typeLabel}</Text>
                  <Text
                    style={[
                      styles.td,
                      styles.colValue,
                      isIncome ? styles.valIncome : styles.valExpense,
                    ]}
                  >
                    {props.showValues
                      ? `${isIncome ? "+" : "-"}${formatCurrency(value)}`
                      : "R$ •••"}
                  </Text>
                  <Text style={[styles.td, styles.colDate]}>{date}</Text>
                  <View style={[styles.colActions, styles.actionsCell]}>
                    <TouchableOpacity
                      onPress={() => props.onEdit(id, tx.type)}
                      hitSlop={8}
                    >
                      <Ionicons name="create-outline" size={18} color={premium.purple} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        props.onDelete(id, tx.type, desc, value)
                      }
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={18} color={premium.magenta} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </DesktopGlowCard>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: 20,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  hello: {
    color: desktop.textSecondary,
    fontSize: 14,
  },
  name: {
    color: desktop.text,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  period: {
    marginTop: 4,
    color: desktop.textMuted,
    fontSize: 13,
  },
  eyeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(185,0,255,0.12)",
    borderWidth: 1,
    borderColor: desktop.border,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  kpiCell: {
    width: "32.5%",
    minWidth: 200,
    flexGrow: 1,
    marginBottom: 4,
  },
  kpiInner: {
    minHeight: 96,
    justifyContent: "center",
    gap: 4,
  },
  kpiLabel: {
    color: desktop.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  kpiValue: {
    color: desktop.text,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  kpiSub: {
    color: desktop.textMuted,
    fontSize: 11,
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: desktop.surfaceElevated,
    borderWidth: 1,
    borderColor: desktop.border,
  },
  actionBtnText: {
    color: desktop.text,
    fontSize: 13,
    fontWeight: "700",
  },
  analyticsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    alignItems: "stretch",
  },
  analyticsMain: {
    flex: 1.2,
    minWidth: 280,
  },
  chartsCol: {
    flex: 1,
    minWidth: 280,
    maxWidth: 440,
    gap: 16,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    color: desktop.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  status: {
    fontSize: 18,
    fontWeight: "800",
  },
  detail: {
    color: desktop.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  metaBox: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.35)",
    padding: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    color: desktop.textSecondary,
    fontSize: 12,
  },
  metaValue: {
    color: desktop.text,
    fontSize: 13,
    fontWeight: "700",
  },
  txSection: {
    gap: 12,
  },
  txToolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: desktop.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktop.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
    flex: 1,
    maxWidth: 320,
  },
  searchInput: {
    flex: 1,
    color: desktop.text,
    fontSize: 14,
    outlineStyle: "none",
  } as object,
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: desktop.border,
    backgroundColor: desktop.surface,
  },
  filterChipOn: {
    borderColor: desktop.borderStrong,
    backgroundColor: desktop.surfaceElevated,
  },
  filterChipText: {
    color: desktop.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  filterChipTextOn: {
    color: desktop.text,
  },
  tableHead: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: desktop.border,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  th: {
    color: desktop.textMuted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tr: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  td: {
    color: desktop.text,
    fontSize: 13,
  },
  colDesc: { flex: 2.4, paddingRight: 8 },
  colType: { flex: 1, paddingRight: 8 },
  colValue: { flex: 1, textAlign: "right", fontWeight: "700", paddingRight: 8 },
  colDate: { flex: 0.9, color: desktop.textSecondary },
  colActions: { width: 72 },
  actionsCell: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  valIncome: { color: desktop.success },
  valExpense: { color: desktop.danger },
  empty: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    color: desktop.textSecondary,
  },
});

export default HomeDesktopDashboard;
