/**
 * Gráfico de Pizza Simples - Distribuição por Categoria
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { formatCurrency } from '../../utils/currencyUtils';

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

const DEFAULT_SIZE = 200;

export const PieChart: React.FC<PieChartProps> = ({
  data,
  size = DEFAULT_SIZE,
  showLegend = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { width: size, height: size }]}>
        <Text style={styles.emptyText}>Nenhum dado disponível</Text>
      </View>
    );
  }

  // Para React Native, vamos usar uma visualização simplificada
  // Mostrar apenas a legenda com barras de progresso circulares
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        {/* Círculo central com total */}
        <View style={[styles.centerCircle, { width: size * 0.7, height: size * 0.7, borderRadius: (size * 0.7) / 2 }]}>
          <View style={styles.centerLabel}>
            <Text style={styles.centerLabelText}>
              {total > 0 ? formatCurrency(total) : 'R$ 0'}
            </Text>
            <Text style={styles.centerLabelSubtext}>Total</Text>
          </View>
        </View>
        
        {/* Anéis de progresso ao redor (simplificado) */}
        {data.slice(0, 3).map((item, index) => {
          const ringSize = size * (0.85 - index * 0.15);
          const ringThickness = size * 0.08;
          return (
            <View
              key={`ring-${item.category}-${index}`}
              style={[
                styles.ring,
                {
                  width: ringSize,
                  height: ringSize,
                  borderRadius: ringSize / 2,
                  borderWidth: ringThickness,
                  borderColor: item.color,
                  borderTopColor: 'transparent',
                  borderRightColor: index === 0 ? item.color : 'transparent',
                  opacity: item.percentage / 100,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legenda */}
      {showLegend && (
        <View style={styles.legend}>
          {data.map((item, index) => (
            <View key={item.category} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <View style={styles.legendTextContainer}>
                <Text style={styles.legendCategory} numberOfLines={1}>
                  {item.category}
                </Text>
                <Text style={styles.legendValue}>
                  {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -1 * (DEFAULT_SIZE * 0.7) / 2 }, { translateY: -1 * (DEFAULT_SIZE * 0.7) / 2 }],
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -1 * (DEFAULT_SIZE * 0.85) / 2 }, { translateY: -1 * (DEFAULT_SIZE * 0.85) / 2 }],
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  centerLabelSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  legend: {
    width: '100%',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: DEFAULT_SIZE / 2,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default PieChart;
