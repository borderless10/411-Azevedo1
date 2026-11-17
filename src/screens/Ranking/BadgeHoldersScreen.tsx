import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { BadgedAvatar } from "../../components/Gamification/BadgedAvatar";
import {
  BadgeDetailModal,
  BadgeEmblemRow,
} from "../../components/Gamification/BadgeEmblem";
import { useRankingGamification } from "../../hooks/useRankingGamification";
import { userService } from "../../services/userServices";
import type { User } from "../../types/auth";
import type { BadgeDefinition } from "../../types/rankingGamification";
import { resolveProfilePhotoUri } from "../../utils/chatDisplayNames";
import {
  resolveAvatarBadgeDefinition,
  resolveAvatarRingDefinition,
} from "../../utils/badgeRules";

export const BadgeHoldersScreen = () => {
  const gamification = useRankingGamification();
  const [search, setSearch] = useState("");
  const [badgeFilter, setBadgeFilter] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDefinition | null>(
    null,
  );
  const [usersById, setUsersById] = useState<Map<string, User>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());

  const holderIds = useMemo(
    () => Array.from(gamification.badgesByUser.keys()),
    [gamification.badgesByUser],
  );

  useEffect(() => {
    let cancelled = false;
    const missing = holderIds.filter(
      (id) => !usersById.has(id) && !loadingRef.current.has(id),
    );
    missing.forEach((id) => loadingRef.current.add(id));
    if (missing.length === 0) return;
    Promise.all(
      missing.map(async (id) => {
        try {
          const lite = await userService.getUserLiteById(id);
          return lite ? ([id, lite] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setUsersById((prev) => {
        const next = new Map(prev);
        entries.forEach((entry) => {
          if (entry) next.set(entry[0], entry[1]);
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [holderIds, usersById]);

  const holders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return holderIds
      .map((userId) => {
        const lite = usersById.get(userId);
        const badges = gamification.badgesByUser.get(userId) || [];
        return {
          userId,
          displayName: lite?.name || "Participante",
          photoUri: resolveProfilePhotoUri(lite as any),
          ringDefinition: resolveAvatarRingDefinition(
            gamification.definitionsById.get(
              (lite as any)?.activeBadgeBorderId,
            ),
          ),
          badgeDefinition: resolveAvatarBadgeDefinition(
            gamification.definitionsById.get(
              (lite as any)?.activeBadgeBorderId,
            ),
            badges,
          ),
          badges,
        };
      })
      .filter((holder) =>
        badgeFilter
          ? holder.badges.some((badge) => badge.id === badgeFilter)
          : true,
      )
      .filter((holder) =>
        term ? holder.displayName.toLowerCase().includes(term) : true,
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"));
  }, [
    badgeFilter,
    gamification.badgesByUser,
    gamification.definitionsById,
    holderIds,
    search,
    usersById,
  ]);

  return (
    <Layout title="Detentores de Insígnias" showBackButton showSidebar>
      <FlatList
        style={styles.container}
        data={gamification.loading || gamification.error ? [] : holders}
        keyExtractor={(item) => item.userId}
        numColumns={2}
        columnWrapperStyle={styles.column}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={
          <>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome"
            placeholderTextColor="#777"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
        >
          <TouchableOpacity
            style={[styles.chip, !badgeFilter && styles.chipActive]}
            onPress={() => setBadgeFilter(null)}
          >
            <Text
              style={[styles.chipText, !badgeFilter && styles.chipTextActive]}
            >
              Todas
            </Text>
          </TouchableOpacity>
          {gamification.definitions
            .filter((definition) => definition.isActive)
            .map((definition) => (
              <TouchableOpacity
                key={definition.id}
                style={[
                  styles.chip,
                  badgeFilter === definition.id && styles.chipActive,
                ]}
                onPress={() =>
                  setBadgeFilter(
                    badgeFilter === definition.id ? null : definition.id,
                  )
                }
              >
                <Ionicons
                  name={definition.icon as any}
                  size={14}
                  color={definition.primaryColor}
                />
                <Text
                  style={[
                    styles.chipText,
                    badgeFilter === definition.id && styles.chipTextActive,
                  ]}
                >
                  {definition.name}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
          </>
        }
        ListEmptyComponent={
          gamification.loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#8c52ff" />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {gamification.error
                  ? "Não foi possível carregar os detentores."
                  : "Nenhum detentor encontrado."}
              </Text>
            </View>
          )
        }
        renderItem={({ item: holder }) => (
          <View style={styles.card}>
            <BadgedAvatar
              photoUri={holder.photoUri}
              displayName={holder.displayName}
              size={56}
              ringDefinition={holder.ringDefinition}
              badgeDefinition={holder.badgeDefinition}
            />
            <Text style={styles.cardName} numberOfLines={1}>
              {holder.displayName}
            </Text>
            <BadgeEmblemRow
              definitions={holder.badges}
              onPress={setSelectedBadge}
            />
          </View>
        )}
      />

      <BadgeDetailModal
        definition={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 14 },
  chipsRow: { marginBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c1c1c",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: { backgroundColor: "#8c52ff" },
  chipText: { color: "#ccc", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  center: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#999", fontSize: 14, textAlign: "center" },
  column: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: "#161616",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 8,
  },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
