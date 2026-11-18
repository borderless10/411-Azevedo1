import React from "react";
import { Image as ExpoImage, type ImageContentFit } from "expo-image";
import type { StyleProp, ImageStyle } from "react-native";
import {
  isRemoteHttpUri,
  remoteImageSource,
} from "../../utils/remoteImageCache";

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Evita flash de foto errada em listas recicladas. */
  recyclingKey?: string;
  transition?: number;
  accessibilityLabel?: string;
};

/**
 * Imagem remota com cache em memória+disco (expo-image).
 * Para Firebase Storage usa cacheKey estável (path sem token).
 */
export const CachedRemoteImage: React.FC<Props> = ({
  uri,
  style,
  contentFit = "cover",
  recyclingKey,
  transition = 120,
  accessibilityLabel,
}) => {
  const value = String(uri || "").trim();
  if (!value) return null;

  const remote = isRemoteHttpUri(value);

  return (
    <ExpoImage
      source={remote ? remoteImageSource(value) : { uri: value }}
      style={style}
      contentFit={contentFit}
      cachePolicy={remote ? "memory-disk" : "none"}
      recyclingKey={recyclingKey || value}
      transition={transition}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

export default CachedRemoteImage;
