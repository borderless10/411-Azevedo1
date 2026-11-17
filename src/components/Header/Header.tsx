/**
 * Componente de Header/Cabeçalho
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Image,
  Animated,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { premium } from "../../theme/visaoPremium";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  profileDisplayName,
  resolveProfilePhotoUri,
} from "../../utils/chatDisplayNames";
import { BadgedAvatar } from "../Gamification/BadgedAvatar";
import { rankingGamificationService } from "../../services/rankingGamificationService";
import type { BadgeDefinition } from "../../types/rankingGamification";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showProfile?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  showProfile = true,
  rightAction,
  style,
}) => {
  const { user } = useAuth();
  const { navigate, currentScreen, params, goBack, canGoBack } =
    useNavigation();
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(
    [],
  );

  // Catálogo de insígnias para o selo da própria foto no topo. Um listener
  // pequeno, com limpeza ao desmontar, igual ao das outras telas.
  useEffect(
    () =>
      rankingGamificationService.subscribeBadgeDefinitions(
        setBadgeDefinitions,
        () => {},
      ),
    [],
  );

  const ownBadgeDefinition = user?.activeBadgeBorderId
    ? badgeDefinitions.find(
        (definition) => definition.id === user.activeBadgeBorderId,
      ) || null
    : null;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleBack = () => {
    // Histórico real primeiro: volta à tela anterior com os params dela.
    if (canGoBack) {
      goBack();
      return;
    }

    // Sem histórico (entrada direta, notificação ou estado recriado),
    // valem os destinos explícitos abaixo e, por fim, a Home.
    if (params?.returnTo) {
      navigate(
        params.returnTo,
        params.returnToParams ??
          params.returnParams ??
          (params.clientId ? { clientId: params.clientId } : undefined),
      );
      return;
    }

    // If coming from client-specific subscreens, return to ClientDetail with the same params
    if (
      currentScreen === "ClientInvestments" ||
      currentScreen === "ClientInvestmentsView" ||
      currentScreen === "ClientPlanning" ||
      currentScreen === "Wishlist" ||
      (currentScreen === "Metas" && params && params.clientId) ||
      (params?.clientId &&
        (currentScreen === "Budget" ||
          currentScreen === "CategoryBudget" ||
          currentScreen === "TrackedIncome" ||
          currentScreen === "IncomeList" ||
          currentScreen === "Bills" ||
          currentScreen === "ClientExpenseRecords" ||
          currentScreen === "ClientIncomeRecords" ||
          currentScreen === "Cartoes" ||
          currentScreen === "Recomendacao"))
    ) {
      navigate("ClientDetail", { clientId: params?.clientId });
      return;
    }

    // fallback behavior for other screens
    navigate("Home");
  };

  const handleProfile = () => {
    navigate("Profile");
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.left}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}

        {title ? (
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>

      {!title && (
        <View style={styles.centerLogo} pointerEvents="none">
          <Image
            source={require("../../../assets/logo411.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      )}

      <View style={styles.right}>
        {rightAction ||
          (showProfile ? (
            <TouchableOpacity
              onPress={handleProfile}
              style={styles.profileButton}
            >
              <View style={styles.profileWrapper}>
                <BadgedAvatar
                  photoUri={resolveProfilePhotoUri(user)}
                  displayName={profileDisplayName(
                    user,
                    user?.email || "Usuário",
                  )}
                  size={34}
                  ringDefinition={ownBadgeDefinition}
                  badgeDefinition={ownBadgeDefinition}
                />

                {user?.role === "cliente_premium" && (
                  <View style={styles.crownContainer} pointerEvents="none">
                    <MaterialCommunityIcons
                      name="crown"
                      size={14}
                      color="#B900FF"
                    />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ) : null)}
      </View>
      {currentScreen === "Home" && !title ? (
        <View style={styles.glowLine} pointerEvents="none">
          <Svg width="100%" height={10} viewBox="0 0 390 10" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="headerGlow" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor={premium.purple} stopOpacity="0.05" />
                <Stop offset="50%" stopColor={premium.purple} stopOpacity="0.95" />
                <Stop offset="100%" stopColor={premium.magenta} stopOpacity="0.15" />
              </LinearGradient>
            </Defs>
            <Path
              d="M0 6 C 60 1, 120 10, 180 5 S 300 0, 390 6"
              stroke="url(#headerGlow)"
              strokeWidth={2.2}
              fill="none"
            />
          </Svg>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  glowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    height: 10,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 0,
    position: "relative",
    overflow: "visible",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 180,
    height: 72,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 2,
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 3,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  centerLogo: {
    position: "absolute",
    left: -48,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  profileWrapper: {
    position: "relative",
  },
  crownContainer: {
    position: "absolute",
    top: -14,
    left: "50%",
    marginLeft: -7,
    backgroundColor: "transparent",
    borderRadius: 8,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Header;
