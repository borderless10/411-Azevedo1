/**
 * Fundo dos cards com as artes neon.
 * O recorte deixa a onda na borda e o centro escuro para o texto.
 */

import React from "react";
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  Platform,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

export type CardWaveVariant =
  | "v2Purple"
  | "v2Magenta"
  | "v2Square"
  | "v2Wide"
  | "v2Spark";

export type CardWaveCrop = "fill" | "band" | "square" | "cornerLeft" | "cornerRight";

const SOURCES: Record<CardWaveVariant, ImageSourcePropType> = {
  v2Purple: require("../../../assets/card-waves/v2-landscape-purple.png"),
  v2Magenta: require("../../../assets/card-waves/v2-landscape-magenta.png"),
  v2Square: require("../../../assets/card-waves/v2-square.png"),
  v2Wide: require("../../../assets/card-waves/v2-wide-banner.png"),
  v2Spark: require("../../../assets/card-waves/v2-wide-spark.png"),
};

const CROPS: Record<CardWaveCrop, ImageStyle> = {
  // Paisagem 3:2 cobrindo o card baixo: mostra as ondas laterais.
  fill: {
    width: "108%",
    height: "155%",
    left: "-4%",
    top: "-28%",
  },
  // Faixa larga no card fino da poupança.
  band: {
    width: "106%",
    height: "240%",
    left: "-3%",
    top: "-70%",
  },
  // Quadrado no card de saldo.
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
};

interface CardWaveBgProps {
  variant: CardWaveVariant;
  crop?: CardWaveCrop;
  opacity?: number;
  style?: ViewStyle;
}

export const CardWaveBg: React.FC<CardWaveBgProps> = ({
  variant,
  crop = "fill",
  opacity = 0.92,
  style,
}) => {
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={SOURCES[variant]}
        resizeMode="cover"
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

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
    borderRadius: 14,
  },
  image: {
    position: "absolute",
  },
});

export default CardWaveBg;
