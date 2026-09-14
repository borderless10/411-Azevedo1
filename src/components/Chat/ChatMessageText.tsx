import React from "react";
import { StyleSheet, Text, TextStyle } from "react-native";
import {
  openChatLink,
  parseMessageSegments,
} from "../../utils/chatMessageText";
import { ChatMention, parseMentionSegments } from "../../utils/chatMentions";

type ChatMessageTextProps = {
  text: string;
  isOwn?: boolean;
  style?: TextStyle;
  mentions?: ChatMention[];
};

type RenderSegment =
  | { key: string; type: "text"; value: string }
  | { key: string; type: "link"; value: string; href: string }
  | { key: string; type: "mention"; value: string };

export const ChatMessageText = ({
  text,
  isOwn = false,
  style,
  mentions = [],
}: ChatMessageTextProps) => {
  const mentionSegments = parseMentionSegments(text, mentions);
  const expanded: RenderSegment[] = [];

  mentionSegments.forEach((segment, mentionIndex) => {
    if (segment.type === "mention") {
      expanded.push({
        key: `mention-${mentionIndex}`,
        type: "mention",
        value: segment.value,
      });
      return;
    }

    parseMessageSegments(segment.value).forEach((item, index) => {
      if (item.type === "link") {
        expanded.push({
          key: `${mentionIndex}-${index}-link`,
          type: "link",
          value: item.value,
          href: item.href,
        });
        return;
      }
      expanded.push({
        key: `${mentionIndex}-${index}-text`,
        type: "text",
        value: item.value,
      });
    });
  });

  return (
    <Text style={[styles.text, style, isOwn && styles.textOwn]}>
      {expanded.map((segment) => {
        if (segment.type === "link") {
          return (
            <Text
              key={segment.key}
              style={[styles.link, isOwn ? styles.linkOwn : styles.linkOther]}
              onPress={() => {
                openChatLink(segment.href).catch(() => undefined);
              }}
            >
              {segment.value}
            </Text>
          );
        }

        if (segment.type === "mention") {
          return (
            <Text
              key={segment.key}
              style={[
                styles.mention,
                isOwn ? styles.mentionOwn : styles.mentionOther,
              ]}
            >
              {segment.value}
            </Text>
          );
        }

        return <Text key={segment.key}>{segment.value}</Text>;
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
  mention: {
    fontWeight: "700",
  },
  mentionOwn: {
    color: "#ffe56a",
  },
  mentionOther: {
    color: "#5a32c7",
  },
});

export default ChatMessageText;
