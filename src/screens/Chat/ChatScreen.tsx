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
  Modal,
  Alert,
  AppState,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useUserChats } from "../../hooks/useUserChats";
import { useChatMessages } from "../../hooks/useChatMessages";
import { Layout } from "../../components/Layout/Layout";
import chatService, { Message } from "../../services/chatService";
import { userService } from "../../services/userServices";
import consultantServices from "../../services/consultantServices";
import { setActiveChatId } from "../../utils/chatActivity";
import { useNavigation } from "../../routes/NavigationContext";
import { MessageBubble } from "../../components/Chat/MessageBubble";
import { EmojiPickerPanel } from "../../components/Chat/EmojiPickerPanel";
import { MessageActionSheet } from "../../components/Chat/MessageActionSheet";
import {
  filterMentionCandidates,
  getActiveMentionQuery,
  insertMention,
  mentionsStillInText,
  ChatMention,
} from "../../utils/chatMentions";
import {
  profileDisplayName,
  profileInitial,
  profilePhotoUri,
  resolveChatDisplayName,
  resolveCoupleChatSenderLabel,
} from "../../utils/chatDisplayNames";
import {
  isCoupleAccount,
  parseCoupleMember,
} from "../../utils/coupleAccount";
import moderationService, {
  ReportReason,
} from "../../services/moderationService";

export const ChatScreen: React.FC = () => {
  const { user, activeCoupleMember } = useAuth();
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
  const [startChatVisible, setStartChatVisible] = useState(false);
  const [startChatRole, setStartChatRole] = useState<"cliente" | "consultor">(
    "cliente",
  );
  const [startChatQuery, setStartChatQuery] = useState("");
  const [startChatUsers, setStartChatUsers] = useState<any[]>([]);
  const [startChatLoading, setStartChatLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingMentions, setPendingMentions] = useState<ChatMention[]>([]);
  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  );

  const isAdminUser =
    String(user?.role || "").toLowerCase() === "admin" || user?.isAdmin === true;

  const { messages, sendMessage } = useChatMessages(
    selectedChatId || "",
    user?.id || "",
    20,
    isCoupleAccount(user) ? activeCoupleMember : null,
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

  useEffect(() => {
    if (!user?.id) {
      setBlockedUserIds([]);
      return;
    }
    let cancelled = false;
    moderationService
      .getBlockedUserIds(user.id)
      .then((ids) => {
        if (!cancelled) setBlockedUserIds(ids);
      })
      .catch(() => {
        if (!cancelled) setBlockedUserIds([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
    if (user?.id) {
      userService
        .updateChatPresence(user.id, {
          presenceState: AppState.currentState === "active" ? "foreground" : "background",
          activeChatId: selectedChatId,
        })
        .catch(() => undefined);
    }
    return () => {
      setActiveChatId(null);
      if (user?.id) {
        userService
          .updateChatPresence(user.id, {
            presenceState: "foreground",
            activeChatId: "",
          })
          .catch(() => undefined);
      }
    };
  }, [selectedChatId, user?.id]);

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

  const visibleChats = useMemo(() => {
    if (!isAdminUser) return processedChats;
    return processedChats.filter((chat: any) => {
      if (chat?.id === "global" || chat?.type === "global") return true;
      return Boolean(String(chat?.lastMessage?.text || "").trim());
    });
  }, [isAdminUser, processedChats]);

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
    const blocked = new Set(blockedUserIds);
    return [...chatMessages]
      .filter((msg) => !blocked.has(msg.senderId) || msg.senderId === user?.id)
      .sort(
        (a, b) => getMessageTimeMs(b.createdAt) - getMessageTimeMs(a.createdAt),
      );
  }, [chatMessages, blockedUserIds, user?.id]);

  const mentionCandidates = useMemo(() => {
    const ids = new Set<string>();
    (selectedChat?.participants || []).forEach((id: string) => {
      if (id && id !== user?.id) ids.add(id);
    });
    orderedMessages.forEach((msg) => {
      if (msg.senderId && msg.senderId !== user?.id) ids.add(msg.senderId);
    });
    return Array.from(ids).map((id) => ({
      userId: id,
      displayName: profileDisplayName(userMap[id], getParticipantDisplayName(id)),
    }));
  }, [orderedMessages, selectedChat?.participants, user?.id, userMap]);

  const activeMention = useMemo(
    () => getActiveMentionQuery(inputText, inputSelection.start),
    [inputText, inputSelection.start],
  );
  const mentionSuggestions = activeMention
    ? filterMentionCandidates(mentionCandidates, activeMention.query)
    : [];

  useEffect(() => {
    const messageId = String(params?.messageId || "").trim();
    if (!messageId || !selectedChatId) return;
    const index = orderedMessages.findIndex((msg) => msg.id === messageId);
    if (index < 0) return;
    setHighlightedMessageId(messageId);
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.4,
      });
    }, 250);
    const clearHighlight = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
    return () => {
      clearTimeout(timer);
      clearTimeout(clearHighlight);
    };
  }, [params?.messageId, selectedChatId, orderedMessages]);

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
          return getParticipantDisplayName(otherUser);
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
    const senderLabel = resolveCoupleChatSenderLabel(
      senderId,
      user?.id,
      senderId ? userMap[senderId] : null,
      chat?.lastMessage?.senderCoupleMember,
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
      const liveSenderLabel = resolveCoupleChatSenderLabel(
        liveSenderId,
        user?.id,
        liveSenderId ? userMap[liveSenderId] : null,
        lastMsg?.senderCoupleMember,
        liveSenderId ? userMap[liveSenderId] ? undefined : previewSenderMap[liveSenderId] : undefined,
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
    if (
      otherParticipantId &&
      blockedUserIds.includes(otherParticipantId)
    ) {
      Alert.alert(
        "Usuário bloqueado",
        "Desbloqueie o usuário para enviar mensagens neste chat.",
      );
      return;
    }
    try {
      const mentions = mentionsStillInText(inputText, pendingMentions).filter(
        (mention) =>
          mention.userId !== user.id &&
          mentionCandidates.some((item) => item.userId === mention.userId),
      );
      await sendMessage(inputText.trim(), {
        mentions,
        replyTo: replyTo
          ? {
              messageId: replyTo.id,
              senderId: replyTo.senderId,
              text: String(replyTo.text || "").slice(0, 180),
            }
          : null,
      });
      setInputText("");
      setPendingMentions([]);
      setReplyTo(null);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleSelectMention = (mention: ChatMention) => {
    if (!activeMention) return;
    const next = insertMention(
      inputText,
      inputSelection.start,
      activeMention.start,
      mention.displayName,
    );
    setInputText(next.text);
    setInputSelection({ start: next.cursor, end: next.cursor });
    setPendingMentions((current) => {
      const without = current.filter((item) => item.userId !== mention.userId);
      return [...without, mention];
    });
  };

  const handleToggleReaction = async (msg: Message, emoji: string) => {
    if (!user?.id || !selectedChatId || !msg.id) return;
    const current = msg.reactions?.[user.id];
    try {
      await chatService.setMessageReaction(
        selectedChatId,
        msg.id,
        user.id,
        current === emoji ? null : emoji,
      );
    } catch (error) {
      console.error("Erro ao reagir à mensagem:", error);
      Alert.alert("Erro", "Não foi possível salvar a reação agora.");
    }
  };

  const pickReportReason = (
    onPicked: (reason: ReportReason) => void,
  ) => {
    Alert.alert("Motivo da denúncia", "Selecione o motivo:", [
      { text: "Spam", onPress: () => onPicked("spam") },
      { text: "Assédio", onPress: () => onPicked("harassment") },
      {
        text: "Conteúdo inadequado",
        onPress: () => onPicked("inappropriate"),
      },
      { text: "Outro", onPress: () => onPicked("other") },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleReportMessage = (msg: {
    id?: string;
    text: string;
    senderId: string;
  }) => {
    if (!user?.id || !selectedChatId || !msg.senderId) return;
    if (msg.senderId === user.id) return;
    pickReportReason(async (reason) => {
      try {
        setModerationBusy(true);
        await moderationService.reportContent({
          reporterId: user.id,
          reportedUserId: msg.senderId,
          chatId: selectedChatId,
          messageId: msg.id,
          messageText: msg.text,
          reason,
        });
        Alert.alert(
          "Denúncia enviada",
          "Recebemos sua denúncia. Nossa equipe analisará em até 24 horas.",
        );
      } catch (error) {
        console.error("Erro ao denunciar mensagem:", error);
        Alert.alert("Erro", "Não foi possível enviar a denúncia agora.");
      } finally {
        setModerationBusy(false);
      }
    });
  };

  const handleReportUser = (targetUserId: string) => {
    if (!user?.id || !selectedChatId || !targetUserId) return;
    pickReportReason(async (reason) => {
      try {
        setModerationBusy(true);
        await moderationService.reportContent({
          reporterId: user.id,
          reportedUserId: targetUserId,
          chatId: selectedChatId,
          reason,
        });
        Alert.alert(
          "Denúncia enviada",
          "Recebemos sua denúncia. Nossa equipe analisará em até 24 horas.",
        );
      } catch (error) {
        console.error("Erro ao denunciar usuário:", error);
        Alert.alert("Erro", "Não foi possível enviar a denúncia agora.");
      } finally {
        setModerationBusy(false);
      }
    });
  };

  const handleBlockUser = (targetUserId: string) => {
    if (!user?.id || !targetUserId || targetUserId === user.id) return;
    Alert.alert(
      "Bloquear usuário",
      "Você deixará de ver as mensagens desta pessoa. Pode desbloquear depois pelo mesmo menu.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Bloquear",
          style: "destructive",
          onPress: async () => {
            try {
              setModerationBusy(true);
              await moderationService.blockUser(user.id, targetUserId);
              setBlockedUserIds((prev) =>
                prev.includes(targetUserId) ? prev : [...prev, targetUserId],
              );
              Alert.alert("Bloqueado", "Usuário bloqueado com sucesso.");
            } catch (error) {
              console.error("Erro ao bloquear:", error);
              Alert.alert("Erro", "Não foi possível bloquear agora.");
            } finally {
              setModerationBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleUnblockUser = (targetUserId: string) => {
    if (!user?.id || !targetUserId) return;
    Alert.alert("Desbloquear usuário", "Deseja desbloquear esta pessoa?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desbloquear",
        onPress: async () => {
          try {
            setModerationBusy(true);
            await moderationService.unblockUser(user.id, targetUserId);
            setBlockedUserIds((prev) =>
              prev.filter((id) => id !== targetUserId),
            );
            Alert.alert("Desbloqueado", "Usuário desbloqueado.");
          } catch (error) {
            console.error("Erro ao desbloquear:", error);
            Alert.alert("Erro", "Não foi possível desbloquear agora.");
          } finally {
            setModerationBusy(false);
          }
        },
      },
    ]);
  };

  const openChatSafetyMenu = () => {
    if (!otherParticipantId || moderationBusy) return;
    const isBlocked = blockedUserIds.includes(otherParticipantId);
    Alert.alert("Segurança", "Escolha uma opção:", [
      {
        text: "Denunciar usuário",
        onPress: () => handleReportUser(otherParticipantId),
      },
      isBlocked
        ? {
            text: "Desbloquear usuário",
            onPress: () => handleUnblockUser(otherParticipantId),
          }
        : {
            text: "Bloquear usuário",
            style: "destructive" as const,
            onPress: () => handleBlockUser(otherParticipantId),
          },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const handleAppendEmoji = (emoji: string) => {
    setInputText((current) => {
      const next = `${current}${emoji}`;
      return next.length > 500 ? next.slice(0, 500) : next;
    });
  };

  const getStartChatLabel = (person: any): string =>
    profileDisplayName(person, person?.email || "Usuário");

  const renderUserAvatar = (
    person: any,
    size: number,
    fallbackIcon?: keyof typeof Ionicons.glyphMap,
  ) => {
    const uri = profilePhotoUri(person?.photoBase64);
    if (uri) {
      return (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      );
    }
    if (!person && fallbackIcon) {
      return <Ionicons name={fallbackIcon} size={Math.round(size * 0.66)} color="#8c52ff" />;
    }
    return (
      <Text style={[styles.listAvatarInitial, { fontSize: Math.round(size * 0.38) }]}>
        {profileInitial(person)}
      </Text>
    );
  };

  const filteredStartChatUsers = useMemo(() => {
    const q = startChatQuery.trim().toLowerCase();
    const isClientRole = (role?: string) =>
      ["user", "cliente", "cliente_premium"].includes(
        String(role || "").toLowerCase(),
      );
    const isConsultorRole = (role?: string) =>
      String(role || "").toLowerCase() === "consultor";

    return startChatUsers
      .filter((person) => person?.id && person.id !== user?.id)
      .filter((person) =>
        startChatRole === "consultor"
          ? isConsultorRole(person.role)
          : isClientRole(person.role),
      )
      .filter((person) => {
        if (!q) return true;
        return (
          getStartChatLabel(person).toLowerCase().includes(q) ||
          String(person?.email || "")
            .toLowerCase()
            .includes(q)
        );
      });
  }, [startChatQuery, startChatRole, startChatUsers, user?.id]);

  const openStartChat = async () => {
    setStartChatVisible(true);
    setStartChatQuery("");
    setStartChatRole("cliente");
    if (startChatUsers.length > 0) return;

    setStartChatLoading(true);
    try {
      const list = await userService.getAllUsers();
      setStartChatUsers(list || []);
    } catch (error) {
      console.error("Erro ao carregar usuários para o chat:", error);
      Alert.alert("Erro", "Não foi possível carregar os usuários.");
    } finally {
      setStartChatLoading(false);
    }
  };

  const handleStartChatWithUser = async (person: any) => {
    if (!user?.id || !person?.id || startingChat) return;
    setStartingChat(true);
    try {
      const chat = await chatService.createChatIfNotExists(
        user.id,
        person.id,
        "direct",
      );
      setStartChatVisible(false);
      setSelectedChatId(chat.id);
    } catch (error) {
      console.error("Erro ao iniciar bate-papo:", error);
      Alert.alert("Erro", "Não foi possível iniciar o bate-papo.");
    } finally {
      setStartingChat(false);
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
          {isAdminUser ? (
            <TouchableOpacity
              style={styles.startChatButton}
              onPress={openStartChat}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              <Text style={styles.startChatButtonText}>Iniciar bate-papo</Text>
            </TouchableOpacity>
          ) : null}

          {visibleChats.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {isAdminUser
                  ? "Nenhuma conversa com mensagens"
                  : "Nenhum chat disponível"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={visibleChats}
              keyExtractor={(item) => item.id}
              renderItem={({ item: chat }) => (
                <TouchableOpacity
                  style={styles.chatRow}
                  onPress={() => setSelectedChatId(chat.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarContainer}>
                    {isGroupChat(chat)
                      ? renderUserAvatar(null, 48, "people")
                      : renderUserAvatar(
                          userMap[
                            (chat.participants || []).find(
                              (id: string) => id !== user?.id,
                            )
                          ],
                          48,
                          "person",
                        )}
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

          <Modal
            visible={startChatVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setStartChatVisible(false)}
          >
            <View style={styles.startChatBackdrop}>
              <View style={styles.startChatCard}>
                <Text style={styles.startChatTitle}>Iniciar bate-papo</Text>
                <Text style={styles.startChatSubtitle}>
                  Escolha se quer conversar com um cliente ou um consultor
                </Text>

                <View style={styles.startChatTabs}>
                  <TouchableOpacity
                    style={[
                      styles.startChatTab,
                      startChatRole === "cliente" && styles.startChatTabActive,
                    ]}
                    onPress={() => setStartChatRole("cliente")}
                  >
                    <Text
                      style={[
                        styles.startChatTabText,
                        startChatRole === "cliente" &&
                          styles.startChatTabTextActive,
                      ]}
                    >
                      Cliente
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.startChatTab,
                      startChatRole === "consultor" && styles.startChatTabActive,
                    ]}
                    onPress={() => setStartChatRole("consultor")}
                  >
                    <Text
                      style={[
                        styles.startChatTabText,
                        startChatRole === "consultor" &&
                          styles.startChatTabTextActive,
                      ]}
                    >
                      Consultor
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder={
                    startChatRole === "consultor"
                      ? "Buscar consultor..."
                      : "Buscar cliente..."
                  }
                  placeholderTextColor="#777"
                  value={startChatQuery}
                  onChangeText={setStartChatQuery}
                  style={styles.startChatSearch}
                />

                {startChatLoading ? (
                  <ActivityIndicator color="#8c52ff" style={{ marginTop: 24 }} />
                ) : (
                  <FlatList
                    data={filteredStartChatUsers}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <Text style={styles.startChatEmpty}>
                        Nenhum {startChatRole} encontrado
                      </Text>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.startChatItem}
                        onPress={() => handleStartChatWithUser(item)}
                        disabled={startingChat}
                      >
                        <View style={styles.startChatItemRow}>
                          <View style={styles.startChatAvatar}>
                            {renderUserAvatar(item, 40, "person")}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.startChatItemName}>
                              {getStartChatLabel(item)}
                            </Text>
                            {item.email ? (
                              <Text style={styles.startChatItemEmail}>
                                {item.email}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </TouchableOpacity>
                    )}
                  />
                )}

                <TouchableOpacity
                  style={styles.startChatClose}
                  onPress={() => setStartChatVisible(false)}
                >
                  <Text style={styles.startChatCloseText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
                {profilePhotoUri(userMap[otherParticipantId]?.photoBase64) ? (
                  <Image
                    source={{
                      uri: profilePhotoUri(
                        userMap[otherParticipantId]?.photoBase64,
                      ) as string,
                    }}
                    style={styles.msgAvatar}
                  />
                ) : (
                  <View style={styles.msgAvatarFallback}>
                    <Text style={styles.msgAvatarInitial}>
                      {profileInitial(userMap[otherParticipantId])}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.conversationTitle}>
                {profileDisplayName(
                  userMap[otherParticipantId],
                  getChatTitle(selectedChat),
                )}
              </Text>
            </View>
          ) : (
            <Text style={styles.conversationTitle}>
              {selectedChat ? getChatTitle(selectedChat) : "Chat"}
            </Text>
          )}

          {otherParticipantId ? (
            <TouchableOpacity
              onPress={openChatSafetyMenu}
              style={styles.headerRight}
              accessibilityLabel="Opções de segurança"
              disabled={moderationBusy}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="#8c52ff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerRight} />
          )}
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef as any}
          data={orderedMessages}
          keyExtractor={(item, idx) => item.id || `msg-${idx}`}
          renderItem={({ item: msg }) => {
            const sender = userMap[msg.senderId];
            const senderIsCouple = isCoupleAccount(sender);
            const senderMember = parseCoupleMember(msg.senderCoupleMember);
            const ownMember = isCoupleAccount(user)
              ? parseCoupleMember(activeCoupleMember)
              : null;
            const isOwn =
              msg.senderId === user?.id &&
              (!senderIsCouple ||
                senderMember == null ||
                ownMember == null ||
                senderMember === ownMember);
            const isGroup =
              selectedChat?.type === "global" ||
              selectedChat?.type === "group" ||
              (selectedChat?.participants &&
                selectedChat.participants.length > 2);
            const showCoupleSpeaker = senderIsCouple;
            const senderLabel = resolveCoupleChatSenderLabel(
              msg.senderId,
              user?.id,
              sender,
              msg.senderCoupleMember,
              previewSenderMap[msg.senderId],
            );
            return (
              <MessageBubble
                msg={msg}
                isOwn={isOwn}
                showAvatar={isGroup || showCoupleSpeaker}
                showSenderName={isGroup || showCoupleSpeaker}
                senderLabel={senderLabel}
                senderPhotoBase64={sender?.photoBase64}
                highlighted={highlightedMessageId === msg.id}
                replySenderLabel={
                  msg.replyTo
                    ? resolveCoupleChatSenderLabel(
                        msg.replyTo.senderId,
                        user?.id,
                        userMap[msg.replyTo.senderId],
                        undefined,
                        previewSenderMap[msg.replyTo.senderId],
                      )
                    : undefined
                }
                onLongPress={() => setActionMessage(msg)}
                onReactionPress={(emoji) => handleToggleReaction(msg, emoji)}
              />
            );
          }}
          inverted
          scrollEnabled={true}
          onScrollToIndexFailed={() => undefined}
        />

        {/* Input */}
        <View
          style={[
            styles.inputWrapper,
            { paddingBottom: Math.max(10, insets.bottom) },
          ]}
        >
          {showEmojiPicker ? (
            <EmojiPickerPanel onSelect={handleAppendEmoji} />
          ) : null}

          {mentionSuggestions.length > 0 ? (
            <View style={styles.mentionList}>
              {mentionSuggestions.map((item) => (
                <TouchableOpacity
                  key={item.userId}
                  style={styles.mentionItem}
                  onPress={() => handleSelectMention(item)}
                >
                  <Text style={styles.mentionName}>@{item.displayName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {replyTo ? (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewBody}>
                <Text style={styles.replyPreviewLabel}>
                  Respondendo {getParticipantDisplayName(replyTo.senderId)}
                </Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyTo.text}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.emojiToggleButton}
              onPress={() => setShowEmojiPicker((current) => !current)}
              accessibilityLabel="Inserir emoji"
            >
              <Ionicons
                name={showEmojiPicker ? "happy" : "happy-outline"}
                size={24}
                color={showEmojiPicker ? "#8c52ff" : "#aaa"}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={setInputText}
              onSelectionChange={(event) =>
                setInputSelection(event.nativeEvent.selection)
              }
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
        </View>
      </KeyboardAvoidingView>
      <MessageActionSheet
        visible={Boolean(actionMessage)}
        isOwn={Boolean(
          actionMessage &&
            user?.id &&
            actionMessage.senderId === user.id,
        )}
        currentReaction={
          actionMessage && user?.id
            ? actionMessage.reactions?.[user.id]
            : null
        }
        onClose={() => setActionMessage(null)}
        onReact={(emoji) => {
          if (!actionMessage) return;
          handleToggleReaction(actionMessage, emoji);
          setActionMessage(null);
        }}
        onReply={() => {
          if (!actionMessage) return;
          setReplyTo(actionMessage);
          setActionMessage(null);
        }}
        onReport={
          actionMessage && user?.id && actionMessage.senderId !== user.id
            ? () => {
                const target = actionMessage;
                setActionMessage(null);
                handleReportMessage(target);
              }
            : undefined
        }
      />
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
    overflow: "hidden",
  },
  listAvatarInitial: {
    color: "#fff",
    fontWeight: "700",
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
  headerRight: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
  inputWrapper: {
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  mentionList: {
    backgroundColor: "#161616",
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
    maxHeight: 180,
  },
  mentionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  mentionName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderLeftWidth: 3,
    borderLeftColor: "#8c52ff",
  },
  replyPreviewBody: {
    flex: 1,
    marginRight: 8,
  },
  replyPreviewLabel: {
    color: "#8c52ff",
    fontSize: 12,
    fontWeight: "700",
  },
  replyPreviewText: {
    color: "#ccc",
    fontSize: 13,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "flex-end",
  },
  emojiToggleButton: {
    width: 40,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
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
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#8c52ff",
    borderRadius: 10,
    minHeight: 44,
  },
  startChatButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  startChatBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  startChatCard: {
    backgroundColor: "#0e0c14",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "#2a2040",
  },
  startChatTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  startChatSubtitle: {
    color: "#a89fc0",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  startChatTabs: {
    flexDirection: "row",
    backgroundColor: "#161221",
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  startChatTab: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  startChatTabActive: {
    backgroundColor: "#8c52ff",
  },
  startChatTabText: {
    color: "#a89fc0",
    fontWeight: "700",
  },
  startChatTabTextActive: {
    color: "#fff",
  },
  startChatSearch: {
    backgroundColor: "#111",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  startChatEmpty: {
    color: "#999",
    textAlign: "center",
    marginTop: 24,
  },
  startChatItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1a2b",
  },
  startChatItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  startChatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  startChatItemName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  startChatItemEmail: {
    color: "#999",
    fontSize: 13,
    marginTop: 2,
  },
  startChatClose: {
    alignItems: "center",
    paddingVertical: 12,
  },
  startChatCloseText: {
    color: "#ccc",
    fontWeight: "600",
  },
});

export default ChatScreen;
