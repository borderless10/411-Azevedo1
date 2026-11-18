/**
 * Componente Layout - Combina Header + Sidebar + Conteúdo
 */

import React, { useState, ReactNode } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Text,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useDesktopWeb } from "../../utils/desktopWeb";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import { useTheme } from "../../contexts/ThemeContext";
import { useUnreadChatCount } from "../../hooks/useUnreadChatCount";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import {
  getCoupleMemberLabel,
  isCoupleAccount,
} from "../../utils/coupleAccount";
import { premium } from "../../theme/visaoPremium";
import { perfMark } from "../../utils/perfMarks";

const HeaderPurpleLine = () => (
  <View style={styles.headerPurpleLine} pointerEvents="none">
    <Svg
      width="100%"
      height={10}
      viewBox="0 0 390 10"
      preserveAspectRatio="none"
    >
      <Defs>
        <LinearGradient id="layoutHeaderGlow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={premium.purple} stopOpacity="0.75" />
          <Stop offset="20%" stopColor={premium.purple} stopOpacity="0.98" />
          <Stop offset="50%" stopColor={premium.purple} stopOpacity="1" />
          <Stop offset="80%" stopColor={premium.magenta} stopOpacity="0.98" />
          <Stop offset="100%" stopColor={premium.magenta} stopOpacity="0.75" />
        </LinearGradient>
      </Defs>
      {/* Traço encostado na base: o scroll some exatamente nesta linha. */}
      <Path
        d="M0 8.2 C 55 4.2, 110 9.8, 170 6.8 S 280 4, 390 8.2"
        stroke="url(#layoutHeaderGlow)"
        strokeWidth={2.2}
        strokeLinecap="butt"
        fill="none"
      />
    </Svg>
  </View>
);

type SafeAreaEdge = "top" | "right" | "bottom" | "left";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  titleAccessory?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  showHeader?: boolean;
  showSidebar?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  desktopWidth?: number | "full";
  /** Chat com teclado: omitir `bottom` e deixar a barra cuidar do inset. */
  safeAreaEdges?: SafeAreaEdge[];
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  titleAccessory,
  showBackButton = false,
  onBack,
  showHeader = true,
  showSidebar = true,
  rightAction,
  style,
  contentStyle,
  desktopWidth = 1100,
  safeAreaEdges = ["top", "left", "right", "bottom"],
}) => {
  const desktop = useDesktopWeb();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const { colors } = useTheme();
  const { currentScreen } = useNavigation();
  const unreadChatCount = useUnreadChatCount();
  const { user, activeCoupleMember, clearActiveCoupleMember } = useAuth();
  const showCoupleBar =
    isCoupleAccount(user) &&
    (activeCoupleMember === 1 || activeCoupleMember === 2);
  // Na Home a linha roxa do Header substitui a borda cinza.
  const usePurpleHeaderLine = currentScreen === "Home" && !title;
  const purpleHeaderGap = 10;
  // Regra central e mutuamente exclusiva: tela interna com voltar nunca
  // mostra o acesso à sidebar, mesmo se a tela pedir os dois controles.
  // Sem voltar, a sidebar segue o pedido da tela (raiz ou fluxo sem sidebar).
  const effectiveShowSidebar = showSidebar && !showBackButton;

  if (desktop) {
    const limit = desktopWidth === "full" ? null : desktopWidth;
    return (
      <SafeAreaView
        edges={safeAreaEdges}
        style={[styles.container, { backgroundColor: colors.background }, style]}
      >
        <View style={styles.desktopRow}>
          {effectiveShowSidebar ? (
            <Sidebar visible docked onClose={() => undefined} />
          ) : null}
          <View style={styles.desktopMain}>
            {showHeader && (
              <View
                style={[
                  styles.headerBlock,
                  {
                    backgroundColor: colors.background,
                    borderBottomColor: colors.border,
                    borderBottomWidth: usePurpleHeaderLine ? 0 : 1,
                  },
                  usePurpleHeaderLine
                    ? { paddingBottom: purpleHeaderGap }
                    : null,
                ]}
              >
                <View style={styles.headerWrapper}>
                  <Header
                    title={title}
                    titleAccessory={titleAccessory}
                    showBackButton={showBackButton}
                    onBack={onBack}
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
                {usePurpleHeaderLine ? <HeaderPurpleLine /> : null}
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
      edges={safeAreaEdges}
      style={[styles.container, { backgroundColor: colors.background }, style]}
    >
      <View style={{ flex: 1 }}>
        {showHeader && (
          <View
            style={[
              styles.headerBlock,
              {
                backgroundColor: colors.background,
                borderBottomColor: colors.border,
                borderBottomWidth: usePurpleHeaderLine ? 0 : 1,
              },
              usePurpleHeaderLine ? { paddingBottom: purpleHeaderGap } : null,
            ]}
          >
            <View style={styles.headerWrapper}>
              {effectiveShowSidebar && (
                <TouchableOpacity
                  onPress={() => {
                    perfMark("sidebar.open.press");
                    perfMark("interaction.tap");
                    setSidebarVisible(true);
                  }}
                  style={styles.menuButton}
                  activeOpacity={0.7}
                  delayPressIn={0}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="menu" size={24} color={colors.text} />
                  {unreadChatCount > 0 ? (
                    <View style={styles.menuBadge} pointerEvents="none">
                      <Text style={styles.menuBadgeText}>
                        {unreadChatCount > 9 ? "9+" : unreadChatCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}
              <Header
                title={title}
                titleAccessory={titleAccessory}
                showBackButton={showBackButton}
                onBack={onBack}
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
            {usePurpleHeaderLine ? <HeaderPurpleLine /> : null}
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

        {effectiveShowSidebar ? (
          <Sidebar
            visible={sidebarVisible}
            onClose={() => setSidebarVisible(false)}
          />
        ) : null}
      </View>
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
    position: "relative",
    overflow: "visible",
  },
  headerPurpleLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 10,
    zIndex: 5,
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
    backgroundColor: "#21172D",
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
    backgroundColor: "#FF008A",
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
