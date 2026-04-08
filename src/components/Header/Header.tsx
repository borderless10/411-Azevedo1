/**
 * Componente de Header/Cabeçalho
 */

import React, { useEffect, useRef } from "react";
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
import { useShowValues } from "../../contexts/ShowValuesContext";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";

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
  const { navigate, currentScreen, params } = useNavigation();
  const { colors } = useTheme();
  const { showValues, toggleShowValues } = useShowValues();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

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
    if (params?.returnTo) {
      navigate(params.returnTo);
      return;
    }

    // If coming from client-specific subscreens, return to ClientDetail with the same params
    if (
      currentScreen === "ClientInvestments" ||
      currentScreen === "ClientInvestmentsView" ||
      currentScreen === "ClientPlanning" ||
      currentScreen === "Wishlist" ||
      (currentScreen === "Metas" && params && params.clientId)
    ) {
      navigate("ClientDetail", params);
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

        {!title ? (
          // keep left area for back button but render logo centered absolutely below
          <></>
        ) : (
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        )}
      </View>

      {/* Centered logo when there's no title */}
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
        {rightAction || (
          <>
            {currentScreen === "Home" && (
              <TouchableOpacity
                onPress={toggleShowValues}
                style={{ padding: 6 }}
              >
                <Ionicons
                  name={showValues ? "eye" : "eye-off"}
                  size={22}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}

            {showProfile && (
              <TouchableOpacity
                onPress={handleProfile}
                style={styles.profileButton}
              >
                <View style={styles.profileWrapper}>
                  {user?.photoBase64 ? (
                    <Image
                      source={{
                        uri: `data:image/png;base64,${user.photoBase64}`,
                      }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarText, { color: colors.text }]}>
                        {(
                          user?.name?.[0] ||
                          user?.email?.[0] ||
                          "U"
                        ).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {user?.role === "cliente_premium" && (
                    <View style={styles.crownContainer} pointerEvents="none">
                      <MaterialCommunityIcons
                        name="crown"
                        size={14}
                        color="#8c52ff"
                      />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
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
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  logo: {
    width: 180,
    height: 72,
    marginRight: 0,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  titleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  eyeButton: {
    padding: 6,
    marginLeft: 8,
  },
  centerLogo: {
    position: "absolute",
    left: -50,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
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
