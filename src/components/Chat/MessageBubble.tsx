import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export interface ChatMessageBubbleProps {
  msg: { id?: string; text: string; createdAt: Date };
  isOwn: boolean;
  showAvatar?: boolean;
  showSenderName?: boolean;
  senderLabel: string;
  senderPhotoBase64?: string;
}

export const MessageBubble = React.memo(function MessageBubble({
  msg,
  isOwn,
  showAvatar = false,
  showSenderName = false,
  senderLabel,
  senderPhotoBase64,
}: ChatMessageBubbleProps) {
  const initial = (senderLabel || "U").charAt(0).toUpperCase();

  return (
    <View style={styles.wrapper}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: isOwn ? "flex-end" : "flex-start",
        }}
      >
        {showAvatar && !isOwn && (
          <View style={styles.msgAvatarContainer}>
            {senderPhotoBase64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${senderPhotoBase64}` }}
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
          ]}
        >
          {showSenderName && !isOwn && (
            <Text style={styles.senderName}>{senderLabel}</Text>
          )}

          <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
            {msg.text}
          </Text>

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
      </View>
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
  messageText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    paddingRight: 6,
    flexShrink: 1,
  },
  ownMessageText: { color: "#fff" },
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
