import React from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { RankingPreference } from "../../types/auth";
import { canOpenPublicGamificationProfile } from "../../utils/publicGamificationProfile";

/**
 * Foto de usuário ampliada: fundo escuro, foto grande centralizada,
 * nome abaixo e fechamento ao tocar em qualquer ponto.
 */
export const PhotoPreviewModal = ({
  visible,
  uri,
  name,
  userId,
  rankingPreference,
  onViewProfile,
  onClose,
}: {
  visible: boolean;
  uri?: string | null;
  name?: string | null;
  userId?: string | null;
  rankingPreference?: RankingPreference | null;
  onViewProfile?: (userId: string) => void;
  onClose: () => void;
}) => {
  const canViewProfile =
    Boolean(onViewProfile) &&
    canOpenPublicGamificationProfile(userId, rankingPreference);
  const initials = String(name || "?")
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Fechar foto ampliada"
        activeOpacity={1}
        style={styles.overlay}
        onPress={onClose}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>{initials || "?"}</Text>
          </View>
        )}
        {name ? <Text style={styles.name}>{name}</Text> : null}
        {canViewProfile && userId ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil de conquistas de ${name || "usuário"}`}
            style={styles.profileButton}
            onPress={() => onViewProfile?.(userId)}
          >
            <Ionicons name="trophy-outline" size={18} color="#fff" />
            <Text style={styles.profileButtonText}>Ver perfil</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.close}>
          <Ionicons name="close" size={22} color="#fff" />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  image: { width: "100%", height: "75%", borderRadius: 16 },
  avatarFallback: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#2b2b2b",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "800",
  },
  name: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 16,
    textAlign: "center",
  },
  profileButton: {
    minHeight: 44,
    marginTop: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#8c52ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  profileButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  close: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
});
