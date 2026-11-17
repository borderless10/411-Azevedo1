/**
 * Fundo SVG do card Consumo Moderado.
 * Referência: montanha magenta à direita, pontos com anel (glow + branco + centro),
 * texto à esquerda sem sobreposição.
 */

import React, { useId, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { premium } from "../../theme/visaoPremium";

interface ConsumoModeradoBgProps {
  values?: number[];
  width: number;
  height: number;
  color?: string;
}

/** Curva ascendente da referência (y maior = mais baixo no SVG). */
const REFERENCE_POINTS = [
  { x: 0.02, y: 0.86 },
  { x: 0.16, y: 0.78 },
  { x: 0.3, y: 0.68 },
  { x: 0.44, y: 0.72 },
  { x: 0.58, y: 0.5 },
  { x: 0.72, y: 0.54 },
  { x: 0.86, y: 0.3 },
  { x: 1.02, y: 0.2 },
];

function smoothLine(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export const ConsumoModeradoBg: React.FC<ConsumoModeradoBgProps> = ({
  width,
  height,
  color = premium.magenta,
}) => {
  const uid = useId().replace(/:/g, "");
  const fillId = `cmFill-${uid}`;
  const glowId = `cmGlow-${uid}`;
  const lineId = `cmLine-${uid}`;

  const geometry = useMemo(() => {
    const padL = width * 0.02;
    const padR = width * 0.02;
    const padT = height * 0.08;
    const padB = height * 0.04;
    const usableW = Math.max(width - padL - padR, 1);
    const usableH = Math.max(height - padT - padB, 1);

    // Sempre a curva da referência no fundo decorativo (evita série flat sumir).
    const points = REFERENCE_POINTS.map((p) => ({
      x: padL + p.x * usableW,
      y: padT + p.y * usableH,
    }));

    const line = smoothLine(points);
    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L ${last.x.toFixed(2)} ${height + 2} L ${first.x.toFixed(2)} ${height + 2} Z`;
    return { points, line, area };
  }, [width, height]);

  if (width < 8 || height < 8) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { width, height }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.42" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.16" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </LinearGradient>
          <RadialGradient id={glowId} cx="78%" cy="82%" rx="62%" ry="58%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <Stop offset="45%" stopColor={color} stopOpacity="0.18" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id={lineId} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} stopOpacity="0.55" />
            <Stop offset="100%" stopColor="#FF6BCB" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Glow canto inferior direito */}
        <Path
          d={`M0 0 H ${width} V ${height} H 0 Z`}
          fill={`url(#${glowId})`}
        />

        {/* Área sob a curva */}
        <Path d={geometry.area} fill={`url(#${fillId})`} />

        {/* Linha suave */}
        <Path
          d={geometry.line}
          stroke={`url(#${lineId})`}
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />

        {/* Pontos: glow magenta → anel branco → centro magenta */}
        {geometry.points.map((point, index) => (
          <React.Fragment key={`cm-pt-${index}`}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={9}
              fill={color}
              opacity={0.28}
            />
            <Circle
              cx={point.x}
              cy={point.y}
              r={5.4}
              fill="#FFFFFF"
              stroke={color}
              strokeWidth={2.4}
            />
            <Circle cx={point.x} cy={point.y} r={2.6} fill={color} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
});

export default ConsumoModeradoBg;
