import React, { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BadgeDefinition } from "../../types/rankingGamification";
import {
  crownColor,
  crownLabel,
  type CrownPosition,
} from "../../utils/crowns";
import { BadgeDetailModal } from "./BadgeEmblem";
import { PhotoPreviewModal } from "./PhotoPreviewModal";

export const badgeRingColor = (definition?: BadgeDefinition | null): string =>
  definition ? definition.primaryColor : "#2b2b2b";

/**
 * Foto de usuário com a insígnia no canto inferior direito, sobre a foto.
 * Anel e selo são independentes: o anel é só a borda ativa escolhida
 * (ringDefinition) e o selo é a insígnia que acompanha a foto
 * (badgeDefinition). Regra geral do app: com foto, tocar na foto amplia;
 * com insígnia, tocar no selo abre o popup da insígnia. Por padrão o
 * próprio componente abre as duas visualizações. A tela pode assumir os
 * toques passando onPhotoPress e onBadgePress quando já tem modal próprio.
 */
export const BadgedAvatar = ({
  photoUri,
  displayName,
  size = 48,
  ringDefinition,
  badgeDefinition,
  crownPosition,
  onPhotoPress,
  onBadgePress,
}: {
  photoUri?: string | null;
  displayName: string;
  size?: number;
  ringDefinition?: BadgeDefinition | null;
  badgeDefinition?: BadgeDefinition | null;
  /**
   * Coroa de vencedor da última temporada (1 ouro, 2 prata, 3 bronze).
   * Só Ranking e Chat passam isso: nas outras telas a foto não coroa.
   */
  crownPosition?: CrownPosition | null;
  onPhotoPress?: () => void;
  onBadgePress?: (definition: BadgeDefinition) => void;
}) => {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);
  const ring = badgeRingColor(ringDefinition);
  const ringWidth = ringDefinition
    ? ringDefinition.borderPreset === "gold-legacy" ||
      ringDefinition.borderPreset === "double-violet"
      ? 3
      : 2
    : 1;
  const badgeSize = Math.round(Math.min(30, Math.max(18, size * 0.4)));
  const crownSize = Math.round(Math.min(30, Math.max(18, size * 0.46)));
  const wrapperStyle: ViewStyle = {
    position: "relative",
    width: size + ringWidth * 2 + 4,
    height: size + ringWidth * 2 + 4,
    borderRadius: (size + ringWidth * 2 + 4) / 2,
    borderWidth: ringWidth,
    borderColor: ring,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101010",
    ...(ringDefinition
      ? {
          shadowColor: ringDefinition.secondaryColor,
          shadowOpacity: 0.45,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 3,
        }
      : null),
  };
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const photo = photoUri ? (
    <Image
      source={{ uri: photoUri }}
      key={photoUri}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: Math.max(12, size * 0.3) }]}>
        {initials || "?"}
      </Text>
    </View>
  );

  const badgeChipStyle = badgeDefinition
    ? [
        styles.badgeChip,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          borderColor: badgeDefinition.primaryColor,
        },
      ]
    : null;

  const badgeIcon = badgeDefinition ? (
    <Ionicons
      name={badgeDefinition.icon as any}
      size={Math.max(10, badgeSize * 0.58)}
      color={badgeDefinition.secondaryColor}
    />
  ) : null;

  return (
    <>
      <View style={wrapperStyle}>
        {photoUri ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Ampliar foto de ${displayName}`}
            activeOpacity={0.85}
            onPress={
              onPhotoPress ? onPhotoPress : () => setPreviewOpen(true)
            }
          >
            {photo}
          </TouchableOpacity>
        ) : (
          photo
        )}
        {badgeDefinition && badgeChipStyle ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Ver insígnia ${badgeDefinition.name}`}
            activeOpacity={0.85}
            hitSlop={6}
            onPress={
              onBadgePress
                ? () => onBadgePress(badgeDefinition)
                : () => setBadgeOpen(true)
            }
            style={badgeChipStyle}
          >
            {badgeIcon}
          </TouchableOpacity>
        ) : null}
        {crownPosition ? (
          <View
            accessibilityLabel={`${crownLabel(crownPosition)} de ${displayName}`}
            style={[
              styles.crownChip,
              {
                width: crownSize,
                height: crownSize,
                borderRadius: crownSize / 2,
                borderColor: crownColor(crownPosition),
                marginLeft: -crownSize / 2,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="crown"
              size={Math.max(11, crownSize * 0.68)}
              color={crownColor(crownPosition)}
              style={styles.crownIcon}
            />
          </View>
        ) : null}
      </View>
      <PhotoPreviewModal
        visible={previewOpen}
        uri={photoUri}
        name={displayName}
        onClose={() => setPreviewOpen(false)}
      />
      <BadgeDetailModal
        definition={badgeOpen && badgeDefinition ? badgeDefinition : null}
        onClose={() => setBadgeOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontWeight: "700" },
  badgeChip: {
    position: "absolute",
    right: -2,
    bottom: -2,
    zIndex: 2,
    elevation: 4,
    borderWidth: 1.5,
    backgroundColor: "#17121f",
    alignItems: "center",
    justifyContent: "center",
  },
  crownChip: {
    position: "absolute",
    top: -9,
    left: "50%",
    zIndex: 3,
    elevation: 5,
    borderWidth: 1.5,
    backgroundColor: "#17121f",
    alignItems: "center",
    justifyContent: "center",
  },
  crownIcon: {
    transform: [{ rotate: "-10deg" }],
  },
});
