/**
 * Componente Layout - Combina Header + Sidebar + Conteúdo
 */

import React, { useState, ReactNode, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Animated,
  Text,
} from "react-native";
import { useDesktopWeb } from "../../utils/desktopWeb";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnreadChatCount } from "../../hooks/useUnreadChatCount";
import { useAuth } from "../../hooks/useAuth";
import {
  getCoupleMemberLabel,
  isCoupleAccount,
} from "../../utils/coupleAccount";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  showHeader?: boolean;
  showSidebar?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  desktopWidth?: number | "full";
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  showBackButton = false,
  showHeader = true,
  showSidebar = true,
  rightAction,
  style,
  contentStyle,
  desktopWidth = 1100,
}) => {
  const desktop = useDesktopWeb();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();
  const unreadChatCount = useUnreadChatCount();
  const { user, activeCoupleMember, clearActiveCoupleMember } = useAuth();
  const showCoupleBar =
    isCoupleAccount(user) &&
    (activeCoupleMember === 1 || activeCoupleMember === 2);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  if (desktop) {
    const limit = desktopWidth === "full" ? null : desktopWidth;
    return (
      <SafeAreaView
        edges={["top", "left", "right", "bottom"]}
        style={[styles.container, { backgroundColor: colors.background }, style]}
      >
        <View style={styles.desktopRow}>
          <Sidebar visible docked onClose={() => undefined} />
          <View style={styles.desktopMain}>
            {showHeader && (
              <View
                style={[
                  styles.headerBlock,
                  { backgroundColor: colors.background, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.headerWrapper}>
                  <Header
                    title={title}
                    showBackButton={showBackButton}
                    showProfile={true}
                    rightAction={rightAction}
                    style={styles.header}
                  />
                </View>
                {showCoupleBar ? (
                  <TouchableOpacity
                    style={styles.coupleBar}
                    onPress={() => {
                      void clearActiveCoupleMember();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="heart" size={13} color="#ff6b8a" />
                    <Text style={styles.coupleBarName} numberOfLines={1}>
                      {getCoupleMemberLabel(user, activeCoupleMember as 1 | 2)}
                    </Text>
                    <View style={styles.coupleBarDivider} />
                    <Text style={styles.coupleBarAction}>Trocar integrante</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
            <View
              style={[
                styles.content,
                { backgroundColor: colors.background },
                contentStyle,
                limit ? styles.desktopContentCenter : null,
              ]}
            >
              <View style={limit ? { flex: 1, width: "100%", maxWidth: limit } : styles.desktopFill}>
                {children}
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.container, { backgroundColor: colors.background }, style]}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {showHeader && (
          <View
            style={[
              styles.headerBlock,
              { backgroundColor: colors.background, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.headerWrapper}>
              {showSidebar && (
                <TouchableOpacity
                  onPress={() => setSidebarVisible(true)}
                  style={styles.menuButton}
                >
                  <Ionicons name="menu" size={24} color={colors.text} />
                  {unreadChatCount > 0 ? (
                    <View style={styles.menuBadge}>
                      <Text style={styles.menuBadgeText}>
                        {unreadChatCount > 9 ? "9+" : unreadChatCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}
              <Header
                title={title}
                showBackButton={showBackButton}
                showProfile={true}
                rightAction={rightAction}
                style={styles.header}
              />
            </View>
            {showCoupleBar ? (
              <TouchableOpacity
                style={styles.coupleBar}
                onPress={() => {
                  void clearActiveCoupleMember();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="heart" size={13} color="#ff6b8a" />
                <Text style={styles.coupleBarName} numberOfLines={1}>
                  {getCoupleMemberLabel(user, activeCoupleMember as 1 | 2)}
                </Text>
                <View style={styles.coupleBarDivider} />
                <Text style={styles.coupleBarAction}>Trocar integrante</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        <View
          style={[
            styles.content,
            { backgroundColor: colors.background },
            contentStyle,
          ]}
        >
          {children}
        </View>

        {showSidebar && (
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
          />
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  desktopRow: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  desktopMain: {
    flex: 1,
    minWidth: 0,
  },
  desktopFill: {
    flex: 1,
  },
  desktopContentCenter: {
    alignItems: "center",
  },
  headerBlock: {
    borderBottomWidth: 1,
  },
  headerWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  coupleBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  coupleBarName: {
    color: "#ffb1c1",
    fontSize: 13,
    fontWeight: "700",
    maxWidth: 160,
  },
  coupleBarDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#3a3a3a",
  },
  coupleBarAction: {
    color: "#c084fc",
    fontSize: 13,
    fontWeight: "600",
  },
  menuButton: {
    padding: 12,
    paddingRight: 4,
    zIndex: 10,
  },
  menuBadge: {
    position: "absolute",
    top: 6,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ff4d6d",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  menuBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  header: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default Layout;
