import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import { openChatLink, parseMessageSegments } from "../../utils/chatMessageText";

type ChatMessageTextProps = {
  text: string;
  isOwn?: boolean;
  style?: TextStyle;
};

export const ChatMessageText = ({
  text,
  isOwn = false,
  style,
}: ChatMessageTextProps) => {
  const segments = parseMessageSegments(text);

  return (
    <Text style={[styles.text, style, isOwn && styles.textOwn]}>
      {segments.map((segment, index) => {
        if (segment.type === "link") {
          return (
            <Text
              key={`link-${index}-${segment.href}`}
              style={[styles.link, isOwn ? styles.linkOwn : styles.linkOther]}
              onPress={() => {
                openChatLink(segment.href).catch(() => undefined);
              }}
            >
              {segment.value}
            </Text>
          );
        }

        return segment.value;
      })}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
  },
  textOwn: {
    color: "#fff",
  },
  link: {
    textDecorationLine: "underline",
    fontWeight: "600",
  },
  linkOwn: {
    color: "#fff",
  },
  linkOther: {
    color: "#5a32c7",
  },
});

export default ChatMessageText;
