/**
 * Gráfico de Barras Horizontais - Gastos por Categoria
 */

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { formatCurrency } from '../../utils/currencyUtils';

export interface CategoryData {
  category: string;
  total: number;
  percentage: number;
  color: string;
}

interface CategoryBarChartProps {
  data: CategoryData[];
  maxValue?: number;
  showValues?: boolean;
  showPercentages?: boolean;
}

export const CategoryBarChart: React.FC<CategoryBarChartProps> = ({
  data,
  maxValue,
  showValues = true,
  showPercentages = true,
}) => {
  // Se não tiver dados, mostrar mensagem
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum dado disponível</Text>
      </View>
    );
  }

  // Calcular valor máximo se não fornecido
  const calculatedMaxValue = maxValue || (data.length > 0 ? Math.max(...data.map((d) => d.total)) : 1);

  return (
    <View style={styles.container}>
      {data.map((item, index) => (
        <CategoryBarItem
          key={`${item.category}-${index}`}
          item={item}
          maxValue={calculatedMaxValue}
          showValues={showValues}
          showPercentages={showPercentages}
          delay={index * 100}
        />
      ))}
    </View>
  );
};

interface CategoryBarItemProps {
  item: CategoryData;
  maxValue: number;
  showValues: boolean;
  showPercentages: boolean;
  delay: number;
}

const CategoryBarItem: React.FC<CategoryBarItemProps> = ({
  item,
  maxValue,
  showValues,
  showPercentages,
  delay,
}) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0 && width !== containerWidth) {
      setContainerWidth(width);
    }
  };

  useEffect(() => {
    if (containerWidth > 0) {
      const percentage = maxValue > 0 ? (item.total / maxValue) * 100 : 0;
      const targetWidth = (containerWidth * percentage) / 100;
      
      Animated.parallel([
        Animated.timing(widthAnim, {
          toValue: targetWidth,
          duration: 800,
          delay,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 600,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [containerWidth, item.total, maxValue, delay]);

  return (
    <Animated.View
      style={[
        styles.barContainer,
        {
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.barHeader}>
        <View style={styles.categoryInfo}>
          <View style={[styles.colorDot, { backgroundColor: item.color }]} />
          <Text style={styles.categoryName} numberOfLines={1}>
            {item.category}
          </Text>
        </View>
        <View style={styles.valuesContainer}>
          {showPercentages && (
            <Text style={styles.percentageText}>
              {item.percentage.toFixed(1)}%
            </Text>
          )}
          {showValues && (
            <Text style={styles.valueText}>{formatCurrency(item.total)}</Text>
          )}
        </View>
      </View>
      <View style={styles.barWrapper} onLayout={handleLayout}>
        <Animated.View
          style={[
            styles.bar,
            {
              width: widthAnim,
              backgroundColor: item.color,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  barContainer: {
    marginBottom: 4,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  valuesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    minWidth: 80,
    textAlign: 'right',
  },
  barWrapper: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default CategoryBarChart;
