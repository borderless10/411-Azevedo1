import { Platform } from "react-native";

/** Único UID autorizado no menu de dev (Expo web). */
export const DEV_TOOLS_USER_ID = "0jnooNRpZhMAeuE9z2e6YbQ2ErK2";

export const isExpoWebDevToolsEnabled = (userId?: string | null): boolean =>
  Platform.OS === "web" && !!userId && userId === DEV_TOOLS_USER_ID;
