import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CHAT_REACTION_EMOJIS } from "../../utils/chatMentions";

type MessageActionSheetProps = {
  visible: boolean;
  isOwn: boolean;
  canEditOrDelete?: boolean;
  currentReaction?: string | null;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
};

export const MessageActionSheet: React.FC<MessageActionSheetProps> = ({
  visible,
  isOwn,
  canEditOrDelete = false,
  currentReaction,
  onClose,
  onReact,
  onReply,
  onEdit,
  onDelete,
  onReport,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.emojiRow}>
            {CHAT_REACTION_EMOJIS.map((emoji) => {
              const selected = currentReaction === emoji;
              return (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.emojiButton, selected && styles.emojiSelected]}
                  onPress={() => onReact(emoji)}
                  accessibilityLabel={`Reagir com ${emoji}`}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.action} onPress={onReply}>
            <Ionicons name="arrow-undo-outline" size={20} color="#f2f2f2" />
            <Text style={styles.actionText}>Responder</Text>
          </TouchableOpacity>

          {isOwn && canEditOrDelete && onEdit ? (
            <TouchableOpacity style={styles.action} onPress={onEdit}>
              <Ionicons name="create-outline" size={20} color="#f2f2f2" />
              <Text style={styles.actionText}>Editar</Text>
            </TouchableOpacity>
          ) : null}

          {isOwn && canEditOrDelete && onDelete ? (
            <TouchableOpacity style={styles.action} onPress={onDelete}>
              <Ionicons name="trash-outline" size={20} color="#ff6b7a" />
              <Text style={[styles.actionText, styles.dangerText]}>Apagar</Text>
            </TouchableOpacity>
          ) : null}

          {!isOwn && onReport ? (
            <TouchableOpacity style={styles.action} onPress={onReport}>
              <Ionicons name="flag-outline" size={20} color="#ff6b7a" />
              <Text style={[styles.actionText, styles.dangerText]}>
                Denunciar
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.action} onPress={onClose}>
            <Ionicons name="close-outline" size={20} color="#b8b8b8" />
            <Text style={[styles.actionText, styles.mutedText]}>Cancelar</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    padding: 16,
  },
  sheet: {
    backgroundColor: "#1c1c1e",
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  emojiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 4,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiSelected: {
    backgroundColor: "#3a3a3c",
  },
  emoji: {
    fontSize: 26,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  actionText: {
    color: "#f2f2f2",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerText: {
    color: "#ff6b7a",
  },
  mutedText: {
    color: "#b8b8b8",
    fontWeight: "500",
  },
});

export default MessageActionSheet;
