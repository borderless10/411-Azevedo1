/**
 * Fundo dos cards com as artes neon.
 * O recorte deixa a onda na borda e o centro escuro para o texto.
 * Usa expo-image (cache memória+disco) pra não piscar ao filtrar a lista.
 */

import React, { useEffect } from "react";
import {
  Image as RNImage,
  ImageSourcePropType,
  ImageStyle,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

export type CardWaveVariant =
  | "v2Purple"
  | "v2Magenta"
  | "v2Square"
  | "v2Wide"
  | "v2Spark"
  | "actionIncome"
  | "actionExpense"
  | "actionIncomeList"
  | "actionExpenseList"
  | "actionPlanning"
  | "txIncome"
  | "txExpense";

export type CardWaveCrop =
  | "fill"
  | "band"
  | "square"
  | "cornerLeft"
  | "cornerRight"
  | "action";

const SOURCES: Record<CardWaveVariant, ImageSourcePropType> = {
  v2Purple: require("../../../assets/card-waves/v2-landscape-purple.png"),
  v2Magenta: require("../../../assets/card-waves/v2-landscape-magenta.png"),
  v2Square: require("../../../assets/card-waves/v2-square.png"),
  v2Wide: require("../../../assets/card-waves/v2-wide-banner.png"),
  v2Spark: require("../../../assets/card-waves/v2-wide-spark.png"),
  actionIncome: require("../../../assets/card-waves/action-income.png"),
  actionExpense: require("../../../assets/card-waves/action-expense.png"),
  actionIncomeList: require("../../../assets/card-waves/action-income-list.png"),
  actionExpenseList: require("../../../assets/card-waves/action-expense-list.png"),
  actionPlanning: require("../../../assets/card-waves/action-planning.png"),
  txIncome: require("../../../assets/card-waves/tx-income.png"),
  txExpense: require("../../../assets/card-waves/tx-expense.png"),
};

const CROPS: Record<CardWaveCrop, ImageStyle> = {
  fill: {
    width: "108%",
    height: "155%",
    left: "-4%",
    top: "-28%",
  },
  band: {
    width: "106%",
    height: "240%",
    left: "-3%",
    top: "-70%",
  },
  square: {
    width: "124%",
    height: "124%",
    left: "-12%",
    top: "-12%",
  },
  cornerLeft: {
    width: "160%",
    height: "140%",
    left: "0%",
    top: "-18%",
  },
  cornerRight: {
    width: "160%",
    height: "140%",
    left: "-60%",
    top: "-18%",
  },
  action: {
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
  },
};

/** Prefetch das artes pra troca de filtro renda/gasto não “piscar”. */
export async function prefetchCardWaveAssets(
  variants: CardWaveVariant[] = ["txIncome", "txExpense"],
): Promise<void> {
  await Promise.all(
    variants.map(async (variant) => {
      const source = SOURCES[variant];
      try {
        await ExpoImage.prefetch(source as number, "memory-disk");
        return;
      } catch {
        // fallback: URI resolvida do asset local
      }
      try {
        const resolved = RNImage.resolveAssetSource(source);
        if (resolved?.uri) {
          await ExpoImage.prefetch(resolved.uri, "memory-disk");
        }
      } catch {
        // ignore
      }
    }),
  );
}

interface CardWaveBgProps {
  variant: CardWaveVariant;
  crop?: CardWaveCrop;
  opacity?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const CardWaveBg: React.FC<CardWaveBgProps> = ({
  variant,
  crop = "fill",
  opacity = 0.92,
  style,
  borderRadius = 14,
}) => {
  const isAction = crop === "action";
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { borderRadius }, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <ExpoImage
        source={SOURCES[variant]}
        contentFit={isAction ? "fill" : "cover"}
        cachePolicy="memory-disk"
        recyclingKey={`card-wave-${variant}`}
        transition={0}
        style={[
          styles.image,
          CROPS[crop],
          { opacity },
          Platform.OS === "web"
            ? ({ mixBlendMode: "screen" } as object)
            : null,
        ]}
      />
    </View>
  );
};

const WARMUP_VARIANTS: CardWaveVariant[] = [
  "txIncome",
  "txExpense",
  "actionIncome",
  "actionExpense",
  "actionIncomeList",
  "actionExpenseList",
  "actionPlanning",
];

/** Aquecimento invisível: mantém artes decodificadas na memória. */
export const CardWaveWarmup: React.FC = () => {
  useEffect(() => {
    void prefetchCardWaveAssets(WARMUP_VARIANTS);
  }, []);

  return (
    <View
      pointerEvents="none"
      style={styles.warmup}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {WARMUP_VARIANTS.map((variant) => (
        <ExpoImage
          key={variant}
          source={SOURCES[variant]}
          cachePolicy="memory-disk"
          recyclingKey={`card-wave-warm-${variant}`}
          style={styles.warmupImage}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  image: {
    position: "absolute",
  },
  warmup: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    overflow: "hidden",
    left: 0,
    top: 0,
  },
  warmupImage: {
    width: 1,
    height: 1,
  },
});

export default CardWaveBg;
