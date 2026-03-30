import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../contexts/ThemeContext';

export interface InvPoint {
  date: Date;
  caixa: number;
  ipca: number;
  outros: number;
  total: number;
}

interface Props {
  data: InvPoint[]; // assumed sorted ascending by date
}

export const InvestmentsLineChart: React.FC<Props> = ({ data }) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textSecondary }}>Sem dados para gráfico</Text>
      </View>
    );
  }

  // format labels (últimas 8 entradas com datas curtas)
  const chartData = {
    labels: data.slice(-8).map(d => d.date.toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' })),
    datasets: [
      {
        data: data.slice(-8).map(d => d.caixa),
        color: () => '#8c52ff',
        strokeWidth: 2,
      },
      {
        data: data.slice(-8).map(d => d.ipca),
        color: () => '#2b6cb0',
        strokeWidth: 2,
      },
      {
        data: data.slice(-8).map(d => d.outros),
        color: () => '#a47aff',
        strokeWidth: 2,
      },
      {
        data: data.slice(-8).map(d => d.total),
        color: () => '#00b894',
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    color: () => colors.textSecondary,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    formatYLabel: (v: string) => `R$ ${Math.round(Number(v) / 1000)}k`,
  };

  return (
    <View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8c52ff' }]} />
          <Text style={styles.legendText}>Caixa</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#2b6cb0' }]} />
          <Text style={styles.legendText}>IPCA</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#a47aff' }]} />
          <Text style={styles.legendText}>Outros</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#00b894' }]} />
          <Text style={styles.legendText}>Total</Text>
        </View>
      </View>
      <LineChart
        data={chartData}
        width={400}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#a89fc0' },
  chart: { borderRadius: 8, marginHorizontal: -8 },
  empty: { alignItems: 'center', justifyContent: 'center', height: 200 },
});

export default InvestmentsLineChart;