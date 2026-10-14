import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { CHAT_EMOJIS } from "../../utils/chatMessageText";

type EmojiPickerPanelProps = {
  onSelect: (emoji: string) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export const EmojiPickerPanel = ({
  onSelect,
  height,
  style,
}: EmojiPickerPanelProps) => (
  <View style={[styles.container, height ? { height, maxHeight: height } : null, style]}>
    <ScrollView
      style={height ? { height } : styles.scroll}
      contentContainerStyle={styles.grid}
      keyboardShouldPersistTaps="always"
      nestedScrollEnabled
      showsVerticalScrollIndicator
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
  scroll: {
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
