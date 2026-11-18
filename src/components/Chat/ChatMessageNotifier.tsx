import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useGlobalChat, useUserChats } from "../../hooks/useUserChats";
import { useNavigation } from "../../routes/NavigationContext";
import { requestNotificationPermissions } from "../../services/notificationServices";
import { userService } from "../../services/userServices";
import { getChatLastMessageTime } from "../../utils/chatUtils";
import { getActiveChatId } from "../../utils/chatActivity";
import { CHAT_DELETED_MESSAGE_TEXT } from "../../utils/chatMessageMutations";

type BannerState = {
  chatId: string;
  senderName: string;
  messageText: string;
};

const getSenderDisplayName = (profile: any): string =>
  profile?.nickname || profile?.name || "Usuário";

export const ChatMessageNotifier: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { chats } = useUserChats(user?.id || null, user?.role || null);
  const globalChat = useGlobalChat();
  const [appState, setAppState] = useState(AppState.currentState);
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageTimesRef = useRef<Map<string, number>>(new Map());
  const senderCacheRef = useRef<Map<string, string>>(new Map());
  const permissionsRequestedRef = useRef(false);

  useEffect(() => {
    if (permissionsRequestedRef.current || !user?.id) return;
    permissionsRequestedRef.current = true;
    requestNotificationPermissions().catch(() => {
      // Permissão opcional; banner in-app continua funcionando.
    });
  }, [user?.id]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!banner) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setBanner(null);
      });
    }, 6000);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [banner, slideAnim]);

  useEffect(() => {
    if (!user?.id) return;

    const watched = [
      ...(chats || []),
      ...(globalChat ? [globalChat] : []),
    ];
    if (!watched.length) return;

    let cancelled = false;

    const handleNewMessages = async () => {
      for (const chat of watched) {
        if (!chat.lastMessage?.text) continue;
        if (
          String(chat.lastMessage.text).trim() === CHAT_DELETED_MESSAGE_TEXT
        ) {
          lastMessageTimesRef.current.set(
            chat.id,
            getChatLastMessageTime(chat),
          );
          continue;
        }
        if (chat.lastMessage.kind === "reaction") {
          lastMessageTimesRef.current.set(
            chat.id,
            getChatLastMessageTime(chat),
          );
          continue;
        }

        const chatId = chat.id;
        const currentTime = getChatLastMessageTime(chat);
        const previousTime = lastMessageTimesRef.current.get(chatId);

        if (previousTime !== undefined && currentTime > previousTime) {
          const senderId = chat.lastMessage.senderId;
          if (senderId && senderId !== user.id) {
            const activeChatId = getActiveChatId();
            if (activeChatId === chatId) {
              lastMessageTimesRef.current.set(chatId, currentTime);
              continue;
            }

            const isGlobal =
              chatId === "global" || chat.type === "global";
            const mentionIds = Array.isArray(
              (chat.lastMessage as { mentionUserIds?: string[] })
                ?.mentionUserIds,
            )
              ? (chat.lastMessage as { mentionUserIds?: string[] })
                  .mentionUserIds || []
              : [];
            // Bate-papo: banner interno só para quem foi @mencionado
            // (igual à regra do push). Direto: qualquer mensagem.
            if (isGlobal) {
              if (!mentionIds.includes(user.id)) {
                lastMessageTimesRef.current.set(chatId, currentTime);
                continue;
              }
            }

            let senderName =
              senderCacheRef.current.get(senderId) || "Nova mensagem";
            if (!senderCacheRef.current.has(senderId)) {
              userService
                .getUserNotifyProfile(senderId)
                .then((profile) => {
                  if (!profile) return;
                  senderCacheRef.current.set(
                    senderId,
                    getSenderDisplayName(profile),
                  );
                })
                .catch(() => undefined);
            }

            if (cancelled) return;

            if (appState === "active") {
              setBanner({
                chatId,
                senderName: isGlobal
                  ? `${senderName} mencionou você`
                  : senderName,
                messageText: chat.lastMessage.text,
              });
              lastMessageTimesRef.current.set(chatId, currentTime);
            }
            continue;
          }
        }

        lastMessageTimesRef.current.set(chatId, currentTime);
      }
    };

    handleNewMessages().catch(() => {
      // ignore
    });

    return () => {
      cancelled = true;
    };
  }, [appState, chats, globalChat, user?.id]);

  const openChat = () => {
    if (!banner) return;
    navigate("Chat", { chatId: banner.chatId });
    setBanner(null);
  };

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setBanner(null);
    });
  };

  if (!user?.id || !banner) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 8,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.92}
        onPress={openChat}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.senderName}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.messageText}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#d8ccff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a1650",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#B900FF",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#B900FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    color: "#d8ccff",
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default ChatMessageNotifier;
