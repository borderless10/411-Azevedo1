import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useUserChats } from "../../hooks/useUserChats";
import { useChatMessages } from "../../hooks/useChatMessages";
import { Layout } from "../../components/Layout/Layout";
import chatService from "../../services/chatService";
import { userService } from "../../services/userServices";

export const ChatScreen: React.FC = () => {
  const { user } = useAuth();
  const { chats, isLoading } = useUserChats(
    user?.id || null,
    user?.role || null,
  );

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [globalChat, setGlobalChat] = useState<any>(null);

  const { messages, sendMessage } = useChatMessages(
    selectedChatId || "",
    user?.id || "",
    20,
  );

  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const flatListRef = useRef<FlatList<any> | null>(null);

  // Ensure global chat exists and direct chat with consultant
  useEffect(() => {
    if (!user?.id || !user?.role) return;

    const initChats = async () => {
      try {
        const global = await chatService.createChatIfNotExists(
          user.id,
          "system",
          "global",
        );
        setGlobalChat(global);

        if (
          (user.role === "user" || user.role === "cliente_premium") &&
          (user as any).consultantId
        ) {
          const consultantId = (user as any).consultantId;
          await chatService.createChatIfNotExists(
            user.id,
            consultantId,
            "direct",
          );
        }
      } catch (error) {
        console.warn("Error initializing chats:", error);
      }
    };

    initChats();
  }, [user?.id, user?.role, (user as any)?.consultantId]);

  // Deduplicate and sort chats - Include global chat manually
  const processedChats = useMemo(() => {
    let allChats = [...(chats || [])];
    if (globalChat && !allChats.find((c) => c.id === "global"))
      allChats.unshift(globalChat);
    if (!allChats.length) return [];

    const deduped = new Map();
    allChats.forEach((chat) => {
      if (!deduped.has(chat.id)) deduped.set(chat.id, chat);
    });

    const result = Array.from(deduped.values());
    return result.sort((a, b) => {
      if (a.type === "global") return -1;
      if (b.type === "global") return 1;
      const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  }, [chats, globalChat]);

  // Fetch sender info (avatar/name) for messages shown in the conversation
  useEffect(() => {
    const missingIds = Array.from(
      new Set((messages || []).map((m: any) => m.senderId)),
    ).filter((id) => id && !userMap[id]);

    if (!missingIds.length) return;
    let mounted = true;

    (async () => {
      try {
        const results: Record<string, any> = {};
        for (const id of missingIds) {
          try {
            const u = await userService.getUserById(id);
            if (u) results[id] = u;
          } catch (err) {
            // ignore
          }
        }
        if (mounted) setUserMap((prev) => ({ ...prev, ...results }));
      } catch (err) {
        console.warn("Erro ao buscar usuários do chat:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [messages]);

  // Conversation helpers
  const selectedChat = processedChats.find((c) => c.id === selectedChatId);
  const chatMessages = messages;

  // Auto-scroll to latest message when messages change
  useEffect(() => {
    try {
      if (flatListRef.current) {
        // @ts-ignore
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (err) {
      // ignore
    }
  }, [chatMessages.length]);

  // For private/direct chats show header avatar/name (fetch if missing)
  const isPrivateChat =
    selectedChat?.type === "direct" &&
    selectedChat?.participants &&
    selectedChat.participants.length === 2;
  const otherParticipantId = isPrivateChat
    ? selectedChat.participants.find((id: string) => id !== user?.id)
    : null;

  useEffect(() => {
    if (!otherParticipantId || userMap[otherParticipantId]) return;
    let mounted = true;
    (async () => {
      try {
        const u = await userService.getUserById(otherParticipantId);
        if (u && mounted)
          setUserMap((p) => ({ ...p, [otherParticipantId]: u }));
      } catch (err) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, [otherParticipantId]);

  // Animated MessageBubble component
  const MessageBubble: React.FC<{
    msg: any;
    isOwn: boolean;
    showAvatar?: boolean;
    sender?: any;
  }> = ({ msg, isOwn, showAvatar = false, sender }) => {
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }, [anim]);

    return (
      <Animated.View
        style={{
          opacity: anim,
          width: "100%",
          paddingHorizontal: 8,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.99, 1],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: isOwn ? "flex-end" : "flex-start",
          }}
        >
          {showAvatar && !isOwn && (
            <View style={styles.msgAvatarContainer}>
              {sender?.photoBase64 ? (
                <Image
                  source={{
                    uri: `data:image/png;base64,${sender.photoBase64}`,
                  }}
                  style={styles.msgAvatar}
                />
              ) : (
                <View style={styles.msgAvatarFallback}>
                  <Text style={styles.msgAvatarInitial}>
                    {(
                      (sender?.name || sender?.nickname || "U") as string
                    )[0]?.toUpperCase()}
                  </Text>
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
            {showAvatar && !isOwn && (
              <Text style={styles.senderName}>
                {sender?.nickname || sender?.name}
              </Text>
            )}

            <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
              {msg.text}
            </Text>

            <Text
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
      </Animated.View>
    );
  };

  // Access control
  const userRole = String(user?.role || "").toLowerCase();
  const canAccess = ["admin", "consultor", "user", "cliente_premium"].includes(
    userRole,
  );

  const getChatTitle = (chat: any): string => {
    if (chat.type === "global") return "Grupo Geral";
    if (chat.type === "direct") {
      const isClient = ["user", "cliente_premium"].includes(userRole);
      if (isClient) return "Consultor";
      const otherUser = chat.participants.find((id: string) => id !== user?.id);
      return otherUser || "Chat";
    }
    return chat.id;
  };

  const getChatPreview = (chatId: string): string => {
    if (chatId === selectedChatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      return lastMsg?.text?.substring(0, 50) || "Sem mensagens";
    }
    return "Sem mensagens";
  };

  const getTimestamp = (chat: any): string => {
    const time = chat.lastMessageAt?.toDate?.() || new Date(0);
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `${diffDays}d`;
    return time.toLocaleDateString("pt-BR", { month: "short", day: "numeric" });
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedChatId || !user?.id) return;
    try {
      await sendMessage(inputText.trim());
      setInputText("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (!canAccess) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Sem permissão de acesso</Text>
        </View>
      </Layout>
    );
  }

  if (isLoading && !processedChats.length) {
    return (
      <Layout>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Carregando chats...</Text>
        </View>
      </Layout>
    );
  }

  // LIST VIEW - Show when no chat selected
  if (selectedChatId === null) {
    return (
      <Layout>
        <View style={styles.container}>
          {processedChats.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Nenhum chat disponível</Text>
            </View>
          ) : (
            <FlatList
              data={processedChats}
              keyExtractor={(item) => item.id}
              renderItem={({ item: chat }) => (
                <TouchableOpacity
                  style={styles.chatRow}
                  onPress={() => setSelectedChatId(chat.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    <Ionicons
                      name={chat.type === "global" ? "people" : "person"}
                      size={32}
                      color="#8c52ff"
                    />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle}>{getChatTitle(chat)}</Text>
                    <Text style={styles.lastMessageText} numberOfLines={1}>
                      {getChatPreview(chat.id)}
                    </Text>
                  </View>
                  <Text style={styles.timestampText}>{getTimestamp(chat)}</Text>
                </TouchableOpacity>
              )}
              scrollEnabled={true}
            />
          )}
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.conversationHeader}>
          <TouchableOpacity
            onPress={() => setSelectedChatId(null)}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#8c52ff" />
          </TouchableOpacity>

          {isPrivateChat && otherParticipantId ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <View style={styles.msgAvatarContainer}>
                {userMap[otherParticipantId]?.photoBase64 ? (
                  <Image
                    source={{
                      uri: `data:image/png;base64,${userMap[otherParticipantId].photoBase64}`,
                    }}
                    style={styles.msgAvatar}
                  />
                ) : (
                  <View style={styles.msgAvatarFallback}>
                    <Text style={styles.msgAvatarInitial}>
                      {(
                        (
                          userMap[otherParticipantId]?.name ||
                          userMap[otherParticipantId]?.nickname ||
                          "U"
                        ).charAt(0) || "U"
                      ).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.conversationTitle}>
                {userMap[otherParticipantId]?.nickname ||
                  userMap[otherParticipantId]?.name ||
                  getChatTitle(selectedChat)}
              </Text>
            </View>
          ) : (
            <Text style={styles.conversationTitle}>
              {selectedChat ? getChatTitle(selectedChat) : "Chat"}
            </Text>
          )}

          <View style={styles.headerRight} />
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef as any}
          data={chatMessages.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )}
          keyExtractor={(item, idx) => item.id || `msg-${idx}`}
          renderItem={({ item: msg }) => {
            const isOwn = msg.senderId === user?.id;
            const isGroup =
              selectedChat?.type === "global" ||
              selectedChat?.type === "group" ||
              (selectedChat?.participants &&
                selectedChat.participants.length > 2);
            const sender = userMap[msg.senderId];
            return (
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                showAvatar={isGroup}
                sender={sender}
              />
            );
          }}
          inverted
          scrollEnabled={true}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua mensagem..."
            placeholderTextColor="#999"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "#8c52ff" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: "red", marginTop: 12 },
  loadingText: { fontSize: 14, color: "#666", marginTop: 12 },
  emptyText: { fontSize: 16, color: "#999", marginTop: 16 },
  chatRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatInfo: { flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: "600", color: "#000" },
  lastMessageText: { fontSize: 13, color: "#666", marginTop: 4 },
  timestampText: { fontSize: 12, color: "#999", marginLeft: 8 },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: { paddingHorizontal: 8 },
  conversationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#000",
  },
  headerRight: { width: 44 },
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
    color: "#666",
    position: "absolute",
    right: 8,
    bottom: 6,
    textAlign: "right",
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
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: { opacity: 0.5 },
});

export default ChatScreen;
