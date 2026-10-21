import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useAuth } from "../../hooks/useAuth";
import { useRankingGamification } from "../../hooks/useRankingGamification";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import { userService } from "../../services/userServices";
import type { User } from "../../types/auth";
import {
  BADGE_BORDER_PRESETS,
  BADGE_ICONS,
  type BadgeDefinition,
  type BadgeDefinitionInput,
} from "../../types/rankingGamification";

const emptyForm: BadgeDefinitionInput = {
  id: "",
  name: "",
  meaning: "",
  description: "",
  icon: "medal",
  primaryColor: "#8c52ff",
  secondaryColor: "#c0c6d4",
  borderPreset: "solid-violet",
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const BadgeManagementScreen = () => {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin === true || user?.role === "admin";
  const gamification = useRankingGamification(isAdmin);
  const [form, setForm] = useState<BadgeDefinitionInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    userService
      .getAllUsersLite()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [isAdmin]);

  const holderCountByBadge = useMemo(() => {
    const map = new Map<string, number>();
    gamification.grants.forEach((grant) =>
      map.set(grant.badgeId, (map.get(grant.badgeId) || 0) + 1),
    );
    return map;
  }, [gamification.grants]);

  const filteredUsers = useMemo(() => {
    const term = userQuery.trim().toLowerCase();
    return users
      .filter((item) =>
        term
          ? `${item.name || ""} ${item.email || ""}`
              .toLowerCase()
              .includes(term)
          : true,
      )
      .slice(0, 20);
  }, [userQuery, users]);

  const formValid =
    form.name.trim().length >= 3 &&
    form.meaning.trim().length >= 3 &&
    HEX.test(form.primaryColor.trim()) &&
    HEX.test(form.secondaryColor.trim()) &&
    (editingId ? true : /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.id.trim()));

  const handleSave = async () => {
    if (!formValid || saving) return;
    try {
      setSaving(true);
      await rankingGamificationService.upsertBadgeDefinition({
        ...form,
        id: (editingId || form.id).trim(),
        name: form.name.trim(),
        meaning: form.meaning.trim(),
        description: form.description.trim(),
      });
      setForm(emptyForm);
      setEditingId(null);
      Alert.alert("Insígnias", "Definição salva com sucesso.");
    } catch (error: any) {
      Alert.alert(
        "Erro",
        error?.message || "Não foi possível salvar a insígnia.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (definition: BadgeDefinition) => {
    try {
      await rankingGamificationService.setBadgeDefinitionActive(
        definition.id,
        !definition.isActive,
      );
    } catch (error: any) {
      Alert.alert("Erro", error?.message || "Não foi possível atualizar.");
    }
  };

  const handleGrantToggle = async (badgeId: string, hasBadge: boolean) => {
    if (!selectedUser || busyKey) return;
    const run = async () => {
      try {
        setBusyKey(badgeId);
        if (hasBadge) {
          await rankingGamificationService.revokeBadge(selectedUser.id, badgeId);
        } else {
          await rankingGamificationService.grantBadge(selectedUser.id, badgeId);
        }
      } catch (error: any) {
        Alert.alert(
          "Erro",
          error?.message || "Não foi possível atualizar a concessão.",
        );
      } finally {
        setBusyKey(null);
      }
    };
    if (hasBadge) {
      Alert.alert(
        "Remover insígnia",
        `Remover esta insígnia de ${selectedUser.name}? Se for a borda ativa, ela volta ao padrão.`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Remover", style: "destructive", onPress: run },
        ],
      );
    } else {
      run();
    }
  };

  if (!isAdmin) {
    return (
      <Layout title="Insígnias" showBackButton showSidebar>
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            Acesso restrito ao administrador.
          </Text>
        </View>
      </Layout>
    );
  }

  const selectedUserBadgeIds = new Set(
    (gamification.grantsByUser.get(selectedUser?.id || "") || []).map(
      (grant) => grant.badgeId,
    ),
  );

  return (
    <Layout title="Gerenciar Insígnias" showBackButton showSidebar>
      <ScrollView style={styles.container}>
        <Text style={styles.sectionTitle}>
          {editingId ? "Editar insígnia" : "Nova insígnia"}
        </Text>
        {!editingId ? (
          <TextInput
            style={styles.input}
            placeholder="ID único (ex.: foco-total)"
            placeholderTextColor="#777"
            autoCapitalize="none"
            value={form.id}
            onChangeText={(value) => setForm({ ...form, id: value })}
          />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Nome"
          placeholderTextColor="#777"
          value={form.name}
          onChangeText={(value) => setForm({ ...form, name: value })}
        />
        <TextInput
          style={styles.input}
          placeholder="Significado curto"
          placeholderTextColor="#777"
          value={form.meaning}
          onChangeText={(value) => setForm({ ...form, meaning: value })}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Descrição"
          placeholderTextColor="#777"
          multiline
          value={form.description}
          onChangeText={(value) => setForm({ ...form, description: value })}
        />
        <Text style={styles.label}>Ícone</Text>
        <View style={styles.wrap}>
          {BADGE_ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[styles.chip, form.icon === icon && styles.chipActive]}
              onPress={() => setForm({ ...form, icon })}
            >
              <Ionicons
                name={icon as any}
                size={16}
                color={form.icon === icon ? "#fff" : "#c084fc"}
              />
              <Text
                style={[
                  styles.chipText,
                  form.icon === icon && styles.chipTextActive,
                ]}
              >
                {icon}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.colorRow}>
          <TextInput
            style={[styles.input, styles.colorInput]}
            placeholder="#8c52ff"
            placeholderTextColor="#777"
            autoCapitalize="none"
            value={form.primaryColor}
            onChangeText={(value) => setForm({ ...form, primaryColor: value })}
          />
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor: HEX.test(form.primaryColor)
                  ? form.primaryColor
                  : "#333",
              },
            ]}
          />
          <TextInput
            style={[styles.input, styles.colorInput]}
            placeholder="#c0c6d4"
            placeholderTextColor="#777"
            autoCapitalize="none"
            value={form.secondaryColor}
            onChangeText={(value) =>
              setForm({ ...form, secondaryColor: value })
            }
          />
          <View
            style={[
              styles.colorPreview,
              {
                backgroundColor: HEX.test(form.secondaryColor)
                  ? form.secondaryColor
                  : "#333",
              },
            ]}
          />
        </View>
        <Text style={styles.label}>Borda</Text>
        <View style={styles.wrap}>
          {BADGE_BORDER_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[
                styles.chip,
                form.borderPreset === preset && styles.chipActive,
              ]}
              onPress={() => setForm({ ...form, borderPreset: preset })}
            >
              <Text
                style={[
                  styles.chipText,
                  form.borderPreset === preset && styles.chipTextActive,
                ]}
              >
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.saveButton, !formValid && styles.disabled]}
          disabled={!formValid || saving}
          onPress={handleSave}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>
              {editingId ? "Salvar alterações" : "Criar insígnia"}
            </Text>
          )}
        </TouchableOpacity>
        {editingId ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setEditingId(null);
              setForm(emptyForm);
            }}
          >
            <Text style={styles.cancelText}>Cancelar edição</Text>
          </TouchableOpacity>
        ) : null}

        <Text style={styles.sectionTitle}>Catálogo</Text>
        {gamification.loading ? (
          <ActivityIndicator size="large" color="#8c52ff" />
        ) : (
          gamification.definitions.map((definition) => (
            <View key={definition.id} style={styles.card}>
              <Ionicons
                name={definition.icon as any}
                size={22}
                color={definition.primaryColor}
              />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>
                  {definition.name}
                  {definition.isOfficial ? " · oficial" : ""}
                  {definition.isActive ? "" : " · inativa"}
                </Text>
                <Text style={styles.cardMeta}>
                  {holderCountByBadge.get(definition.id) || 0} detentores ·{" "}
                  {definition.borderPreset}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => {
                  setEditingId(definition.id);
                  setForm({
                    id: definition.id,
                    name: definition.name,
                    meaning: definition.meaning,
                    description: definition.description,
                    icon: definition.icon,
                    primaryColor: definition.primaryColor,
                    secondaryColor: definition.secondaryColor,
                    borderPreset: definition.borderPreset,
                  });
                }}
              >
                <Text style={styles.smallButtonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => handleToggleActive(definition)}
              >
                <Text style={styles.smallButtonText}>
                  {definition.isActive ? "Desativar" : "Ativar"}
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Conceder ou remover</Text>
        <TextInput
          style={styles.input}
          placeholder="Buscar usuário por nome ou email"
          placeholderTextColor="#777"
          value={userQuery}
          onChangeText={(value) => {
            setUserQuery(value);
            setSelectedUser(null);
          }}
        />
        {!selectedUser ? (
          filteredUsers.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => setSelectedUser(item)}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name || "Usuário"}</Text>
                <Text style={styles.cardMeta}>{item.email || ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#888" />
            </TouchableOpacity>
          ))
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{selectedUser.name}</Text>
                <Text style={styles.cardMeta}>{selectedUser.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => setSelectedUser(null)}
              >
                <Text style={styles.smallButtonText}>Trocar</Text>
              </TouchableOpacity>
            </View>
            {gamification.definitions
              .filter((definition) => definition.isActive)
              .map((definition) => {
                const hasBadge = selectedUserBadgeIds.has(definition.id);
                return (
                  <View key={definition.id} style={styles.card}>
                    <Ionicons
                      name={definition.icon as any}
                      size={20}
                      color={definition.primaryColor}
                    />
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{definition.name}</Text>
                      <Text style={styles.cardMeta}>
                        {hasBadge ? "Concedida" : "Não concedida"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.smallButton,
                        hasBadge && styles.dangerButton,
                      ]}
                      disabled={busyKey === definition.id}
                      onPress={() => handleGrantToggle(definition.id, hasBadge)}
                    >
                      <Text style={styles.smallButtonText}>
                        {busyKey === definition.id
                          ? "..."
                          : hasBadge
                            ? "Remover"
                            : "Conceder"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
          </>
        )}
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { color: "#999", fontSize: 14 },
  sectionTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 10,
  },
  label: { color: "#aaa", fontSize: 12, fontWeight: "700", marginVertical: 8 },
  input: {
    backgroundColor: "#161616",
    color: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: { minHeight: 64, textAlignVertical: "top" },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1c1c1c",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: "#8c52ff" },
  chipText: { color: "#ccc", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  colorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorInput: { flex: 1 },
  colorPreview: { width: 26, height: 26, borderRadius: 13, marginBottom: 10 },
  saveButton: {
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  disabled: { opacity: 0.45 },
  saveText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  cancelButton: { alignItems: "center", paddingVertical: 10 },
  cancelText: { color: "#c084fc", fontSize: 13, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#161616",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardInfo: { flex: 1 },
  cardName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardMeta: { color: "#999", fontSize: 12, marginTop: 2 },
  smallButton: {
    backgroundColor: "#241541",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dangerButton: { backgroundColor: "#4a1f24" },
  smallButtonText: { color: "#c084fc", fontSize: 12, fontWeight: "700" },
});
