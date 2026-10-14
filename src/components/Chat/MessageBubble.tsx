import React, { useMemo, useRef } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { profilePhotoUri } from "../../utils/chatDisplayNames";
import { ChatMessageText } from "./ChatMessageText";
import { ChatMention } from "../../utils/chatMentions";
import { ChatReplyTo, Message } from "../../services/chatService";

export interface ChatMessageBubbleProps {
  msg: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  senderLabel: string;
  senderPhotoBase64?: string;
  highlighted?: boolean;
  replySenderLabel?: string;
  onLongPress?: () => void;
  onReactionPress?: (
    emoji: string,
    anchor: { x: number; y: number; width: number; height: number },
  ) => void;
}

const groupReactions = (reactions?: Record<string, string>) => {
  const counts = new Map<string, number>();
  Object.values(reactions || {}).forEach((emoji) => {
    if (!emoji) return;
    counts.set(emoji, (counts.get(emoji) || 0) + 1);
  });
  return Array.from(counts.entries());
};

export const MessageBubble = React.memo(function MessageBubble({
  msg,
  isOwn,
  showAvatar = false,
  showSenderName = false,
  senderLabel,
  senderPhotoBase64,
  highlighted = false,
  replySenderLabel,
  onLongPress,
  onReactionPress,
}: ChatMessageBubbleProps) {
  const initial = (senderLabel || "U").charAt(0).toUpperCase();
  const reactionChips = useMemo(
    () => groupReactions(msg.reactions),
    [msg.reactions],
  );
  const chipRefs = useRef<Record<string, any>>({});
  const replyTo = msg.replyTo as ChatReplyTo | null | undefined;
  const mentions = (msg.mentions || []) as ChatMention[];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.9}
        onLongPress={onLongPress}
        delayLongPress={350}
        disabled={!onLongPress}
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: isOwn ? "flex-end" : "flex-start",
        }}
      >
        {showAvatar && !isOwn && (
          <View style={styles.msgAvatarContainer}>
            {profilePhotoUri(senderPhotoBase64) ? (
              <Image
                source={{ uri: profilePhotoUri(senderPhotoBase64) as string }}
                style={styles.msgAvatar}
              />
            ) : (
              <View style={styles.msgAvatarFallback}>
                <Text style={styles.msgAvatarInitial}>{initial}</Text>
              </View>
            )}
          </View>
        )}

        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.ownMessage : styles.otherMessage,
            showAvatar && { marginLeft: 4 },
            highlighted && styles.highlighted,
          ]}
        >
          {showSenderName ? (
            <Text style={[styles.senderName, isOwn && styles.ownSenderName]}>
              {senderLabel}
            </Text>
          ) : null}

          {replyTo ? (
            <View
              style={[
                styles.replyBox,
                isOwn ? styles.replyBoxOwn : styles.replyBoxOther,
              ]}
            >
              <Text
                style={[
                  styles.replyAuthor,
                  isOwn && styles.replyAuthorOwn,
                ]}
                numberOfLines={1}
              >
                {replySenderLabel || "Mensagem"}
              </Text>
              <Text
                style={[styles.replyText, isOwn && styles.replyTextOwn]}
                numberOfLines={2}
              >
                {replyTo.text}
              </Text>
            </View>
          ) : null}

          <ChatMessageText
            text={msg.text}
            isOwn={isOwn}
            style={styles.messageText}
            mentions={mentions}
          />

          <Text
            numberOfLines={1}
            allowFontScaling={false}
            style={[
              styles.messageTime,
              isOwn ? styles.ownMessageTime : styles.otherMessageTime,
            ]}
          >
            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </TouchableOpacity>

      {reactionChips.length > 0 ? (
        <View
          style={[
            styles.reactionsRow,
            isOwn ? styles.reactionsOwn : styles.reactionsOther,
          ]}
        >
          {reactionChips.map(([emoji, count]) => (
            <TouchableOpacity
              key={emoji}
              ref={(node) => {
                chipRefs.current[emoji] = node;
              }}
              style={styles.reactionChip}
              onPress={(event) => {
                const node = chipRefs.current[emoji];
                const emit = (anchor: {
                  x: number;
                  y: number;
                  width: number;
                  height: number;
                }) => onReactionPress?.(emoji, anchor);
                if (typeof node?.measureInWindow === "function") {
                  node.measureInWindow(
                    (x: number, y: number, width: number, height: number) => {
                      emit({ x, y, width, height });
                    },
                  );
                  return;
                }
                const element = node?.getNode?.() || node?._nativeNode || node;
                const rect = element?.getBoundingClientRect?.();
                if (rect && rect.width) {
                  emit({
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                  });
                  return;
                }
                const pageX = event.nativeEvent?.pageX ?? 24;
                const pageY = event.nativeEvent?.pageY ?? 80;
                emit({ x: pageX - 18, y: pageY - 14, width: 36, height: 28 });
              }}
            >
              <Text style={styles.reactionEmoji}>
                {emoji}
                {count > 1 ? ` ${count}` : ""}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingHorizontal: 8,
  },
  messageBubble: {
    marginHorizontal: 12,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 48,
    paddingBottom: 22,
    borderRadius: 18,
    maxWidth: "70%",
    position: "relative",
  },
  ownMessage: { alignSelf: "flex-end", backgroundColor: "#8c52ff" },
  otherMessage: { alignSelf: "flex-start", backgroundColor: "#f4eaff" },
  highlighted: {
    borderWidth: 2,
    borderColor: "#ffe56a",
  },
  messageText: {
    paddingRight: 6,
    flexShrink: 1,
  },
  messageTime: {
    fontSize: 10,
    lineHeight: 10,
    color: "#666",
    position: "absolute",
    right: 8,
    bottom: 6,
    minWidth: 36,
    textAlign: "right",
    includeFontPadding: false,
  },
  ownMessageTime: { color: "rgba(255,255,255,0.85)" },
  otherMessageTime: { color: "#666" },
  senderName: {
    fontSize: 12,
    color: "#5a4b7a",
    fontWeight: "600",
    marginBottom: 4,
  },
  ownSenderName: {
    color: "rgba(255,255,255,0.9)",
  },
  replyBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    borderRadius: 8,
  },
  replyBoxOwn: {
    borderLeftColor: "rgba(255,255,255,0.8)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  replyBoxOther: {
    borderLeftColor: "#8c52ff",
    backgroundColor: "rgba(140,82,255,0.12)",
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5a4b7a",
  },
  replyAuthorOwn: {
    color: "#fff",
  },
  replyText: {
    fontSize: 12,
    color: "#4b3d6b",
  },
  replyTextOwn: {
    color: "rgba(255,255,255,0.9)",
  },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: -4,
    marginBottom: 6,
    gap: 4,
  },
  reactionsOwn: {
    justifyContent: "flex-end",
    paddingRight: 20,
  },
  reactionsOther: {
    paddingLeft: 56,
  },
  reactionChip: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#e4d7ff",
  },
  reactionEmoji: {
    fontSize: 12,
  },
  msgAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  msgAvatar: { width: 40, height: 40 },
  msgAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e9e5f8",
    justifyContent: "center",
    alignItems: "center",
  },
  msgAvatarInitial: { fontSize: 14, fontWeight: "700", color: "#5a4b7a" },
});

export default MessageBubble;
