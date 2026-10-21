import React, { useEffect, useRef } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { userService } from "../../services/userServices";
import {
  cancelDailyExpenseReminder,
  requestNotificationPermissions,
  scheduleDailyExpenseReminder,
} from "../../services/notificationServices";
import { getActiveChatId } from "../../utils/chatActivity";

const EXPO_PROJECT_ID = "be2008b3-c7c7-453f-af2c-2cf82fcfcd56";


const openChatFromData = (
  navigate: (screen: "Chat", params?: Record<string, unknown>) => void,
  data?: Record<string, unknown> | null,
) => {
  const chatId = String(data?.chatId || "").trim();
  if (!chatId) return;
  const messageId = String(data?.messageId || "").trim();
  navigate("Chat", {
    chatId,
    ...(messageId ? { messageId } : {}),
  });
};

export const PushBootstrap: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const lastSavedTokenRef = useRef("");

  useEffect(() => {
    if (!user?.id || Platform.OS === "web") return;

    let cancelled = false;

    const saveExpoPushToken = async () => {
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: EXPO_PROJECT_ID,
      });
      const token = String(tokenResponse?.data || "").trim();
      if (!token || cancelled) return;
      // Só grava quando o token muda de verdade: cada gravação é uma
      // escrita no Firestore e dispara os listeners do documento do usuário.
      if (
        token === lastSavedTokenRef.current ||
        token === String(user.expoPushToken || "").trim()
      ) {
        lastSavedTokenRef.current = token;
        return;
      }
      lastSavedTokenRef.current = token;
      await userService.updatePushToken(user.id, token);
    };

    const register = async () => {
      const granted = await requestNotificationPermissions();
      if (!granted || cancelled || !Device.isDevice) return;

      try {
        await saveExpoPushToken();
      } catch (error) {
        console.warn("Não foi possível obter o token de push:", error);
      }

      if (user.expenseReminderEnabled === false) {
        await cancelDailyExpenseReminder();
      } else {
        await scheduleDailyExpenseReminder(
          user.expenseReminderHour ?? 21,
          user.expenseReminderMinute ?? 0,
        );
      }
    };

    register().catch(() => undefined);

    // Sem addPushTokenListener: no Expo Go/iOS ele dispara em tempestade
    // (mais de 1.000 eventos por segundo), cada um virando escrita no
    // Firestore, até o sistema matar o app por CPU e memória.
    // O token é salvo no login e quando o app volta ao primeiro plano.
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || cancelled) return;
      saveExpoPushToken().catch(() => undefined);
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [
    user?.id,
    user?.expoPushToken,
    user?.expenseReminderEnabled,
    user?.expenseReminderHour,
    user?.expenseReminderMinute,
  ]);

  useEffect(() => {
    if (!user?.id || Platform.OS === "web") return;

    const syncPresence = (state: AppStateStatus) => {
      const presenceState = state === "active" ? "foreground" : "background";
      userService
        .updateChatPresence(user.id, {
          presenceState,
          activeChatId: presenceState === "foreground" ? getActiveChatId() : "",
        })
        .catch(() => undefined);
    };

    syncPresence(AppState.currentState);

    const subscription = AppState.addEventListener("change", (nextState) => {
      appStateRef.current = nextState;
      syncPresence(nextState);
    });

    return () => {
      subscription.remove();
      userService
        .updateChatPresence(user.id, {
          presenceState: "background",
          activeChatId: "",
        })
        .catch(() => undefined);
    };
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const handleResponse = (response: Notifications.NotificationResponse | null) => {
      const data = response?.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (!data) return;
      openChatFromData(navigate, data);
    };

    Notifications.getLastNotificationResponseAsync()
      .then(handleResponse)
      .catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => handleResponse(response),
    );

    return () => {
      subscription.remove();
    };
  }, [navigate]);

  return null;
};

export default PushBootstrap;
