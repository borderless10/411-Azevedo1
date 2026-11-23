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
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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
  /** Conteúdo à esquerda do título (ex.: avatar da conversa). */
  titleAccessory?: React.ReactNode;
  showBackButton?: boolean;
  /** Se definido, substitui a navegação padrão do botão voltar. */
  onBack?: () => void;
  showProfile?: boolean;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  titleAccessory,
  showBackButton = false,
  onBack,
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
    if (onBack) {
      onBack();
      return;
    }

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
      currentScreen === "ClientFollowUpPanel" ||
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
          currentScreen === "ClientFollowUpPanel" ||
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

        {titleAccessory ? (
          <View style={styles.titleAccessory}>{titleAccessory}</View>
        ) : null}

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
                  onPhotoPress={handleProfile}
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 0,
    position: "relative",
    overflow: "visible",
    // Sem sombra: a linha roxa do Layout é a borda inferior da header.
    shadowOpacity: 0,
    elevation: 0,
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
  titleAccessory: {
    marginRight: 2,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
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
