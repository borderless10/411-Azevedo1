import { Platform, useWindowDimensions } from "react-native";

export const DESKTOP_WEB_MIN_WIDTH = 1024;

export function isDesktopWeb(width: number): boolean {
  return Platform.OS === "web" && width >= DESKTOP_WEB_MIN_WIDTH;
}

export function useDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return isDesktopWeb(width);
}
