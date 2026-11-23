import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Platform,
  Dimensions,
  ImageBackground,
  Modal,
  Alert,
  AppState,
  Keyboard,
  type KeyboardEvent,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useGlobalChat, useUserChats } from "../../hooks/useUserChats";
import { useChatMessages } from "../../hooks/useChatMessages";
import { Layout } from "../../components/Layout/Layout";
import { useDesktopWeb } from "../../utils/desktopWeb";
import chatService, {
  CHAT_LIVE_MESSAGE_LIMIT,
  Message,
} from "../../services/chatService";
import { userService } from "../../services/userServices";
import consultantServices from "../../services/consultantServices";
import { setActiveChatId } from "../../utils/chatActivity";
import { mapWithConcurrency } from "../../utils/asyncPool";
import { keyboardOverlap } from "../../utils/keyboardOverlap";
import { useNavigation } from "../../routes/NavigationContext";
import { MessageBubble } from "../../components/Chat/MessageBubble";
import { EmojiPickerPanel } from "../../components/Chat/EmojiPickerPanel";
import { MessageActionSheet } from "../../components/Chat/MessageActionSheet";
import {
  filterMentionCandidates,
  getActiveMentionQuery,
  insertMention,
  mentionsStillInText,
  normalizeHeartEmojisInText,
  normalizeReactionEmoji,
  ChatMention,
} from "../../utils/chatMentions";
import {
  canMutateOwnChatMessage,
  getChatMessageDisplayText,
  isChatMessageDeleted,
} from "../../utils/chatMessageMutations";
import {
  listUnseenMentions,
  mergeSeenMentionIds,
} from "../../utils/chatMentionSeen";
import {
  loadSeenMentionIds,
  saveSeenMentionIds,
} from "../../services/chatMentionSeenService";
import {
  profileDisplayName,
  profileInitial,
  resolveProfilePhotoUri,
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
import { BadgedAvatar } from "../../components/Gamification/BadgedAvatar";
import { BadgeDetailModal } from "../../components/Gamification/BadgeEmblem";
import { PhotoPreviewModal } from "../../components/Gamification/PhotoPreviewModal";
import { CachedRemoteImage } from "../../components/ui/CachedRemoteImage";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import {
  resolveAvatarBadgeDefinition,
  resolveAvatarRingDefinition,
} from "../../utils/badgeRules";
import { buildCrownByUser } from "../../utils/crowns";
import type {
  BadgeDefinition,
  RankingSeason,
  UserBadgeGrant,
} from "../../types/rankingGamification";
import type { RankingPreference } from "../../types/auth";
import { perfMark, perfMeasure } from "../../utils/perfMarks";
import { prefetchRemoteImages } from "../../utils/remoteImageCache";

export const ChatScreen: React.FC = () => {
  const { user, activeCoupleMember } = useAuth();
  const { params, navigate } = useNavigation();
  const insets = useSafeAreaInsets();
  const desktop = useDesktopWeb();
  const { chats, isLoading } = useUserChats(
    user?.id || null,
    user?.role || null,
  );

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const globalChat = useGlobalChat();
  const [primaryAdminId, setPrimaryAdminId] = useState<string | null>(null);
  const [startChatVisible, setStartChatVisible] = useState(false);
  const [startChatRole, setStartChatRole] = useState<"cliente" | "consultor">(
    "cliente",
  );
  const [startChatQuery, setStartChatQuery] = useState("");
  const [startChatUsers, setStartChatUsers] = useState<any[]>([]);
  const [startChatLoading, setStartChatLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [addSupervisorVisible, setAddSupervisorVisible] = useState(false);
  const [addSupervisorStep, setAddSupervisorStep] = useState<
    "cliente" | "consultor" | "supervisor"
  >("cliente");
  const [addSupervisorQuery, setAddSupervisorQuery] = useState("");
  const [addSupervisorUsers, setAddSupervisorUsers] = useState<any[]>([]);
  const [addSupervisorLoading, setAddSupervisorLoading] = useState(false);
  const [addingSupervisor, setAddingSupervisor] = useState(false);
  const [addSupervisorClient, setAddSupervisorClient] = useState<any | null>(
    null,
  );
  const [addSupervisorConsultant, setAddSupervisorConsultant] = useState<
    any | null
  >(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const sendingRef = useRef(false);
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([]);
  const [moderationBusy, setModerationBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [pendingMentions, setPendingMentions] = useState<ChatMention[]>([]);
  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(
    null,
  );
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(
    [],
  );
  const [badgeGrants, setBadgeGrants] = useState<UserBadgeGrant[]>([]);
  const [selectedChatBadge, setSelectedChatBadge] =
    useState<BadgeDefinition | null>(null);
  const [chatPhotoPreview, setChatPhotoPreview] = useState<{
    uri: string;
    name: string;
    userId: string;
    rankingPreference?: RankingPreference | null;
  } | null>(null);

  // Catálogo de insígnias: um listener só, para resolver a borda ativa de
  // cada usuário (activeBadgeBorderId já vem nos perfis leves do chat).
  useEffect(
    () =>
      rankingGamificationService.subscribeBadgeDefinitions(
        setBadgeDefinitions,
        () => {},
      ),
    [],
  );

  // Concessões ativas: um listener só enquanto a tela está montada, igual
  // ao do catálogo. Sem isso, quem tem insígnia concedida e nenhuma borda
  // ativa ficava sem selo sobre a foto aqui no chat.
  useEffect(
    () =>
      rankingGamificationService.subscribeActiveGrants(setBadgeGrants, () => {}),
    [],
  );

  // Temporadas: um listener só, para as coroas do último pódio valerem
  // também aqui no chat, até o próximo reset trocar os donos.
  const [rankingSeasons, setRankingSeasons] = useState<RankingSeason[]>([]);
  useEffect(
    () =>
      rankingGamificationService.subscribeSeasons(setRankingSeasons, () => {}),
    [],
  );
  const crownByUser = useMemo(
    () => buildCrownByUser(rankingSeasons),
    [rankingSeasons],
  );
  const crownForPerson = (person: any) =>
    person?.id ? (crownByUser.get(person.id) ?? null) : null;

  const badgeDefinitionsById = useMemo(() => {
    const map = new Map<string, BadgeDefinition>();
    badgeDefinitions.forEach((definition) => map.set(definition.id, definition));
    return map;
  }, [badgeDefinitions]);

  // Mesma montagem do useRankingGamification: concessões agrupadas por
  // usuário, na ordem em que chegam (a da fileira de insígnias).
  const badgesByUser = useMemo(() => {
    const map = new Map<string, BadgeDefinition[]>();
    badgeGrants.forEach((grant) => {
      const definition = badgeDefinitionsById.get(grant.badgeId);
      if (!definition) return;
      const list = map.get(grant.userId) || [];
      list.push(definition);
      map.set(grant.userId, list);
    });
    return map;
  }, [badgeGrants, badgeDefinitionsById]);

  const isAdminUser =
    String(user?.role || "").toLowerCase() === "admin" || user?.isAdmin === true;

  const {
    messages,
    sendMessage,
    loadMore,
    hasMore,
    isLoadingMore,
    isLoading: messagesLoading,
    trimmed,
    returnToRecent,
  } = useChatMessages(
      selectedChatId || "",
      user?.id || "",
      CHAT_LIVE_MESSAGE_LIMIT,
      isCoupleAccount(user) ? activeCoupleMember : null,
    );
  const [reactionFocus, setReactionFocus] = useState<{
    messageId: string;
    emoji: string | null;
    anchor: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [reactionCardHeight, setReactionCardHeight] = useState(180);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  /** Posição travada na abertura — evita o card “pular” ao abrir o emoji. */
  const [reactionCardPos, setReactionCardPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const windowSize = useWindowDimensions();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const reactionPickerHeight = Math.max(
    140,
    Math.min(220, windowSize.height * 0.32),
  );

  const closeReactionSheet = useCallback(() => {
    setReactionFocus(null);
    setReactionCardPos(null);
    setReactionPickerOpen(false);
    setReactionCardHeight(180);
  }, []);

  const openReactionSheet = useCallback(
    (
      messageId: string,
      emoji: string | null,
      anchor: { x: number; y: number; width: number; height: number },
    ) => {
      const margin = 12;
      const width = Math.min(340, windowSize.width - margin * 2);
      const estimatedHeight = 180;
      let top = anchor.y - estimatedHeight - 6;
      if (top < margin) {
        top = anchor.y + anchor.height + 6;
      }
      if (top + estimatedHeight > windowSize.height - margin) {
        top = Math.max(
          margin,
          windowSize.height - estimatedHeight - margin,
        );
      }
      let left = anchor.x;
      if (left + width > windowSize.width - margin) {
        left = anchor.x + anchor.width - width;
      }
      left = Math.max(
        margin,
        Math.min(left, windowSize.width - width - margin),
      );
      setReactionCardHeight(estimatedHeight);
      setReactionPickerOpen(false);
      setReactionCardPos({ top, left, width });
      setReactionFocus({ messageId, emoji, anchor });
    },
    [windowSize.height, windowSize.width],
  );

  useEffect(() => {
    const applyFrame = (height: number) => {
      perfMark("keyboard.willShow");
      setKeyboardInset(Math.max(0, Math.round(height)));
      perfMeasure("keyboard.insetApplied", "keyboard.willShow");
    };

    if (Platform.OS === "ios") {
      const changeSub = Keyboard.addListener("keyboardWillChangeFrame", (event) => {
        applyFrame(windowSize.height - event.endCoordinates.screenY);
      });
      const hideSub = Keyboard.addListener("keyboardWillHide", () => {
        setKeyboardInset(0);
      });
      // WillHide pode não disparar ao fechar a conversa ou trocar de tela.
      const didHideSub = Keyboard.addListener("keyboardDidHide", () => {
        setKeyboardInset(0);
      });
      return () => {
        changeSub.remove();
        hideSub.remove();
        didHideSub.remove();
      };
    }

    // Android (edge-to-edge): height do evento costuma vir 0 e a janela
    // não encolhe. A baseline é a altura com o teclado fechado.
    let baseline = Dimensions.get("window").height;
    let open = false;
    const dimSub = Dimensions.addEventListener("change", ({ window }) => {
      if (!open) baseline = window.height;
    });
    const applyAndroid = (event: KeyboardEvent) => {
      open = true;
      const frame = event.endCoordinates;
      applyFrame(
        keyboardOverlap({
          frameHeight: frame.height,
          frameScreenY: frame.screenY,
          screenHeight: Dimensions.get("screen").height,
          windowHeightBefore: baseline,
          windowHeightNow: Dimensions.get("window").height,
        }),
      );
    };
    const showSub = Keyboard.addListener("keyboardDidShow", applyAndroid);
    const changeSub = Keyboard.addListener("keyboardDidChangeFrame", applyAndroid);
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      open = false;
      baseline = Dimensions.get("window").height;
      setKeyboardInset(0);
    });
    return () => {
      dimSub.remove();
      showSub.remove();
      changeSub.remove();
      hideSub.remove();
    };
  }, [windowSize.height]);

  // Fechou ou trocou de conversa: nenhum inset de teclado pode sobrar.
  useEffect(() => {
    setKeyboardInset(0);
    setShowEmojiPicker(false);
  }, [selectedChatId]);

  const [userMap, setUserMap] = useState<Record<string, any>>({});
  const [previewSenderMap, setPreviewSenderMap] = useState<Record<string, string>>({});
  const userMapRef = useRef<Record<string, any>>({});
  const profilesLoadingRef = useRef<Set<string>>(new Set());
  const flatListRef = useRef<FlatList<any> | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allowOlderLoadRef = useRef(false);

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
      perfMark("chats.init.start");
      try {
        await chatService.createChatIfNotExists(user.id, "system", "global");

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
          await mapWithConcurrency(clients, 4, async (client) => {
            await chatService.createChatIfNotExists(user.id, client.id, "direct");
          });
        }

        if (user.role === "user" || user.role === "cliente_premium") {
          const admins = await userService.getUsersByRole("admin");
          const targetAdmin = admins.find((admin) => admin.id !== user.id) || null;
          if (targetAdmin?.id) {
            setPrimaryAdminId(targetAdmin.id);
            await chatService.createChatIfNotExists(user.id, targetAdmin.id, "direct");
          }
        }
      } catch (error) {
        console.warn("Error initializing chats:", error);
      }
      perfMeasure("chats.init", "chats.init.start");
    };

    // Adia a inicialização (pesada) para depois das interações atuais:
    // requestIdleCallback quando disponível, com fallbacks seguros.
    let cancelled = false;
    let cancelScheduled: (() => void) | null = null;
    const run = () => {
      if (!cancelled) void initChats();
    };
    const idleHost = globalThis as typeof globalThis & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
      requestAnimationFrame?: (callback: () => void) => number;
      cancelAnimationFrame?: (handle: number) => void;
    };
    if (typeof idleHost.requestIdleCallback === "function") {
      const handle = idleHost.requestIdleCallback(run, { timeout: 1500 });
      cancelScheduled = () => idleHost.cancelIdleCallback?.(handle);
    } else if (typeof idleHost.requestAnimationFrame === "function") {
      const handle = idleHost.requestAnimationFrame(run);
      cancelScheduled = () => idleHost.cancelAnimationFrame?.(handle);
    } else {
      const handle = setTimeout(run, 0);
      cancelScheduled = () => clearTimeout(handle);
    }
    return () => {
      cancelled = true;
      cancelScheduled?.();
    };
  }, [user?.id, user?.role, (user as any)?.consultantId]);

  useEffect(() => {
    if (!params?.chatId) return;
    setSelectedChatId(String(params.chatId));
  }, [params?.chatId]);

  useEffect(() => {
    allowOlderLoadRef.current = false;
    setEditingMessage(null);
    setActionMessage(null);
    setReplyTo(null);
  }, [selectedChatId]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    },
    [],
  );

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

  const loadProfiles = useCallback(
    async (ids: string[], keepPhotoIds: Set<string> = new Set()) => {
      const uniqueIds = Array.from(
        new Set(ids.filter((id) => id && id !== "system")),
      ).filter((id) => {
        if (profilesLoadingRef.current.has(id)) return false;
        const existing = userMapRef.current[id];
        if (!existing) return true;
        // Já carregou sem foto; chat direto precisa recarregar o base64.
        if (
          keepPhotoIds.has(id) &&
          !existing.photoBase64 &&
          !existing.photoUrl
        ) {
          return true;
        }
        return false;
      });

      if (!uniqueIds.length) return;

      uniqueIds.forEach((id) => profilesLoadingRef.current.add(id));

      const updates: Record<string, any> = {};
      const nameUpdates: Record<string, string> = {};

      perfMark("profiles.load.start");
      await mapWithConcurrency(uniqueIds, 6, async (id) => {
          try {
            const userData = await userService.getUserLiteById(id);
            if (userData) {
              // Sem base64 em massa no bate-papo (app fechava por memória).
              // Direto / allowlist: mantém foto. photoUrl sempre preservado.
              updates[id] = {
                ...userData,
                photoBase64: "",
              };
              nameUpdates[id] = profileDisplayName(userData);
            }
          } catch {
            // ignore
          } finally {
            profilesLoadingRef.current.delete(id);
          }
      });
      perfMeasure("profiles.load.done", "profiles.load.start");

      if (Object.keys(updates).length > 0) {
        setUserMap((prev) => ({ ...prev, ...updates }));
        void prefetchRemoteImages(
          Object.values(updates).map((profile) =>
            resolveProfilePhotoUri(profile),
          ),
        );
      }
      if (Object.keys(nameUpdates).length > 0) {
        setPreviewSenderMap((prev) => ({ ...prev, ...nameUpdates }));
      }
    },
    [],
  );

  const recentSenderKey = (messages || [])
    .slice(-30)
    .map((msg: any) => msg?.senderId || "")
    .join("|");

  // Resolve participant profiles for chats and messages
  useEffect(() => {
    if (!user?.id) return;

    const ids: string[] = [];
    const keepPhotoIds = new Set<string>([user.id]);
    if ((user as any).consultantId) ids.push((user as any).consultantId);
    if (primaryAdminId) ids.push(primaryAdminId);

    if (selectedChatId) {
      const active = (processedChats || []).find(
        (chat: any) => chat.id === selectedChatId,
      );
      const isGlobal =
        selectedChatId === "global" || active?.type === "global";
      const isDirect =
        !isGlobal &&
        Array.isArray(active?.participants) &&
        active.participants.length === 2;

      (active?.participants || []).forEach((id: string) => ids.push(id));
      (messages || []).slice(-30).forEach((msg: any) => {
        if (msg?.senderId) ids.push(msg.senderId);
      });

      if (isDirect) {
        (active?.participants || []).forEach((id: string) => {
          if (id) keepPhotoIds.add(id);
        });
      }
    } else {
      (processedChats || []).forEach((chat: any) => {
        const other = (chat?.participants || []).find(
          (id: string) => id && id !== user.id,
        );
        if (other) {
          ids.push(other);
          if (chat?.type !== "global" && (chat?.participants || []).length === 2) {
            keepPhotoIds.add(other);
          }
        }
        if (chat?.lastMessage?.senderId) ids.push(chat.lastMessage.senderId);
      });
    }

    loadProfiles(ids, keepPhotoIds);
  }, [
    processedChats,
    recentSenderKey,
    user?.id,
    primaryAdminId,
    loadProfiles,
    selectedChatId,
  ]);

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

  const isOwnMessage = useCallback(
    (msg: Message) => {
      if (!user?.id || msg.senderId !== user.id) return false;
      const sender = userMap[msg.senderId];
      const senderIsCouple = isCoupleAccount(sender);
      const senderMember = parseCoupleMember(msg.senderCoupleMember);
      const ownMember = parseCoupleMember(activeCoupleMember);
      return (
        !senderIsCouple ||
        senderMember == null ||
        ownMember == null ||
        senderMember === ownMember
      );
    },
    [activeCoupleMember, user?.id, userMap],
  );

  const actionMessageIsOwn = actionMessage
    ? isOwnMessage(actionMessage)
    : false;
  const actionMessageCanMutate = Boolean(
    actionMessage &&
      actionMessageIsOwn &&
      canMutateOwnChatMessage(actionMessage) &&
      !isChatMessageDeleted(actionMessage),
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
    return chatMessages
      .filter((msg) => !blocked.has(msg.senderId) || msg.senderId === user?.id)
      .slice()
      .reverse();
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

  const newestMessageId = orderedMessages[0]?.id || "";
  const previousNewestIdRef = useRef<string>("");
  const nearBottomRef = useRef(true);
  const seenMentionIdsRef = useRef<string[]>([]);
  const seenReadyRef = useRef(false);
  const [seenMentionIds, setSeenMentionIds] = useState<string[]>([]);

  useEffect(() => {
    seenReadyRef.current = false;
    seenMentionIdsRef.current = [];
    setSeenMentionIds([]);
    if (!user?.id || !selectedChatId) return;
    let cancelled = false;
    loadSeenMentionIds(user.id, selectedChatId)
      .then((ids) => {
        if (cancelled) return;
        seenMentionIdsRef.current = ids;
        setSeenMentionIds(ids);
        seenReadyRef.current = true;
      })
      .catch((error) => {
        console.warn("[menção] não foi possível ler o estado", error);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedChatId, user?.id]);

  const unseenMentions = useMemo(
    () =>
      listUnseenMentions(
        orderedMessages.map((message) => ({
          id: String(message.id || ""),
          createdAtMs: getMessageTimeMs(message.createdAt),
          senderId: String(message.senderId || ""),
          mentionUserIds: (message.mentions || []).map((mention: ChatMention) =>
            String(mention.userId || ""),
          ),
        })),
        user?.id || "",
        new Set(seenMentionIds),
      ),
    [orderedMessages, seenMentionIds, user?.id],
  );

  const mentionContextRef = useRef({
    userId: "",
    chatId: "",
    messages: [] as typeof orderedMessages,
  });
  mentionContextRef.current = {
    userId: user?.id || "",
    chatId: selectedChatId || "",
    messages: orderedMessages,
  };

  const mentionViewability = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableMentions = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item?: { id?: string } }> }) => {
      const { userId, chatId, messages } = mentionContextRef.current;
      if (!seenReadyRef.current || !userId || !chatId) return;
      const mentionIds = viewableItems
        .map((entry) => String(entry.item?.id || ""))
        .filter((id) =>
          messages.some(
            (message) =>
              message.id === id &&
              message.senderId !== userId &&
              (message.mentions || []).some(
                (mention: ChatMention) => mention.userId === userId,
              ),
          ),
        );
      if (!mentionIds.length) return;
      const next = mergeSeenMentionIds(seenMentionIdsRef.current, mentionIds);
      if (next.length === seenMentionIdsRef.current.length) return;
      seenMentionIdsRef.current = next;
      setSeenMentionIds(next);
      saveSeenMentionIds(userId, chatId, next).catch((error) => {
        console.warn("[menção] não foi possível gravar a visualização", error);
      });
    },
  ).current;

  const jumpToOldestUnseenMention = () => {
    const target = unseenMentions[0];
    if (!target) return;
    const index = orderedMessages.findIndex((message) => message.id === target.id);
    if (index < 0) return;
    setHighlightedMessageId(target.id);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.4,
    });
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setHighlightedMessageId(null);
    }, 3500);
  };

  useEffect(() => {
    if (!newestMessageId || newestMessageId === previousNewestIdRef.current) {
      previousNewestIdRef.current = newestMessageId;
      return;
    }
    previousNewestIdRef.current = newestMessageId;
    if (!nearBottomRef.current) return;
    try {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    } catch {
      // ignore
    }
  }, [newestMessageId]);

  useEffect(() => {
    if (!selectedChatId || !user?.id || !newestMessageId) return;
    if (newestMessageId.startsWith("pending-")) return;
    const timer = setTimeout(() => {
      chatService.markChatAsRead(selectedChatId, user.id).catch(() => {
        // ignore read marker errors
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [selectedChatId, user?.id, newestMessageId]);

  const reactionSheet = useMemo(() => {
    if (!reactionFocus) return null;
    const message = messages.find((item) => item.id === reactionFocus.messageId);
    if (!message) return null;

    const entries = Object.entries(message.reactions || {}).filter(
      ([, emoji]) => Boolean(emoji),
    );
    if (!entries.length) return null;

    const counts = new Map<string, number>();
    entries.forEach(([, emoji]) => {
      counts.set(emoji, (counts.get(emoji) || 0) + 1);
    });

    const selected =
      reactionFocus.emoji && counts.has(reactionFocus.emoji)
        ? reactionFocus.emoji
        : null;

    const people = entries
      .filter(([, emoji]) => !selected || emoji === selected)
      .map(([userId, emoji]) => {
        const isOwn = userId === user?.id;
        const profile = isOwn ? user : userMap[userId];
        const badgeId = (profile as any)?.activeBadgeBorderId;
        return {
          userId,
          emoji,
          isOwn,
          name: isOwn ? "Você" : getParticipantDisplayName(userId),
          photoUri: resolveProfilePhotoUri(profile),
          ring: resolveAvatarRingDefinition(
            badgeId ? badgeDefinitionsById.get(badgeId) || null : null,
          ),
          badge: resolveAvatarBadgeDefinition(
            badgeId ? badgeDefinitionsById.get(badgeId) || null : null,
            badgesByUser.get(userId),
          ),
        };
      })
      .sort((a, b) => Number(b.isOwn) - Number(a.isOwn));

    return {
      message,
      chips: Array.from(counts.entries()),
      selected,
      people,
    };
  }, [
    badgeDefinitionsById,
    badgesByUser,
    getParticipantDisplayName,
    messages,
    reactionFocus,
    user,
    userMap,
  ]);

  const reactionCardFrame = useMemo(() => {
    if (!reactionCardPos) return null;
    const margin = 12;
    // Só ajusta pra caber na tela; não inverte acima/abaixo do chip.
    let top = reactionCardPos.top;
    if (top + reactionCardHeight > windowSize.height - margin) {
      top = Math.max(margin, windowSize.height - reactionCardHeight - margin);
    }
    if (top < margin) top = margin;
    return {
      top,
      left: reactionCardPos.left,
      width: reactionCardPos.width,
    };
  }, [reactionCardHeight, reactionCardPos, windowSize.height]);

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
  const canAccess = [
    "admin",
    "consultor",
    "supervisor",
    "user",
    "cliente_premium",
  ].includes(userRole);

  const isGroupChat = (chat: any): boolean => {
    return (
      chat?.id === "global" ||
      chat?.type === "global" ||
      chat?.type === "group" ||
      (chat?.participants && chat.participants.length > 2)
    );
  };

  const findClientParticipantId = (chat: any): string | null => {
    const participants = (chat?.participants || []).filter(
      (id: string) => id && id !== "system",
    ) as string[];
    const byRole = participants.find((id) => isClientRole(userMap[id]?.role));
    if (byRole) return byRole;
    // Fallback: quem não é admin/consultor/supervisor
    const byExclusion = participants.find((id) => {
      const role = String(userMap[id]?.role || "").toLowerCase();
      return !["admin", "consultor", "supervisor"].includes(role);
    });
    return byExclusion || null;
  };

  const isConsultationStaffGroup = (chat: any): boolean => {
    if (!isGroupChat(chat)) return false;
    if (chat?.id === "global" || chat?.type === "global") return false;
    const participants = (chat?.participants || []) as string[];
    if (participants.length < 2) return false;
    const hasClient = participants.some((id) => isClientRole(userMap[id]?.role));
    const hasStaff = participants.some((id) => {
      const role = String(userMap[id]?.role || "").toLowerCase();
      return role === "consultor" || role === "supervisor";
    });
    return hasClient && hasStaff;
  };

  const getChatTitle = (chat: any): string => {
    const isClient = ["user", "cliente_premium"].includes(userRole);
    const isPrivileged = ["admin", "consultor", "supervisor"].includes(userRole);

    if (isGroupChat(chat)) {
      if (chat?.id === "global" || chat?.type === "global") return "Bate-Papo";

      // Grupo cliente + consultor (+ supervisor):
      // cliente vê "Consultoria financeira"; staff vê o nome do cliente.
      if (isConsultationStaffGroup(chat) || (chat?.participants || []).length > 2) {
        if (isClient) {
          return "Consultoria financeira";
        }
        if (userRole === "consultor" || userRole === "supervisor") {
          const clientId = findClientParticipantId(chat);
          if (clientId) return getParticipantDisplayName(clientId);
        }
        if (userRole === "admin") {
          const clientId = findClientParticipantId(chat);
          const hasSupervisor = (chat?.participants || []).some(
            (id: string) =>
              String(userMap[id]?.role || "").toLowerCase() === "supervisor",
          );
          const clientName = clientId
            ? getParticipantDisplayName(clientId)
            : "Cliente";
          return hasSupervisor
            ? `Grupo: ${clientName} + Consultor + Supervisor`
            : `Grupo: ${clientName} + Consultor`;
        }
      }

      if (isPrivileged) {
        const hasSupervisor = (chat?.participants || []).some(
          (id: string) =>
            String(userMap[id]?.role || "").toLowerCase() === "supervisor",
        );
        return hasSupervisor
          ? "Grupo: Cliente + Consultor + Supervisor"
          : "Grupo: Cliente + Consultor";
      }
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
    // Prefer live thread when this chat is open (covers apagar/editar da última msg)
    if (chat?.id === selectedChatId && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const text = getChatMessageDisplayText(lastMsg).trim();
      const liveSenderId = lastMsg?.senderId;
      const liveSenderLabel = resolveCoupleChatSenderLabel(
        liveSenderId,
        user?.id,
        liveSenderId ? userMap[liveSenderId] : null,
        lastMsg?.senderCoupleMember,
        liveSenderId
          ? userMap[liveSenderId]
            ? undefined
            : previewSenderMap[liveSenderId]
          : undefined,
      );
      if (text.length > 0) {
        return `${liveSenderLabel}: ${text}`.substring(0, 70);
      }
    }

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
      const display = getChatMessageDisplayText({
        text: fromList,
        deletedAt: null,
      }).trim();
      return `${senderLabel}: ${display}`.substring(0, 70);
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
    const text = inputText.trim();
    if (!text || !selectedChatId || !user?.id || sendingRef.current) return;
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

    // Não filtrar por mentionCandidates: no bate-papo global participants=[] e
    // a lista só cobre remetentes recentes; isso apagava @menções e zerava o push.
    const mentions = mentionsStillInText(inputText, pendingMentions).filter(
      (mention) => mention.userId && mention.userId !== user.id,
    );
    const editingTarget = editingMessage;
    const replyPayload =
      editingTarget || !replyTo
        ? null
        : {
            messageId: replyTo.id,
            senderId: replyTo.senderId,
            text: String(replyTo.text || "").slice(0, 180),
          };

    sendingRef.current = true;
    setInputText("");
    setPendingMentions([]);
    setReplyTo(null);
    setEditingMessage(null);
    setShowEmojiPicker(false);

    try {
      if (editingTarget?.id) {
        await chatService.editMessage(
          selectedChatId,
          editingTarget.id,
          user.id,
          text,
          mentions,
        );
        return;
      }

      await sendMessage(text, {
        mentions,
        replyTo: replyPayload,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      setInputText(text);
      if (editingTarget?.id) {
        setEditingMessage(editingTarget);
      }
      const errorLabel = editingTarget?.id
        ? "Não foi possível editar a mensagem. Tente de novo."
        : "Não foi possível enviar a mensagem. Tente de novo.";
      Alert.alert("Erro", errorLabel);
      sendingRef.current = false;
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

  const handleStartEditMessage = () => {
    if (!actionMessage || !actionMessageCanMutate) return;
    setEditingMessage(actionMessage);
    setInputText(actionMessage.text);
    setPendingMentions(actionMessage.mentions || []);
    setReplyTo(null);
    setActionMessage(null);
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = () => {
    if (!actionMessage || !selectedChatId || !user?.id || !actionMessageCanMutate) {
      return;
    }
    const target = actionMessage;
    setActionMessage(null);
    Alert.alert("Apagar mensagem", "Todos verão que a mensagem foi apagada.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await chatService.softDeleteMessage(
                selectedChatId,
                target.id,
                user.id,
              );
            } catch (error) {
              console.error("Erro ao apagar mensagem:", error);
              Alert.alert("Erro", "Não foi possível apagar a mensagem agora.");
            }
          })();
        },
      },
    ]);
  };

  const handleToggleReaction = async (msg: Message, emoji: string) => {
    if (!user?.id || !selectedChatId || !msg.id) return;
    const next = normalizeReactionEmoji(emoji);
    const current = normalizeReactionEmoji(msg.reactions?.[user.id] || "");
    try {
      await chatService.setMessageReaction(
        selectedChatId,
        msg.id,
        user.id,
        current === next ? null : next,
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
      const next = normalizeHeartEmojisInText(`${current}${emoji}`);
      return next.length > 500 ? next.slice(0, 500) : next;
    });
  };

  const getStartChatLabel = (person: any): string =>
    profileDisplayName(person, person?.email || "Usuário");

  // Selo sobre a foto, igual ao Ranking: borda ativa primeiro e, sem ela,
  // a primeira insígnia concedida do usuário. Sem nenhuma, sem selo.
  // Anel separado: só a borda ativa escolhida, sem fallback.
  const ringDefinitionForPerson = (person: any): BadgeDefinition | null => {
    const badgeId = person?.activeBadgeBorderId;
    return resolveAvatarRingDefinition(
      badgeId ? badgeDefinitionsById.get(badgeId) || null : null,
    );
  };
  const badgeDefinitionForPerson = (person: any): BadgeDefinition | null => {
    const badgeId = person?.activeBadgeBorderId;
    const activeBorder = badgeId
      ? badgeDefinitionsById.get(badgeId) || null
      : null;
    return resolveAvatarBadgeDefinition(
      activeBorder,
      person?.id ? badgesByUser.get(person.id) : undefined,
    );
  };

  const renderUserAvatar = (
    person: any,
    size: number,
    fallbackIcon?: keyof typeof Ionicons.glyphMap,
  ) => {
    const uri = resolveProfilePhotoUri(person);
    if (uri) {
      return (
        <CachedRemoteImage
          uri={uri}
          recyclingKey={person?.id || uri}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          contentFit="cover"
        />
      );
    }
    if (!person && fallbackIcon) {
      return <Ionicons name={fallbackIcon} size={Math.round(size * 0.66)} color="#8c52ff" />;
      return <Ionicons name={fallbackIcon} size={Math.round(size * 0.66)} color="#B900FF" />;
    }
    return (
      <Text style={[styles.listAvatarInitial, { fontSize: Math.round(size * 0.38) }]}>
        {profileInitial(person)}
      </Text>
    );
  };

  const isClientRole = (role?: string) =>
    ["user", "cliente", "cliente_premium"].includes(
      String(role || "").toLowerCase(),
    );
  const isConsultorRole = (role?: string) =>
    String(role || "").toLowerCase() === "consultor";
  const isSupervisorRole = (role?: string) =>
    String(role || "").toLowerCase() === "supervisor";

  const filteredStartChatUsers = useMemo(() => {
    const q = startChatQuery.trim().toLowerCase();

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

  const filteredAddSupervisorUsers = useMemo(() => {
    const q = addSupervisorQuery.trim().toLowerCase();
    const excludeIds = new Set(
      [
        user?.id,
        addSupervisorClient?.id,
        addSupervisorConsultant?.id,
      ].filter(Boolean),
    );

    return addSupervisorUsers
      .filter((person) => person?.id && !excludeIds.has(person.id))
      .filter((person) => {
        if (addSupervisorStep === "cliente") return isClientRole(person.role);
        if (addSupervisorStep === "consultor")
          return isConsultorRole(person.role);
        return isSupervisorRole(person.role);
      })
      .filter((person) => {
        if (!q) return true;
        return (
          getStartChatLabel(person).toLowerCase().includes(q) ||
          String(person?.email || "")
            .toLowerCase()
            .includes(q)
        );
      });
  }, [
    addSupervisorQuery,
    addSupervisorStep,
    addSupervisorUsers,
    addSupervisorClient?.id,
    addSupervisorConsultant?.id,
    user?.id,
  ]);

  const ensureStartChatUsersLoaded = async () => {
    if (startChatUsers.length > 0) return startChatUsers;
    const list = await userService.getAllUsersLite();
    setStartChatUsers(list || []);
    return list || [];
  };

  const openStartChat = async () => {
    setStartChatVisible(true);
    setStartChatQuery("");
    setStartChatRole("cliente");
    if (startChatUsers.length > 0) return;

    setStartChatLoading(true);
    try {
      await ensureStartChatUsersLoaded();
    } catch (error) {
      console.error("Erro ao carregar usuários para o chat:", error);
      Alert.alert("Erro", "Não foi possível carregar os usuários.");
    } finally {
      setStartChatLoading(false);
    }
  };

  const openAddSupervisor = async () => {
    setAddSupervisorVisible(true);
    setAddSupervisorStep("cliente");
    setAddSupervisorQuery("");
    setAddSupervisorClient(null);
    setAddSupervisorConsultant(null);

    if (addSupervisorUsers.length > 0) return;

    setAddSupervisorLoading(true);
    try {
      const list =
        startChatUsers.length > 0
          ? startChatUsers
          : await ensureStartChatUsersLoaded();
      setAddSupervisorUsers(list || []);
    } catch (error) {
      console.error("Erro ao carregar usuários para incluir supervisor:", error);
      Alert.alert("Erro", "Não foi possível carregar os usuários.");
    } finally {
      setAddSupervisorLoading(false);
    }
  };

  const closeAddSupervisor = () => {
    setAddSupervisorVisible(false);
    setAddSupervisorStep("cliente");
    setAddSupervisorQuery("");
    setAddSupervisorClient(null);
    setAddSupervisorConsultant(null);
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

  const resolveConsultantForClient = (client: any) => {
    const consultantId = String(client?.consultantId || "").trim();
    if (!consultantId) return null;
    return (
      addSupervisorUsers.find((person) => person?.id === consultantId) ||
      startChatUsers.find((person) => person?.id === consultantId) ||
      userMap[consultantId] || {
        id: consultantId,
        name: "Consultor",
        role: "consultor",
      }
    );
  };

  const handlePickAddSupervisorPerson = async (person: any) => {
    if (!person?.id || addingSupervisor) return;

    if (addSupervisorStep === "cliente") {
      setAddSupervisorClient(person);
      setAddSupervisorQuery("");
      const linked = resolveConsultantForClient(person);
      if (linked?.id) {
        setAddSupervisorConsultant(linked);
        setAddSupervisorStep("supervisor");
      } else {
        setAddSupervisorConsultant(null);
        setAddSupervisorStep("consultor");
      }
      return;
    }

    if (addSupervisorStep === "consultor") {
      setAddSupervisorConsultant(person);
      setAddSupervisorQuery("");
      setAddSupervisorStep("supervisor");
      return;
    }

    if (!addSupervisorClient?.id || !addSupervisorConsultant?.id) {
      Alert.alert("Atenção", "Selecione o cliente e o consultor antes.");
      return;
    }

    setAddingSupervisor(true);
    try {
      await chatService.addSupervisorToClientConsultantChat(
        addSupervisorClient.id,
        addSupervisorConsultant.id,
        person.id,
      );
      closeAddSupervisor();
      Alert.alert(
        "Supervisor incluído",
        `${getStartChatLabel(person)} entrou no chat de ${getStartChatLabel(
          addSupervisorClient,
        )} com ${getStartChatLabel(addSupervisorConsultant)}.`,
      );
    } catch (error) {
      console.error("Erro ao incluir supervisor no chat:", error);
      Alert.alert(
        "Erro",
        "Não foi possível incluir o supervisor no chat do cliente e consultor.",
      );
    } finally {
      setAddingSupervisor(false);
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

  const chatListPane = (
        <View style={desktop ? styles.desktopList : styles.container}>
          {isAdminUser ? (
            <View style={styles.adminChatActions}>
              <TouchableOpacity
                style={[styles.startChatButton, styles.adminChatActionButton]}
                onPress={openStartChat}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.startChatButtonText}>Iniciar bate-papo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.startChatButton,
                  styles.adminChatActionButton,
                  styles.addSupervisorButton,
                ]}
                onPress={openAddSupervisor}
                activeOpacity={0.8}
              >
                <Ionicons name="people-outline" size={18} color="#fff" />
                <Text style={styles.startChatButtonText}>
                  Incluir supervisor
                </Text>
              </TouchableOpacity>
            </View>
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
              style={{ flex: 1 }}
              data={visibleChats}
              keyExtractor={(item) => item.id}
              renderItem={({ item: chat }) => {
                const group = isGroupChat(chat);
                const isGlobalGroup =
                  chat?.id === "global" || chat?.type === "global";
                const consultationClientId =
                  group &&
                  !isGlobalGroup &&
                  (userRole === "consultor" || userRole === "supervisor")
                    ? findClientParticipantId(chat)
                    : null;
                const otherId = consultationClientId
                  ? consultationClientId
                  : group
                    ? null
                    : (chat.participants || []).find(
                        (id: string) => id !== user?.id,
                      );
                const otherPerson = otherId ? userMap[otherId] : null;
                const otherPhoto = resolveProfilePhotoUri(otherPerson);
                const otherBadge = badgeDefinitionForPerson(otherPerson);
                const showPeopleAvatar = group && !consultationClientId;
                return (
                <TouchableOpacity
                  style={styles.chatRow}
                  onPress={() => setSelectedChatId(chat.id)}
                  activeOpacity={0.7}
                >
                  {showPeopleAvatar ? (
                    <View style={styles.avatarContainer}>
                      {renderUserAvatar(null, 48, "people")}
                    </View>
                  ) : (
                    <View style={styles.avatarBadgeWrap}>
                      <BadgedAvatar
                        photoUri={otherPhoto}
                        displayName={
                          consultationClientId
                            ? getParticipantDisplayName(consultationClientId)
                            : getStartChatLabel(otherPerson)
                        }
                        size={44}
                        ringDefinition={ringDefinitionForPerson(otherPerson)}
                        badgeDefinition={otherBadge}
                        crownPosition={crownForPerson(otherPerson)}
                        onPhotoPress={
                          otherPhoto && otherId
                            ? () =>
                                setChatPhotoPreview({
                                  uri: otherPhoto,
                                  name: consultationClientId
                                    ? getParticipantDisplayName(
                                        consultationClientId,
                                      )
                                    : getStartChatLabel(otherPerson),
                                  userId: otherId,
                                  rankingPreference:
                                    otherPerson?.rankingPreference,
                                })
                            : undefined
                        }
                        onBadgePress={
                          otherBadge ? setSelectedChatBadge : undefined
                        }
                      />
                    </View>
                  )}
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
                );
              }}
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
                  <ActivityIndicator color="#B900FF" style={{ marginTop: 24 }} />
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

          <Modal
            visible={addSupervisorVisible}
            animationType="slide"
            transparent
            onRequestClose={closeAddSupervisor}
          >
            <View style={styles.startChatBackdrop}>
              <View style={styles.startChatCard}>
                <Text style={styles.startChatTitle}>Incluir supervisor</Text>
                <Text style={styles.startChatSubtitle}>
                  {addSupervisorStep === "cliente"
                    ? "Escolha o cliente do chat com o consultor"
                    : addSupervisorStep === "consultor"
                      ? "Este cliente não tem consultor vinculado. Escolha o consultor do chat"
                      : `Escolha o supervisor para entrar no chat de ${getStartChatLabel(
                          addSupervisorClient,
                        )} com ${getStartChatLabel(addSupervisorConsultant)}`}
                </Text>

                {addSupervisorClient || addSupervisorConsultant ? (
                  <View style={styles.addSupervisorSummary}>
                    {addSupervisorClient ? (
                      <Text style={styles.addSupervisorSummaryText}>
                        Cliente: {getStartChatLabel(addSupervisorClient)}
                      </Text>
                    ) : null}
                    {addSupervisorConsultant ? (
                      <Text style={styles.addSupervisorSummaryText}>
                        Consultor: {getStartChatLabel(addSupervisorConsultant)}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <TextInput
                  placeholder={
                    addSupervisorStep === "cliente"
                      ? "Buscar cliente..."
                      : addSupervisorStep === "consultor"
                        ? "Buscar consultor..."
                        : "Buscar supervisor..."
                  }
                  placeholderTextColor="#777"
                  value={addSupervisorQuery}
                  onChangeText={setAddSupervisorQuery}
                  style={styles.startChatSearch}
                />

                {addSupervisorLoading ? (
                  <ActivityIndicator color="#B900FF" style={{ marginTop: 24 }} />
                ) : (
                  <FlatList
                    data={filteredAddSupervisorUsers}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={
                      <Text style={styles.startChatEmpty}>
                        Nenhum{" "}
                        {addSupervisorStep === "cliente"
                          ? "cliente"
                          : addSupervisorStep === "consultor"
                            ? "consultor"
                            : "supervisor"}{" "}
                        encontrado
                      </Text>
                    }
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.startChatItem}
                        onPress={() => handlePickAddSupervisorPerson(item)}
                        disabled={addingSupervisor}
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

                <View style={styles.addSupervisorFooter}>
                  {addSupervisorStep !== "cliente" ? (
                    <TouchableOpacity
                      style={styles.startChatClose}
                      onPress={() => {
                        setAddSupervisorQuery("");
                        if (addSupervisorStep === "supervisor") {
                          if (
                            addSupervisorClient &&
                            !String(addSupervisorClient?.consultantId || "").trim()
                          ) {
                            setAddSupervisorConsultant(null);
                            setAddSupervisorStep("consultor");
                          } else {
                            setAddSupervisorClient(null);
                            setAddSupervisorConsultant(null);
                            setAddSupervisorStep("cliente");
                          }
                        } else {
                          setAddSupervisorClient(null);
                          setAddSupervisorConsultant(null);
                          setAddSupervisorStep("cliente");
                        }
                      }}
                      disabled={addingSupervisor}
                    >
                      <Text style={styles.startChatCloseText}>Voltar</Text>
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    style={styles.startChatClose}
                    onPress={closeAddSupervisor}
                    disabled={addingSupervisor}
                  >
                    <Text style={styles.startChatCloseText}>
                      {addingSupervisor ? "Incluindo..." : "Fechar"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>
  );

  const chatOverlays = (
    <>
      <BadgeDetailModal
        definition={selectedChatBadge}
        onClose={() => setSelectedChatBadge(null)}
      />
      <PhotoPreviewModal
        visible={Boolean(chatPhotoPreview)}
        uri={chatPhotoPreview?.uri}
        name={chatPhotoPreview?.name}
        userId={chatPhotoPreview?.userId}
        rankingPreference={chatPhotoPreview?.rankingPreference}
        onViewProfile={(userId) => {
          setChatPhotoPreview(null);
          navigate("PublicGamificationProfile", { userId });
        }}
        onClose={() => setChatPhotoPreview(null)}
      />
    </>
  );

  if (selectedChatId === null && !desktop) {
    return (
      <Layout>
        {chatListPane}
        {chatOverlays}
      </Layout>
    );
  }

  if (selectedChatId === null && desktop) {
    return (
      <Layout desktopWidth="full">
        <View style={styles.desktopSplit}>
          {chatListPane}
          <View style={styles.desktopEmpty}>
            <Ionicons name="chatbubbles-outline" size={42} color="#666" />
            <Text style={styles.emptyText}>Selecione uma conversa</Text>
          </View>
        </View>
        {chatOverlays}
      </Layout>
    );
  }

  const headerPerson = otherParticipantId
    ? userMap[otherParticipantId]
    : null;
  const headerPhoto = resolveProfilePhotoUri(headerPerson);
  const headerBadge = badgeDefinitionForPerson(headerPerson);
  const conversationTitleText = isPrivateChat && otherParticipantId
    ? profileDisplayName(
        headerPerson,
        getChatTitle(selectedChat),
      )
    : selectedChat
      ? getChatTitle(selectedChat)
      : "Chat";

  const conversationTitleAccessory =
    isPrivateChat && otherParticipantId ? (
      <BadgedAvatar
        photoUri={headerPhoto}
        displayName={conversationTitleText}
        size={32}
        ringDefinition={ringDefinitionForPerson(headerPerson)}
        badgeDefinition={headerBadge}
        crownPosition={crownForPerson(headerPerson)}
        onPhotoPress={
          headerPhoto
            ? () =>
                setChatPhotoPreview({
                  uri: headerPhoto,
                  name: conversationTitleText,
                  userId: otherParticipantId,
                  rankingPreference: headerPerson?.rankingPreference,
                })
            : undefined
        }
        onBadgePress={headerBadge ? setSelectedChatBadge : undefined}
      />
    ) : null;

  const conversationRightAction = otherParticipantId ? (
    <TouchableOpacity
      onPress={openChatSafetyMenu}
      style={styles.headerRight}
      accessibilityLabel="Opções de segurança"
      disabled={moderationBusy}
    >
      <Ionicons name="ellipsis-vertical" size={22} color="#B900FF" />
    </TouchableOpacity>
  ) : undefined;

  const COMPACT_MESSAGE_GAP_MS = 5 * 60 * 1000;

  const threadBody = (
      <>
        {/* No mobile a header do Layout assume voltar/foto/menu. No desktop mantém barra local. */}
        {desktop ? (
        <View style={styles.conversationHeader}>
          {isPrivateChat && otherParticipantId ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              <BadgedAvatar
                photoUri={headerPhoto}
                displayName={conversationTitleText}
                size={36}
                ringDefinition={ringDefinitionForPerson(headerPerson)}
                badgeDefinition={headerBadge}
                crownPosition={crownForPerson(headerPerson)}
                onPhotoPress={
                  headerPhoto
                    ? () =>
                        setChatPhotoPreview({
                          uri: headerPhoto,
                          name: conversationTitleText,
                          userId: otherParticipantId,
                          rankingPreference: headerPerson?.rankingPreference,
                        })
                    : undefined
                }
                onBadgePress={headerBadge ? setSelectedChatBadge : undefined}
              />
              <Text style={styles.conversationTitle}>
                {conversationTitleText}
              </Text>
            </View>
          ) : (
            <Text style={styles.conversationTitle}>
              {conversationTitleText}
            </Text>
          )}

          {conversationRightAction || <View style={styles.headerRight} />}
        </View>
        ) : null}

        {/* Messages List — precisa de flex:1 senão a barra sobe e o meio fica preto */}
        <ImageBackground
          source={require("../../../assets/visao-emblem-neon.jpg")}
          style={styles.messagesPane}
          imageStyle={styles.chatWatermarkImage}
          resizeMode="contain"
        >
          {messagesLoading && orderedMessages.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#B900FF" />
            </View>
          ) : null}
          <FlatList
            ref={flatListRef as any}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesListContent}
            data={orderedMessages}
            keyExtractor={(item, idx) => item.id || `msg-${idx}`}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            windowSize={7}
            renderItem={({ item: msg, index }) => {
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
              const olderNeighbor = orderedMessages[index + 1];
              const compact = Boolean(
                olderNeighbor &&
                  Math.abs(
                    getMessageTimeMs(msg.createdAt) -
                      getMessageTimeMs(olderNeighbor.createdAt),
                  ) < COMPACT_MESSAGE_GAP_MS,
              );
              return (
                <MessageBubble
                  msg={msg}
                  isOwn={isOwn}
                  compact={compact}
                  showAvatar={isGroup || showCoupleSpeaker}
                  showSenderName={isGroup || showCoupleSpeaker}
                  senderLabel={senderLabel}
                  senderPhotoBase64={
                    resolveProfilePhotoUri(sender) || undefined
                  }
                  senderBadgeDefinition={badgeDefinitionForPerson(sender)}
                  senderRingDefinition={ringDefinitionForPerson(sender)}
                  senderCrownPosition={crownForPerson(sender)}
                  onPhotoPress={
                    msg.senderId && resolveProfilePhotoUri(sender)
                      ? () =>
                          setChatPhotoPreview({
                            uri: resolveProfilePhotoUri(sender) as string,
                            name: senderLabel,
                            userId: msg.senderId,
                            rankingPreference: sender?.rankingPreference,
                          })
                      : undefined
                  }
                  onBadgePress={setSelectedChatBadge}
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
                  onReactionPress={(emoji, anchor) => {
                    if (!msg.id) return;
                    openReactionSheet(msg.id, emoji, anchor);
                  }}
                />
              );
            }}
            inverted
            scrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScroll={(event) => {
              nearBottomRef.current = event.nativeEvent.contentOffset.y < 120;
            }}
            scrollEventThrottle={64}
            viewabilityConfig={mentionViewability}
            onViewableItemsChanged={onViewableMentions}
            onEndReached={() => {
              if (!allowOlderLoadRef.current || !hasMore || isLoadingMore) return;
              loadMore();
            }}
            onEndReachedThreshold={0.3}
            onMomentumScrollBegin={() => {
              allowOlderLoadRef.current = true;
            }}
            ListFooterComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  color="#B900FF"
                  style={{ marginVertical: 12 }}
                />
              ) : trimmed ? (
                <TouchableOpacity
                  onPress={returnToRecent}
                  style={{ paddingVertical: 12, alignItems: "center" }}
                >
                  <Text style={{ color: "#c084fc", fontWeight: "700" }}>
                    Voltar às mensagens recentes
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            onScrollToIndexFailed={(info) => {
              flatListRef.current?.scrollToOffset({
                offset: Math.max(0, info.averageItemLength * info.index),
                animated: false,
              });
            }}
          />
          {unseenMentions.length > 0 ? (
            <TouchableOpacity
              style={styles.mentionJump}
              onPress={jumpToOldestUnseenMention}
              accessibilityLabel="Ir para menção não lida"
            >
              <Text style={styles.mentionJumpText}>@</Text>
            </TouchableOpacity>
          ) : null}
        </ImageBackground>

        {/* Input */}
        <View
          style={[
            styles.inputWrapper,
            {
              paddingBottom:
                keyboardInset > 0 ? 8 : Math.max(10, insets.bottom),
            },
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

          {editingMessage ? (
            <View style={styles.replyPreview}>
              <View style={styles.replyPreviewBody}>
                <Text style={styles.replyPreviewLabel}>Editando mensagem</Text>
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {editingMessage.text}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingMessage(null)}>
                <Ionicons name="close" size={18} color="#888" />
              </TouchableOpacity>
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

          {inputText.length >= 500 ? (
            <Text style={styles.charCounter}>{inputText.length}/4000</Text>
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
                color={showEmojiPicker ? "#B900FF" : "#aaa"}
              />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Digite sua mensagem..."
              placeholderTextColor="#999"
              value={inputText}
              onChangeText={(text) =>
                setInputText(normalizeHeartEmojisInText(text))
              }
              onSelectionChange={(event) =>
                setInputSelection(event.nativeEvent.selection)
              }
              multiline
              maxLength={4000}
              textAlignVertical="center"
              blurOnSubmit={false}
              // RN Web sobrescreve onKeyDown interno; onKeyPress é o hook certo.
              // Enter envia; Shift+Enter quebra linha (só desktop web).
              onKeyPress={(event) => {
                if (!(desktop && Platform.OS === "web")) return;
                const native = (event as any)?.nativeEvent || event;
                if (native?.key !== "Enter" || native?.shiftKey) return;
                event.preventDefault();
                void handleSendMessage();
              }}
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
                color={inputText.trim() ? "#B900FF" : "#ccc"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </>
  );

  const threadContainerStyle = desktop ? styles.desktopThread : styles.container;
  const thread = (
    <View
      style={[
        threadContainerStyle,
        keyboardInset > 0 ? { paddingBottom: keyboardInset } : null,
      ]}
    >
      {threadBody}
    </View>
  );

  return (
    <Layout
      desktopWidth={desktop ? "full" : undefined}
      disablePageScroll={desktop}
      safeAreaEdges={["top", "left", "right"]}
      showBackButton={!desktop}
      onBack={!desktop ? () => setSelectedChatId(null) : undefined}
      title={!desktop ? conversationTitleText : undefined}
      titleAccessory={!desktop ? conversationTitleAccessory : undefined}
      rightAction={
        !desktop
          ? conversationRightAction || <View style={styles.headerRight} />
          : undefined
      }
      contentStyle={desktop ? { paddingHorizontal: 0, paddingTop: 0 } : undefined}
    >
      <View style={desktop ? styles.desktopSplit : styles.container}>
        {desktop ? chatListPane : null}
        {thread}
      </View>
      {chatOverlays}
      <MessageActionSheet
        visible={Boolean(actionMessage)}
        isOwn={actionMessageIsOwn}
        canEditOrDelete={actionMessageCanMutate}
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
          setEditingMessage(null);
          setActionMessage(null);
        }}
        onEdit={
          actionMessageCanMutate ? handleStartEditMessage : undefined
        }
        onDelete={
          actionMessageCanMutate ? handleDeleteMessage : undefined
        }
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
      <Modal
        visible={Boolean(reactionSheet)}
        transparent
        animationType="fade"
        onRequestClose={closeReactionSheet}
      >
        <View style={styles.reactionBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar reações"
            onPress={closeReactionSheet}
            style={styles.reactionDismiss}
          />
          {reactionSheet && reactionCardFrame ? (
            <View
              style={[
                styles.reactionCard,
                {
                  top: reactionCardFrame.top,
                  left: reactionCardFrame.left,
                  width: reactionCardFrame.width,
                },
              ]}
              onStartShouldSetResponder={() => true}
              onLayout={(event) => {
                const nextHeight = Math.round(event.nativeEvent.layout.height);
                if (nextHeight > 0 && nextHeight !== reactionCardHeight) {
                  setReactionCardHeight(nextHeight);
                }
              }}
            >
              <Text style={styles.reactionTitle}>
                {reactionSheet.people.length}{" "}
                {reactionSheet.people.length === 1 ? "reação" : "reações"}
              </Text>
              <View style={styles.reactionChipRow}>
                <TouchableOpacity
                  style={[
                    styles.reactionAllChip,
                    reactionPickerOpen && styles.reactionAllChipOn,
                  ]}
                  onPress={() => setReactionPickerOpen((open) => !open)}
                  accessibilityLabel="Mais reações"
                >
                  <Ionicons name="happy-outline" size={18} color="#d7d7d7" />
                </TouchableOpacity>
                {reactionSheet.chips.map(([emoji, count]) => {
                  const active = reactionSheet.selected === emoji;
                  return (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.reactionFilterChip,
                        active && styles.reactionFilterChipOn,
                      ]}
                      onPress={() =>
                        setReactionFocus((current) =>
                          current ? { ...current, emoji } : current,
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.reactionFilterText,
                          active && styles.reactionFilterTextOn,
                        ]}
                      >
                        {emoji} {count}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {reactionPickerOpen ? (
                <EmojiPickerPanel
                  height={reactionPickerHeight}
                  style={styles.reactionPicker}
                  onSelect={(emoji) => {
                    const next = normalizeReactionEmoji(emoji);
                    handleToggleReaction(reactionSheet.message, next);
                    setReactionPickerOpen(false);
                    setReactionFocus((current) =>
                      current ? { ...current, emoji: next } : current,
                    );
                  }}
                />
              ) : null}
              <ScrollView
                style={[
                  styles.reactionList,
                  reactionPickerOpen && styles.reactionListCompact,
                ]}
                bounces={false}
              >
                {reactionSheet.people.map((person) => (
                  <TouchableOpacity
                    key={`${person.userId}-${person.emoji}`}
                    style={styles.reactionPerson}
                    activeOpacity={person.isOwn ? 0.7 : 1}
                    onPress={() => {
                      if (!person.isOwn) return;
                      handleToggleReaction(reactionSheet.message, person.emoji);
                    }}
                  >
                    <BadgedAvatar
                      photoUri={person.photoUri}
                      displayName={person.name}
                      size={30}
                      ringDefinition={person.ring}
                      badgeDefinition={person.badge}
                      crownPosition={crownByUser.get(person.userId) ?? null}
                    />
                    <View style={styles.reactionPersonText}>
                      <Text style={styles.reactionPersonName}>{person.name}</Text>
                      {person.isOwn ? (
                        <Text style={styles.reactionRemoveHint}>
                          Clique para remover
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.reactionPersonEmoji}>{person.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </Layout>
  );
};

const styles = StyleSheet.create({
  desktopSplit: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  desktopList: {
    width: 320,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: "stretch",
    borderRightWidth: 1,
    borderRightColor: "#21172D",
  },
  desktopThread: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  mentionJump: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  mentionJumpText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  desktopEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  reactionBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  reactionDismiss: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  reactionCard: {
    position: "absolute",
    zIndex: 1,
    backgroundColor: "#1c1f21",
    borderRadius: 16,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 16,
    maxHeight: "92%",
  },
  reactionTitle: {
    color: "#f2f2f2",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginLeft: 4,
  },
  reactionChipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
    marginLeft: 2,
  },
  reactionAllChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2d2f",
  },
  reactionAllChipOn: {
    backgroundColor: "#3a3d40",
  },
  reactionPicker: {
    marginBottom: 6,
    borderRadius: 12,
    overflow: "hidden",
    borderTopWidth: 0,
  },
  reactionFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#2a2d2f",
  },
  reactionFilterChipOn: {
    backgroundColor: "#1b7f45",
  },
  reactionFilterText: {
    color: "#e6e6e6",
    fontSize: 14,
    fontWeight: "600",
  },
  reactionFilterTextOn: {
    color: "#ffffff",
  },
  reactionList: {
    maxHeight: 280,
  },
  reactionListCompact: {
    maxHeight: 96,
  },
  reactionPerson: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  reactionAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
  },
  reactionAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: "#3a3d40",
    alignItems: "center",
    justifyContent: "center",
  },
  reactionAvatarInitial: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  reactionPersonText: {
    flex: 1,
    minWidth: 0,
  },
  reactionPersonName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  reactionRemoveHint: {
    color: "#9a9a9a",
    fontSize: 13,
    marginTop: 2,
  },
  reactionPersonEmoji: {
    fontSize: 26,
    marginLeft: 12,
  },
  container: { flex: 1, minHeight: 0 },
  messagesPane: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#000000",
  },
  chatWatermarkImage: {
    opacity: 0.14,
    width: "78%",
    height: "46%",
    left: "11%",
    top: "27%",
  },
  messagesList: {
    flex: 1,
    backgroundColor: "transparent",
  },
  messagesListContent: {
    paddingVertical: 8,
  },
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
    backgroundColor: "#171321",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarBadgeWrap: { marginRight: 12 },
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
    backgroundColor: "#B900FF",
    marginBottom: 6,
  },
  timestampText: { fontSize: 12, color: "#d0d0d0" },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#21172D",
    backgroundColor: "#000000",
  },
  backButton: { paddingHorizontal: 8 },
  conversationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
    color: "#ffffff",
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
    flexShrink: 0,
    borderTopWidth: 1,
    borderTopColor: "#21172D",
    backgroundColor: "#000000",
  },
  mentionList: {
    backgroundColor: "#171321",
    borderTopWidth: 1,
    borderTopColor: "#21172D",
    maxHeight: 180,
  },
  mentionItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#21172D",
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
    backgroundColor: "#171321",
    borderLeftWidth: 3,
    borderLeftColor: "#B900FF",
  },
  replyPreviewBody: {
    flex: 1,
    marginRight: 8,
  },
  replyPreviewLabel: {
    color: "#B900FF",
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
  charCounter: {
    alignSelf: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 6,
    fontSize: 11,
    color: "#888",
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
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#2f2f2f",
    backgroundColor: "#171321",
    color: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    lineHeight: 20,
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
  adminChatActions: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  adminChatActionButton: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  startChatButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: "#B900FF",
    borderRadius: 10,
    minHeight: 44,
  },
  addSupervisorButton: {
    backgroundColor: "#6B21A8",
  },
  startChatButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  addSupervisorSummary: {
    backgroundColor: "#161221",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 4,
  },
  addSupervisorSummaryText: {
    color: "#d7c9ff",
    fontSize: 13,
    fontWeight: "600",
  },
  addSupervisorFooter: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
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
    borderColor: "#21172D",
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
    backgroundColor: "#B900FF",
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
    backgroundColor: "#171321",
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
