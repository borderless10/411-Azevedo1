/**
 * Mini gráfico de linha para o card Consumo Moderado (valores reais do ciclo).
 */

import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from "react-native-svg";
import { premium } from "../../theme/visaoPremium";

interface ConsumoSparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const ConsumoSparkline: React.FC<ConsumoSparklineProps> = ({
  values,
  width = 110,
  height = 72,
  color = premium.magenta,
}) => {
  const geometry = useMemo(() => {
    const series =
      values.length >= 2
        ? values
        : values.length === 1
          ? [values[0], values[0]]
          : [0, 0];
    const max = Math.max(...series, 0.01);
    const min = Math.min(...series, 0);
    const span = Math.max(max - min, 0.01);
    const padX = 4;
    const padY = 8;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;
    const points = series.map((value, index) => {
      const x =
        padX +
        (series.length === 1
          ? usableW / 2
          : (index / (series.length - 1)) * usableW);
      const y = padY + usableH - ((value - min) / span) * usableH;
      return { x, y };
    });
    const line = points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(" ");
    const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${height - 2} L ${points[0].x.toFixed(2)} ${height - 2} Z`;
    return { points, line, area };
  }, [values, width, height]);

  return (
    <View style={[styles.wrap, { width, height }]} accessibilityElementsHidden>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="consumoFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>
        <Path d={geometry.area} fill="url(#consumoFill)" />
        <Path
          d={geometry.line}
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geometry.points.map((point, index) => (
          <Circle
            key={`pt-${index}`}
            cx={point.x}
            cy={point.y}
            r={2.4}
            fill={color}
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
  },
});

export default ConsumoSparkline;
