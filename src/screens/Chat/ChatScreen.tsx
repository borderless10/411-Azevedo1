import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
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
import consultantServices from "../../services/consultantServices";
import { setActiveChatId } from "../../utils/chatActivity";
import { useNavigation } from "../../routes/NavigationContext";
import { MessageBubble } from "../../components/Chat/MessageBubble";
import {
  profileDisplayName,
  resolveChatDisplayName,
} from "../../utils/chatDisplayNames";

export const ChatScreen: React.FC = () => {
  const { user } = useAuth();
  const { params } = useNavigation();
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
  const userMapRef = useRef<Record<string, any>>({});
  const profilesLoadingRef = useRef<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<any> | null>(null);

  useEffect(() => {
    userMapRef.current = userMap;
  }, [userMap]);

  useEffect(() => {
    if (!user?.id) return;
    setUserMap((prev) => (prev[user.id] ? prev : { ...prev, [user.id]: user }));
    setPreviewSenderMap((prev) =>
      prev[user.id] ? prev : { ...prev, [user.id]: "Você" },
    );
  }, [user]);

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

        if (user.role === "consultor") {
          const clients = await consultantServices.getClientsByConsultant(user.id);
          await Promise.all(
            clients.map((client) =>
              chatService.createChatIfNotExists(user.id, client.id, "direct"),
            ),
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

  useEffect(() => {
    if (!params?.chatId) return;
    setSelectedChatId(String(params.chatId));
  }, [params?.chatId]);

  useEffect(() => {
    setActiveChatId(selectedChatId);
    return () => setActiveChatId(null);
  }, [selectedChatId]);

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

  const loadProfiles = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(
      new Set(ids.filter((id) => id && id !== "system")),
    ).filter(
      (id) => !userMapRef.current[id] && !profilesLoadingRef.current.has(id),
    );

    if (!uniqueIds.length) return;

    uniqueIds.forEach((id) => profilesLoadingRef.current.add(id));

    const updates: Record<string, any> = {};
    const nameUpdates: Record<string, string> = {};

    await Promise.all(
      uniqueIds.map(async (id) => {
        try {
          const userData = await userService.getUserById(id);
          if (userData) {
            updates[id] = userData;
            nameUpdates[id] = profileDisplayName(userData);
          }
        } catch {
          // ignore
        } finally {
          profilesLoadingRef.current.delete(id);
        }
      }),
    );

    if (Object.keys(updates).length > 0) {
      setUserMap((prev) => ({ ...prev, ...updates }));
    }
    if (Object.keys(nameUpdates).length > 0) {
      setPreviewSenderMap((prev) => ({ ...prev, ...nameUpdates }));
    }
  }, []);

  // Resolve participant profiles for chats and messages
  useEffect(() => {
    if (!user?.id) return;

    const ids: string[] = [];
    if ((user as any).consultantId) ids.push((user as any).consultantId);
    if (primaryAdminId) ids.push(primaryAdminId);

    (processedChats || []).forEach((chat: any) => {
      (chat?.participants || []).forEach((id: string) => ids.push(id));
      if (chat?.lastMessage?.senderId) ids.push(chat.lastMessage.senderId);
    });

    (messages || []).forEach((msg: any) => {
      if (msg?.senderId) ids.push(msg.senderId);
    });

    loadProfiles(ids);
  }, [processedChats, messages, user?.id, primaryAdminId, loadProfiles]);

  const getParticipantDisplayName = useCallback(
    (id?: string | null): string => {
      return resolveChatDisplayName(
        id,
        user?.id,
        id ? userMap[id] : null,
        id ? previewSenderMap[id] : undefined,
      );
    },
    [previewSenderMap, user?.id, userMap],
  );

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

    loadProfiles(senderIds);
  }, [processedChats, loadProfiles]);

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
    loadProfiles([otherParticipantId]);
  }, [otherParticipantId, userMap, loadProfiles]);

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

      return otherDisplayName || "Chat";
    }

    if (chat.participants && chat.participants.length > 2) {
      return "Bate-Papo";
    }

    return chat.id;
  };

  const getChatPreview = (chat: any): string => {
    const fromList = chat?.lastMessage?.text;
    const senderId = chat?.lastMessage?.senderId;
    const senderLabel = resolveChatDisplayName(
      senderId,
      user?.id,
      senderId ? userMap[senderId] : null,
      senderId ? previewSenderMap[senderId] : undefined,
    );

    if (typeof fromList === "string" && fromList.trim().length > 0) {
      return `${senderLabel}: ${fromList.trim()}`.substring(0, 70);
    }

    // Fallback: when current conversation is open, use the live message list
    if (chat?.id === selectedChatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const text = String(lastMsg?.text || "").trim();
      const liveSenderId = lastMsg?.senderId;
      const liveSenderLabel = resolveChatDisplayName(
        liveSenderId,
        user?.id,
        liveSenderId ? userMap[liveSenderId] : null,
        liveSenderId ? previewSenderMap[liveSenderId] : undefined,
      );
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
            const senderLabel = resolveChatDisplayName(
              msg.senderId,
              user?.id,
              sender,
              previewSenderMap[msg.senderId],
            );
            return (
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                showAvatar={isGroup}
                showSenderName={isGroup}
                senderLabel={senderLabel}
                senderPhotoBase64={sender?.photoBase64}
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
