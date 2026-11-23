/**
 * Shell desktop: sidebar fixa + header + scroll full-bleed à direita da janela.
 * Não centra um tubo estreito rolável (causa da scrollbar no meio).
 */
import React, { ReactNode } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Platform,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Sidebar } from "../Sidebar/Sidebar";
import { Header } from "../Header/Header";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import {
  getCoupleMemberLabel,
  isCoupleAccount,
} from "../../utils/coupleAccount";
import { desktop } from "../../theme/desktopTokens";
import { premium } from "../../theme/visaoPremium";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

const HeaderPurpleLine = () => (
  <View style={styles.headerPurpleLine} pointerEvents="none">
    <Svg width="100%" height={8} viewBox="0 0 390 8" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="desktopHeaderGlow" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={premium.purple} stopOpacity="0.7" />
          <Stop offset="50%" stopColor={premium.purple} stopOpacity="1" />
          <Stop offset="100%" stopColor={premium.magenta} stopOpacity="0.75" />
        </LinearGradient>
      </Defs>
      <Path
        d="M0 6 C 80 3, 160 7, 240 4 S 340 3, 390 6"
        stroke="url(#desktopHeaderGlow)"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  </View>
);

type Props = {
  children: ReactNode;
  title?: string;
  titleAccessory?: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  showHeader?: boolean;
  showSidebar?: boolean;
  rightAction?: ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Quando true, o filho controla o scroll (ex.: Chat split). */
  disablePageScroll?: boolean;
  showPurpleHeaderLine?: boolean;
};

export const DesktopShell: React.FC<Props> = ({
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
  disablePageScroll = false,
  showPurpleHeaderLine = false,
}) => {
  const { colors } = useTheme();
  const { user, activeCoupleMember, clearActiveCoupleMember } = useAuth();
  const showCoupleBar =
    isCoupleAccount(user) &&
    (activeCoupleMember === 1 || activeCoupleMember === 2);
  // PC: sidebar docked quando a tela pede menu. Se a tela for interna
  // (showBackButton), mostra a seta para voltar no histórico (ex.: painel
  // do consultor → registros).
  const effectiveShowSidebar = showSidebar;
  const effectiveShowBack = showBackButton;

  const mainBody = disablePageScroll ? (
    <View style={[styles.pageFill, contentStyle]}>{children}</View>
  ) : (
    <ScrollView
      style={styles.pageScroll}
      contentContainerStyle={[styles.pageScrollContent, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
      {...(Platform.OS === "web"
        ? ({ dataSet: { desktopScroll: "1" } } as object)
        : {})}
    >
      {children}
    </ScrollView>
  );

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={[styles.root, { backgroundColor: desktop.bg }, style]}
    >
      <View style={styles.row}>
        {effectiveShowSidebar ? (
          <Sidebar visible docked onClose={() => undefined} />
        ) : null}
        <View style={styles.main}>
          {showHeader ? (
            <View
              style={[
                styles.headerBlock,
                {
                  backgroundColor: colors.background,
                  borderBottomColor: colors.border,
                  borderBottomWidth: showPurpleHeaderLine ? 0 : 1,
                },
              ]}
            >
              <Header
                title={title}
                titleAccessory={titleAccessory}
                showBackButton={effectiveShowBack}
                onBack={onBack}
                showProfile
                rightAction={rightAction}
                style={styles.header}
              />
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
              {showPurpleHeaderLine ? <HeaderPurpleLine /> : null}
            </View>
          ) : null}
          {mainBody}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
  },
  main: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
  headerBlock: {
    position: "relative",
    zIndex: 2,
  },
  header: {},
  headerPurpleLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 8,
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
    fontWeight: "600",
    maxWidth: 180,
  },
  coupleBarDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  coupleBarAction: {
    color: desktop.textSecondary,
    fontSize: 12,
  },
  /** Scroll ocupa toda a largura restante — barra na borda direita da janela. */
  pageScroll: {
    flex: 1,
    minHeight: 0,
    backgroundColor: desktop.bg,
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingHorizontal: desktop.pagePadX,
    paddingTop: desktop.pagePadY,
    paddingBottom: 40,
  },
  pageFill: {
    flex: 1,
    minHeight: 0,
    backgroundColor: desktop.bg,
    paddingHorizontal: desktop.pagePadX,
    paddingTop: desktop.pagePadY,
  },
});

export default DesktopShell;
