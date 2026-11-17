import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BadgeDefinition } from "../../types/rankingGamification";

export const BadgeEmblemRow = ({
  definitions,
  max = 3,
  onPress,
  size = 22,
}: {
  definitions: BadgeDefinition[];
  max?: number;
  onPress?: (definition: BadgeDefinition) => void;
  size?: number;
}) => {
  if (!definitions.length) return null;
  const visible = definitions.slice(0, max);
  const extra = definitions.length - visible.length;
  return (
    <View style={styles.row}>
      {visible.map((definition) => (
        <TouchableOpacity
          key={definition.id}
          accessibilityLabel={`Insígnia ${definition.name}`}
          onPress={() => onPress?.(definition)}
          style={[
            styles.chip,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: definition.primaryColor,
              backgroundColor: "#17121f",
            },
          ]}
        >
          <Ionicons
            name={definition.icon as any}
            size={Math.max(11, size * 0.58)}
            color={definition.secondaryColor}
          />
        </TouchableOpacity>
      ))}
      {extra > 0 ? <Text style={styles.extra}>+{extra}</Text> : null}
    </View>
  );
};

export const BadgeDetailModal = ({
  definition,
  onClose,
}: {
  definition: BadgeDefinition | null;
  onClose: () => void;
}) => (
  <Modal visible={Boolean(definition)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <View style={styles.card}>
        {definition ? (
          <>
            <View
              style={[
                styles.bigChip,
                {
                  borderColor: definition.primaryColor,
                  backgroundColor: "#17121f",
                },
              ]}
            >
              <Ionicons
                name={definition.icon as any}
                size={30}
                color={definition.secondaryColor}
              />
            </View>
            <Text style={styles.title}>{definition.name}</Text>
            <Text style={styles.meaning}>{definition.meaning}</Text>
            <Text style={styles.description}>{definition.description}</Text>
          </>
        ) : null}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  chip: {
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  extra: { color: "#c084fc", fontSize: 11, fontWeight: "700" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#171321",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#333",
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  bigChip: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center" },
  meaning: { color: "#c084fc", fontSize: 14, fontWeight: "700", textAlign: "center" },
  description: { color: "#bbb", fontSize: 14, lineHeight: 20, textAlign: "center" },
  closeButton: {
    marginTop: 10,
    backgroundColor: "#B900FF",
    borderRadius: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  closeText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
