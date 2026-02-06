/**
 * Gráfico Simples - Rendas vs Gastos (7 dias)
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDateForDisplay } from '../../utils/dateUtils';

export interface LineChartData {
  date: Date;
  income: number;
  expense: number;
}

interface LineChartProps {
  data: LineChartData[];
  height?: number;
  showLabels?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 280,
  showLabels = true,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum dado disponível</Text>
      </View>
    );
  }

  // Calcular valor máximo para a escala
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income || 0, d.expense || 0)),
    10
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {showLabels && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.legendText}>Rendas</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.legendText}>Gastos</Text>
          </View>
        </View>
      )}

      <View style={styles.chartContainer}>
        {data.map((item, index) => {
          const incomePercent = (item.income / maxValue) * 100;
          const expensePercent = (item.expense / maxValue) * 100;

          return (
            <View key={index} style={styles.dayRow}>
              {/* Data */}
              <Text style={styles.dateText}>
                {formatDateForDisplay(item.date).split('/').slice(0, 2).join('/')}
              </Text>

              {/* Barras */}
              <View style={styles.barsArea}>
                {/* Barra de Renda */}
                <View style={styles.barRow}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        styles.incomeBar,
                        { width: `${incomePercent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.valueText}>{formatCurrency(item.income)}</Text>
                </View>

                {/* Barra de Gasto */}
                <View style={styles.barRow}>
                  <View style={styles.barContainer}>
                    <View
                      style={[
                        styles.bar,
                        styles.expenseBar,
                        { width: `${expensePercent}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.valueText}>{formatCurrency(item.expense)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  chartContainer: {
    gap: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: {
    fontSize: 11,
    color: '#999',
    width: 40,
    fontWeight: '600',
  },
  barsArea: {
    flex: 1,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    maxWidth: 180,
  },
  bar: {
    height: 14,
    borderRadius: 7,
    minWidth: 2,
  },
  incomeBar: {
    backgroundColor: '#4CAF50',
  },
  expenseBar: {
    backgroundColor: '#F44336',
  },
  valueText: {
    fontSize: 10,
    color: '#ccc',
    fontWeight: '600',
    minWidth: 60,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default LineChart;
