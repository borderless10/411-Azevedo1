/**
 * Donut de gastos por categoria — dados reais, total e legendas.
 */

import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, G, Path } from "react-native-svg";
import { formatCurrency } from "../../utils/currencyUtils";
import { premium } from "../../theme/visaoPremium";
import { useShowValues } from "../../contexts/ShowValuesContext";

export interface PieChartData {
  category: string;
  value: number;
  percentage: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLegend?: boolean;
}

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = polar(cx, cy, r, endAngle);
  const end = polar(cx, cy, r, startAngle);
  const large = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
};

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size,
  showLegend = true,
}) => {
  const { width } = useWindowDimensions();
  const { showValues } = useShowValues();
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const chartSize = size ?? Math.min(148, Math.max(118, width * 0.34));
  const stroke = Math.max(18, chartSize * 0.16);
  const radius = (chartSize - stroke) / 2;
  const cx = chartSize / 2;
  const cy = chartSize / 2;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [opacityAnim]);

  const segments = useMemo(() => {
    const cleaned = (data || [])
      .filter((item) => item.value > 0)
      .map((item, index) => ({
        ...item,
        color: item.color || premium.chart[index % premium.chart.length],
      }));
    const total = cleaned.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) return { slices: [] as Array<PieChartData & { start: number; end: number }>, total: 0 };

    let cursor = 0;
    const slices = cleaned.map((item) => {
      const pct = (item.value / total) * 100;
      const sweep = (item.value / total) * 360;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      return {
        ...item,
        percentage: pct,
        start,
        end: Math.min(end, 359.999),
      };
    });
    return { slices, total };
  }, [data]);

  if (!segments.slices.length) {
    return (
      <View
        style={[styles.emptyContainer, { width: chartSize, height: chartSize }]}
        accessibilityLabel="Sem gastos no período para o gráfico"
      >
        <Text style={styles.emptyText}>Sem gastos no período</Text>
      </View>
    );
  }

  const narrow = width < 340;

  return (
    <Animated.View
      style={[
        styles.container,
        narrow && styles.containerStacked,
        { opacity: opacityAnim },
      ]}
    >
      <View
        style={[styles.chartWrap, { width: chartSize, height: chartSize }]}
        accessibilityRole="image"
        accessibilityLabel={`Total de gastos ${showValues ? formatCurrency(segments.total) : "oculto"}`}
      >
        <Svg width={chartSize} height={chartSize}>
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke="rgba(190,130,255,0.12)"
            strokeWidth={stroke}
            fill="none"
          />
          <G>
            {segments.slices.map((slice) => {
              const gap = segments.slices.length > 1 ? 2.2 : 0;
              const start = slice.start + gap / 2;
              const end = Math.max(start + 0.5, slice.end - gap / 2);
              if (end - start >= 359.5) {
                return (
                  <Circle
                    key={slice.category}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={stroke}
                    fill="none"
                  />
                );
              }
              return (
                <Path
                  key={slice.category}
                  d={arcPath(cx, cy, radius, start, end)}
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  fill="none"
                />
              );
            })}
          </G>
          <Circle
            cx={cx}
            cy={cy}
            r={radius - stroke * 0.55}
            fill={premium.bg}
          />
        </Svg>
        <View style={styles.centerLabel} pointerEvents="none">
          <Text style={styles.centerValue} numberOfLines={1}>
            {showValues ? formatCurrency(segments.total) : "R$ •••"}
          </Text>
          <Text style={styles.centerSub}>Total</Text>
        </View>
      </View>

      {showLegend ? (
        <View style={[styles.legend, narrow && styles.legendFull]}>
          {segments.slices.map((item) => (
            <View key={item.category} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: item.color }]}
              />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.legendValue}>
                  {showValues ? formatCurrency(item.value) : "R$ •••"} (
                  {item.percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  containerStacked: {
    flexDirection: "column",
  },
  chartWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  centerValue: {
    color: premium.text,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  centerSub: {
    color: premium.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: "600",
  },
  legend: {
    flex: 1,
    gap: 10,
    minWidth: 140,
  },
  legendFull: {
    width: "100%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendCategory: {
    color: premium.text,
    fontSize: 13,
    fontWeight: "700",
  },
  legendValue: {
    color: premium.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  emptyContainer: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: premium.border,
    backgroundColor: premium.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyText: {
    color: premium.textSecondary,
    fontSize: 13,
    textAlign: "center",
  },
});

export default PieChart;
