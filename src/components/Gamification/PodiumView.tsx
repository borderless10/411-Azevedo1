import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type {
  BadgeDefinition,
  HistoricalPodiumEntry,
} from "../../types/rankingGamification";
import { BadgedAvatar } from "./BadgedAvatar";
import { BadgeEmblemRow } from "./BadgeEmblem";

const MEDAL = ["#e7b958", "#c0c6d4", "#cd7f32"];

export const PodiumView = ({
  entries,
  activeBadgesByUser,
  activeBorderDefinitionByUser,
  onBadgePress,
}: {
  entries: HistoricalPodiumEntry[];
  activeBadgesByUser: Map<string, BadgeDefinition[]>;
  activeBorderDefinitionByUser: Map<string, BadgeDefinition | null>;
  onBadgePress?: (definition: BadgeDefinition) => void;
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [fade, entries]);

  if (!entries.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="trophy-outline" size={30} color="#666" />
        <Text style={styles.emptyText}>
          Nenhum vencedor registrado nesta liga.
        </Text>
      </View>
    );
  }

  const byPosition = new Map(entries.map((entry) => [entry.position, entry]));
  const display = [byPosition.get(2), byPosition.get(1), byPosition.get(3)].filter(
    Boolean,
  ) as HistoricalPodiumEntry[];

  return (
    <Animated.View style={[styles.row, { opacity: fade }]}>
      {display.map((entry) => {
        const badges = activeBadgesByUser.get(entry.userId) || [];
        const border = activeBorderDefinitionByUser.get(entry.userId) || null;
        const isFirst = entry.position === 1;
        return (
          <View key={entry.userId} style={styles.place}>
            <BadgedAvatar
              photoUri={entry.photoUrl}
              displayName={entry.displayName}
              size={isFirst ? 76 : 58}
              definition={border}
            />
            <Text style={styles.name} numberOfLines={2}>
              {entry.displayName}
            </Text>
            <Text style={styles.points}>{entry.rankingPoints} pts</Text>
            <BadgeEmblemRow
              definitions={badges}
              max={3}
              size={19}
              onPress={onBadgePress}
            />
            <View
              style={[
                styles.base,
                {
                  height: isFirst ? 64 : entry.position === 2 ? 44 : 32,
                  backgroundColor: MEDAL[entry.position - 1] || "#8c52ff",
                },
              ]}
            >
              <Text style={styles.baseText}>{entry.position}º</Text>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
    paddingTop: 8,
  },
  place: { flex: 1, maxWidth: 150, alignItems: "center", gap: 5 },
  name: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    minHeight: 32,
  },
  points: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
  base: {
    alignSelf: "stretch",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  baseText: { color: "#141414", fontSize: 16, fontWeight: "900" },
  empty: { alignItems: "center", gap: 8, paddingVertical: 28 },
  emptyText: { color: "#999", fontSize: 14, textAlign: "center" },
});
