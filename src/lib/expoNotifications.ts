import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type * as ExpoNotifications from "expo-notifications";

/**
 * Carregamento seguro do expo-notifications.
 *
 * No Expo Go (Android) o binário não inclui os módulos nativos de
 * notificação desde o SDK 53. O pacote faz requireNativeModule no
 * topo (TopicSubscriptionModule.android), então qualquer import
 * estático derruba o app na abertura com
 * "Cannot find native module 'ExpoTopicSubscriptionModule'".
 *
 * Aqui o pacote só é carregado fora do Expo Go e fora da web.
 * Todo uso deve ser protegido por canUseNativeNotifications.
 */
const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let loaded: typeof ExpoNotifications | null = null;
if (!isExpoGo && Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require("expo-notifications") as typeof ExpoNotifications;
  } catch {
    loaded = null;
  }
}

export const canUseNativeNotifications = loaded !== null;

// Tipado como módulo completo: em tempo de execução só é diferente de
// null quando canUseNativeNotifications é true (ver guarda nos usos).
export const Notifications = loaded as typeof ExpoNotifications;
