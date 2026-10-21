import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import type { BadgeDefinition, UserBadgeGrant } from "../../types/rankingGamification";

export const UserBadgeGrantEditor = ({
  userId,
  userName,
}: {
  userId: string;
  userName?: string;
}) => {
  const [definitions, setDefinitions] = useState<BadgeDefinition[]>([]);
  const [grants, setGrants] = useState<UserBadgeGrant[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubDefinitions = rankingGamificationService.subscribeBadgeDefinitions(
      setDefinitions,
      () => undefined,
    );
    const unsubGrants = rankingGamificationService.subscribeUserGrants(
      userId,
      setGrants,
      () => undefined,
    );
    return () => {
      unsubDefinitions();
      unsubGrants();
    };
  }, [userId]);

  const activeIds = new Set(grants.map((grant) => grant.badgeId));

  const toggle = async (definition: BadgeDefinition, hasBadge: boolean) => {
    if (busyId) return;
    const run = async () => {
      try {
        setBusyId(definition.id);
        if (hasBadge) {
          await rankingGamificationService.revokeBadge(userId, definition.id);
        } else {
          await rankingGamificationService.grantBadge(userId, definition.id);
        }
      } catch (error: any) {
        Alert.alert("Erro", error?.message || "Não foi possível atualizar a insígnia.");
      } finally {
        setBusyId(null);
      }
    };
    if (!hasBadge) {
      await run();
      return;
    }
    Alert.alert(
      "Remover insígnia",
      `Remover ${definition.name} de ${userName || "este usuário"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => void run() },
      ],
    );
  };

  return (
    <View>
      {definitions
        .filter((definition) => definition.isActive || activeIds.has(definition.id))
        .map((definition) => {
          const selected = activeIds.has(definition.id);
          return (
            <TouchableOpacity
              key={definition.id}
              style={[styles.chip, selected && styles.chipSelected]}
              disabled={busyId === definition.id}
              onPress={() => void toggle(definition, selected)}
            >
              <Ionicons
                name={definition.icon as any}
                size={16}
                color={definition.primaryColor}
              />
              <Text style={styles.name}>{definition.name}</Text>
              <Text style={styles.state}>{selected ? "Ativa" : "Adicionar"}</Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a2a2a",
  },
  chipSelected: { borderColor: "#8c52ff", backgroundColor: "#241541" },
  name: { color: "#fff", flex: 1, fontWeight: "700" },
  state: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
});