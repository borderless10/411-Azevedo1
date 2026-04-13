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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useUserChats } from "../../hooks/useUserChats";
import { useChatMessages } from "../../hooks/useChatMessages";
import { Layout } from "../../components/Layout/Layout";
import chatService from "../../services/chatService";
import { userService } from "../../services/userServices";

export const ChatScreen: React.FC = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { chats, isLoading } = useUserChats(
    user?.id || null,
    user?.role || null,
  );

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [globalChat, setGlobalChat] = useState<any>(null);
  const [primaryAdminId, setPrimaryAdminId] = useState<string | null>(null);

  const { messages, sendMessage } = useChatMessages(
    selectedChatId || "",
    user?.id || "",
    20,
  );

  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [previewSenderMap, setPreviewSenderMap] = useState<Record<string, string>>({});
  const flatListRef = useRef<FlatList<any> | null>(null);

  // Ensure global chat exists and direct chats with consultant/admin for clients
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

        if (user.role === "user" || user.role === "cliente_premium") {
          let admins = await userService.getUsersByRole("admin");
          if (!admins.length) {
            const allUsers = await userService.getAllUsers();
            admins = allUsers.filter(
              (candidate) =>
                String(candidate.role || "").toLowerCase() === "admin" ||
                candidate.isAdmin === true,
            );
          }
          const targetAdmin = admins.find((admin) => admin.id !== user.id) || null;
          if (targetAdmin?.id) {
            setPrimaryAdminId(targetAdmin.id);
            await chatService.createChatIfNotExists(user.id, targetAdmin.id, "direct");
          }
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

  // Resolve participant profiles for chats shown in the list
  useEffect(() => {
    if (!user?.id) return;

    const participantIds = Array.from(
      new Set(
        (processedChats || [])
          .flatMap((chat: any) => chat?.participants || [])
          .filter((id: string) => id && id !== "system"),
      ),
    ) as string[];

    const missingIds = participantIds.filter((id) => !userMap[id]);
    if (!missingIds.length) return;

    let mounted = true;
    (async () => {
      const updates: Record<string, any> = {};
      for (const id of missingIds) {
        try {
          const userData = await userService.getUserById(id);
          if (userData) updates[id] = userData;
        } catch {
          // ignore and keep fallback title
        }
      }

      if (mounted && Object.keys(updates).length > 0) {
        setUserMap((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [processedChats, user?.id, userMap]);

  const getParticipantDisplayName = (id?: string | null): string => {
    if (!id) return "Usuário";
    if (id === user?.id) return "Você";
    const profile = userMap[id];
    return profile?.nickname || profile?.name || previewSenderMap[id] || id;
  };

  const getParticipantRole = (id?: string | null): string => {
    if (!id) return "";
    return String(userMap[id]?.role || "").toLowerCase();
  };

  const getDirectChatTitleForPrivileged = (chat: any): string => {
    const participants = (chat?.participants || []).filter(
      (id: string) => id !== "system",
    );
    const includesCurrentUser = participants.includes(user?.id);

    if (userRole === "consultor") {
      const otherId = participants.find((id: string) => id !== user?.id);
      return getParticipantDisplayName(otherId);
    }

    if (userRole === "admin") {
      if (includesCurrentUser) {
        const otherId = participants.find((id: string) => id !== user?.id);
        return `Direto: ${getParticipantDisplayName(otherId)}`;
      }

      const [firstId, secondId] = participants;
      const firstRole = getParticipantRole(firstId);
      const secondRole = getParticipantRole(secondId);
      const firstName = getParticipantDisplayName(firstId);
      const secondName = getParticipantDisplayName(secondId);

      if (firstRole === "consultor" || secondRole === "consultor") {
        const clientName = firstRole === "consultor" ? secondName : firstName;
        return `Com consultor: ${clientName}`;
      }

      return `Direto externo: ${firstName} + ${secondName}`;
    }

    const otherId = participants.find((id: string) => id !== user?.id);
    return getParticipantDisplayName(otherId);
  };

  // Resolve sender names used in chat list preview (last message)
  useEffect(() => {
    const senderIds = Array.from(
      new Set(
        (processedChats || [])
          .map((chat: any) => chat?.lastMessage?.senderId)
          .filter(Boolean),
      ),
    ) as string[];

    const missing = senderIds.filter((id) => !previewSenderMap[id]);
    if (!missing.length) return;

    let mounted = true;
    (async () => {
      const updates: Record<string, string> = {};
      for (const senderId of missing) {
        try {
          const sender = await userService.getUserById(senderId);
          updates[senderId] =
            sender?.nickname || sender?.name || (senderId === user?.id ? "Você" : "Usuário");
        } catch {
          updates[senderId] = senderId === user?.id ? "Você" : "Usuário";
        }
      }
      if (mounted && Object.keys(updates).length > 0) {
        setPreviewSenderMap((prev) => ({ ...prev, ...updates }));
      }
    })();

    return () => {
      mounted = false;
    };
  }, [processedChats, previewSenderMap, user?.id]);

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

  const getMessageTimeMs = (value: any): number => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value?.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date ? date.getTime() : 0;
    }
    if (typeof value?.seconds === "number") {
      return value.seconds * 1000;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const orderedMessages = useMemo(() => {
    // With `inverted`, keep newest first in data so newest stays at the bottom in the UI.
    return [...chatMessages].sort(
      (a, b) => getMessageTimeMs(b.createdAt) - getMessageTimeMs(a.createdAt),
    );
  }, [chatMessages]);

  const toJsDate = (value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value?.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const isChatUnread = (chat: any): boolean => {
    if (!user?.id) return false;
    const senderId = chat?.lastMessage?.senderId;
    if (!senderId || senderId === user.id) return false;

    const lastMessageAt = toJsDate(chat?.lastMessageAt);
    if (!lastMessageAt) return false;

    const lastReadAt = toJsDate(chat?.lastReadBy?.[user.id]);
    if (!lastReadAt) return true;
    return lastMessageAt.getTime() > lastReadAt.getTime();
  };

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

  // Mark selected chat as read when user enters it
  useEffect(() => {
    if (!selectedChatId || !user?.id) return;
    chatService.markChatAsRead(selectedChatId, user.id).catch(() => {
      // ignore read marker errors
    });
  }, [selectedChatId, user?.id]);

  // Keep selected chat marked as read while conversation is open and messages update
  useEffect(() => {
    if (!selectedChatId || !user?.id || chatMessages.length === 0) return;
    chatService.markChatAsRead(selectedChatId, user.id).catch(() => {
      // ignore read marker errors
    });
  }, [selectedChatId, user?.id, chatMessages.length]);

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
    showSenderName?: boolean;
    sender?: any;
  }> = ({ msg, isOwn, showAvatar = false, showSenderName = false, sender }) => {
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
            {showSenderName && !isOwn && (
              <Text style={styles.senderName}>
                {sender?.nickname || sender?.name || "Usuário"}
              </Text>
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
      </Animated.View>
    );
  };

  // Access control
  const userRole = String(user?.role || "").toLowerCase();
  const canAccess = ["admin", "consultor", "user", "cliente_premium"].includes(
    userRole,
  );

  const isGroupChat = (chat: any): boolean => {
    return (
      chat?.id === "global" ||
      chat?.type === "global" ||
      chat?.type === "group" ||
      (chat?.participants && chat.participants.length > 2)
    );
  };

  const getChatTitle = (chat: any): string => {
    const isClient = ["user", "cliente_premium"].includes(userRole);
    const isPrivileged = ["admin", "consultor"].includes(userRole);

    if (isGroupChat(chat)) {
      if (chat?.id === "global" || chat?.type === "global") return "Bate-Papo";
      if (isPrivileged) return "Grupo: Cliente + Consultor";
      return "Bate-Papo";
    }

    if (chat.type === "direct") {
      const participants = chat.participants || [];
      const otherUser = participants.find((id: string) => id !== user?.id);
      const otherUserData = otherUser ? userMap[otherUser] : null;
      const otherDisplayName =
        otherUserData?.nickname ||
        otherUserData?.name ||
        (otherUser ? previewSenderMap[otherUser] : null);

      if (isClient) {
        const consultantId = (user as any)?.consultantId;
        if (consultantId && otherUser === consultantId) {
          return "Seu consultor";
        }

        if (primaryAdminId && otherUser === primaryAdminId) {
          return "Visão";
        }

        if (otherUser) {
          return "Visão";
        }
      }

      if (isPrivileged) {
        return getDirectChatTitleForPrivileged(chat);
      }

      return otherDisplayName || otherUser || "Chat";
    }

    if (chat.participants && chat.participants.length > 2) {
      return "Bate-Papo";
    }

    return chat.id;
  };

  const getChatPreview = (chat: any): string => {
    const fromList = chat?.lastMessage?.text;
    const senderId = chat?.lastMessage?.senderId;
    const senderLabel =
      senderId === user?.id
        ? "Você"
        : previewSenderMap[senderId] || userMap[senderId]?.nickname || userMap[senderId]?.name || "Usuário";

    if (typeof fromList === "string" && fromList.trim().length > 0) {
      return `${senderLabel}: ${fromList.trim()}`.substring(0, 70);
    }

    // Fallback: when current conversation is open, use the live message list
    if (chat?.id === selectedChatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const text = String(lastMsg?.text || "").trim();
      const liveSenderId = lastMsg?.senderId;
      const liveSenderLabel =
        liveSenderId === user?.id
          ? "Você"
          : userMap[liveSenderId]?.nickname || userMap[liveSenderId]?.name || "Usuário";
      if (text.length > 0) return `${liveSenderLabel}: ${text}`.substring(0, 70);
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
                      name={isGroupChat(chat) ? "people" : "person"}
                      size={32}
                      color="#8c52ff"
                    />
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {getChatTitle(chat) || "Chat"}
                    </Text>
                    <Text style={styles.lastMessageText} numberOfLines={1}>
                      {getChatPreview(chat)}
                    </Text>
                  </View>
                  <View style={styles.chatRightInfo}>
                    {isChatUnread(chat) ? <View style={styles.unreadDot} /> : null}
                    <Text style={styles.timestampText}>{getTimestamp(chat)}</Text>
                  </View>
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
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? insets.top + 56 : insets.bottom + 12
        }
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
          data={orderedMessages}
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
                showSenderName={true}
                sender={sender}
              />
            );
          }}
          inverted
          scrollEnabled={true}
        />

        {/* Input */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Math.max(10, insets.bottom) },
          ]}
        >
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
    borderBottomColor: "#1f1f1f",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  chatInfo: { flex: 1, minWidth: 0 },
  chatTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "700",
    color: "#ffffff",
  },
  lastMessageText: { fontSize: 13, color: "#b8b8b8", marginTop: 4 },
  chatRightInfo: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 48,
    marginLeft: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8c52ff",
    marginBottom: 6,
  },
  timestampText: { fontSize: 12, color: "#d0d0d0" },
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
    borderColor: "#2f2f2f",
    backgroundColor: "#121212",
    color: "#ffffff",
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
