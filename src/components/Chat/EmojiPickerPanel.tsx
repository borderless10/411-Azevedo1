import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { CHAT_EMOJIS } from "../../utils/chatMessageText";

type EmojiPickerPanelProps = {
  onSelect: (emoji: string) => void;
};

export const EmojiPickerPanel = ({ onSelect }: EmojiPickerPanelProps) => (
  <View style={styles.container}>
    <ScrollView
      contentContainerStyle={styles.grid}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      {CHAT_EMOJIS.map((emoji) => (
        <TouchableOpacity
          key={emoji}
          style={styles.emojiButton}
          onPress={() => onSelect(emoji)}
          accessibilityLabel={`Emoji ${emoji}`}
        >
          <Text style={styles.emoji}>{emoji}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    backgroundColor: "#121212",
    maxHeight: 200,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  emojiButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 28,
  },
});

export default EmojiPickerPanel;
