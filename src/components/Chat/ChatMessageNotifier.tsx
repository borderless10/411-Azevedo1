import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { useUserChats } from "../../hooks/useUserChats";
import { useNavigation } from "../../routes/NavigationContext";
import {
  requestNotificationPermissions,
  showChatMessageNotification,
} from "../../services/notificationServices";
import { userService } from "../../services/userServices";
import {
  getChatLastMessageTime,
} from "../../utils/chatUtils";
import { getActiveChatId } from "../../utils/chatActivity";

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
    if (!user?.id || !chats?.length) return;

    let cancelled = false;

    const handleNewMessages = async () => {
      for (const chat of chats) {
        if (chat.type !== "direct" || !chat.lastMessage?.text) continue;

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

            let senderName = senderCacheRef.current.get(senderId) || "";
            if (!senderName) {
              try {
                const profile = await userService.getUserById(senderId);
                senderName = getSenderDisplayName(profile);
                senderCacheRef.current.set(senderId, senderName);
              } catch {
                senderName = "Nova mensagem";
              }
            }

            if (cancelled) return;

            const messageText = chat.lastMessage.text;
            setBanner({ chatId, senderName, messageText });
            showChatMessageNotification(senderName, messageText, chatId).catch(
              () => {
                // ignore push errors
              },
            );
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
  }, [chats, user?.id]);

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
    borderColor: "#8c52ff",
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
    backgroundColor: "#8c52ff",
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
