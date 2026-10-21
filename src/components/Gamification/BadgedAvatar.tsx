import React from "react";
import { Image, StyleSheet, Text, View, type ViewStyle } from "react-native";
import type { BadgeDefinition } from "../../types/rankingGamification";

export const badgeRingColor = (definition?: BadgeDefinition | null): string =>
  definition ? definition.primaryColor : "#2b2b2b";

export const BadgedAvatar = ({
  photoUri,
  displayName,
  size = 48,
  definition,
}: {
  photoUri?: string | null;
  displayName: string;
  size?: number;
  definition?: BadgeDefinition | null;
}) => {
  const ring = badgeRingColor(definition);
  const ringWidth = definition
    ? definition.borderPreset === "gold-legacy" ||
      definition.borderPreset === "double-violet"
      ? 3
      : 2
    : 1;
  const wrapperStyle: ViewStyle = {
    width: size + ringWidth * 2 + 4,
    height: size + ringWidth * 2 + 4,
    borderRadius: (size + ringWidth * 2 + 4) / 2,
    borderWidth: ringWidth,
    borderColor: ring,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101010",
    ...(definition
      ? {
          shadowColor: definition.secondaryColor,
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

  return (
    <View style={wrapperStyle}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { color: "#fff", fontWeight: "700" },
});
