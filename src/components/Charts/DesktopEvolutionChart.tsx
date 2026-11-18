/**
 * Evolução 7 dias — desktop: faixa larga com colunas agrupadas legíveis.
 */
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { desktop } from "../../theme/desktopTokens";
import { formatCurrency } from "../../utils/currencyUtils";
import type { LineChartData } from "./LineChart";

type Props = {
  data: LineChartData[];
  showValues?: boolean;
  height?: number;
};

const INCOME = "#B900FF";
const EXPENSE = "#FF008A";

export const DesktopEvolutionChart: React.FC<Props> = ({
  data,
  showValues = true,
  height = 240,
}) => {
  const barArea = Math.max(140, height - 48);

  const { maxValue, totals } = useMemo(() => {
    const incomeSum = data.reduce((s, d) => s + (Number(d.income) || 0), 0);
    const expenseSum = data.reduce((s, d) => s + (Number(d.expense) || 0), 0);
    const max = Math.max(
      1,
      ...data.map((d) =>
        Math.max(Number(d.income) || 0, Number(d.expense) || 0),
      ),
    );
    return { maxValue: max, totals: { incomeSum, expenseSum } };
  }, [data]);

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nenhum dado nos últimos 7 dias</Text>
      </View>
    );
  }

  const labelFmt = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  };

  const barPx = (value: number) => {
    const v = Math.max(0, Number(value) || 0);
    if (v <= 0) return 6;
    return Math.max(12, Math.round((v / maxValue) * barArea));
  };

  const hasActivity = totals.incomeSum > 0 || totals.expenseSum > 0;

  return (
    <View style={styles.root}>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: INCOME }]} />
          <Text style={styles.legendText}>Rendas</Text>
          <Text style={styles.legendValue}>
            {showValues ? formatCurrency(totals.incomeSum) : "R$ •••"}
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: EXPENSE }]} />
          <Text style={styles.legendText}>Gastos</Text>
          <Text style={[styles.legendValue, { color: EXPENSE }]}>
            {showValues ? formatCurrency(totals.expenseSum) : "R$ •••"}
          </Text>
        </View>
      </View>

      {!hasActivity ? (
        <View style={styles.emptyPlot}>
          <Text style={styles.hint}>Sem lançamentos neste período</Text>
        </View>
      ) : (
        <View style={[styles.plot, { height: barArea + 40 }]}>
          <View style={styles.gridLines} pointerEvents="none">
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>
          <View style={styles.columns}>
            {data.map((item, index) => {
              const income = Number(item.income) || 0;
              const expense = Number(item.expense) || 0;
              return (
                <View key={index} style={styles.dayCol}>
                  <View style={[styles.barsPair, { height: barArea }]}>
                    <View style={[styles.barShell, { height: barPx(income) }]}>
                      <LinearGradient
                        colors={["#E070FF", INCOME]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                    <View style={[styles.barShell, { height: barPx(expense) }]}>
                      <LinearGradient
                        colors={["#FF7ABB", EXPENSE]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>
                  </View>
                  <Text style={styles.dayLabel}>{labelFmt(item.date)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    width: "100%",
    gap: 12,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    color: desktop.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  legendValue: {
    color: desktop.text,
    fontSize: 13,
    fontWeight: "800",
  },
  hint: {
    color: desktop.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },
  emptyPlot: {
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: desktop.border,
    backgroundColor: "rgba(0,0,0,0.22)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  plot: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: desktop.border,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  gridLines: {
    ...StyleSheet.absoluteFillObject,
    top: 16,
    bottom: 34,
    left: 16,
    right: 16,
    justifyContent: "space-between",
  },
  gridLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  dayCol: {
    flex: 1,
    alignItems: "center",
    minWidth: 48,
  },
  barsPair: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 6,
  },
  barShell: {
    width: 18,
    borderRadius: 7,
    overflow: "hidden",
    backgroundColor: desktop.surfaceElevated,
  },
  dayLabel: {
    marginTop: 8,
    color: desktop.textSecondary,
    fontSize: 11,
    fontWeight: "700",
  },
  empty: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    color: desktop.textMuted,
    fontSize: 13,
  },
});

export default DesktopEvolutionChart;
