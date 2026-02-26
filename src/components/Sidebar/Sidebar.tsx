/**
 * Componente de Sidebar/Menu Lateral
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation, ScreenName } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  style?: ViewStyle;
}

interface MenuItem {
  id: ScreenName;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  style,
}) => {
  const { user, signOut } = useAuth();
  const { navigate, currentScreen } = useNavigation();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);
  const menuItems: MenuItem[] = [
    { id: "Home", label: "Início", icon: "home", color: "#007AFF" },
    {
      id: "Budget",
      label: "Consumo Moderado",
      icon: "wallet",
      color: "#00BCD4",
    },
    { id: "Bills", label: "Contas a Pagar", icon: "receipt", color: "#E91E63" },
    { id: "Feed", label: "Feed", icon: "newspaper", color: "#007AFF" },
    { id: "Chat", label: "Chat", icon: "chatbubbles", color: "#9C27B0" },
    { id: "Metas", label: "Metas", icon: "flag", color: "#F44336" },
    {
      id: "Recomendacao",
      label: "Recomendação",
      icon: "bulb",
      color: "#FF9800",
    },
  ];

  // Rota de Planejamento — visível para todos os usuários (visualização)
  menuItems.push({
    id: "PlanningView",
    label: "Planejamento",
    icon: "document-text",
    color: "#00BCD4",
  });

  // Adicionar rota de gerenciamento para consultores/admins
  if (user?.role === "consultor" || user?.isAdmin) {
    menuItems.push({
      id: "ClientList",
      label: "Planejamento (Clientes)",
      icon: "clipboard",
      color: "#8BC34A",
    });
  }

  // Itens finais
  menuItems.push({
    id: "Profile",
    label: "Perfil",
    icon: "person",
    color: "#9C27B0",
  });
  menuItems.push({
    id: "Settings",
    label: "Configurações",
    icon: "settings",
    color: "#607D8B",
  });

  const handleNavigate = (screen: ScreenName) => {
    // If user is a consultor and trying to go to Home, redirect to ConsultorHome
    if (screen === "Home" && (user?.role === "consultor" || user?.isAdmin)) {
      navigate("ConsultorHome");
    } else {
      navigate(screen);
    }
    onClose();
  };

  const handleLogout = () => {
    signOut();
    navigate("Login");
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            transform: [{ translateX: slideAnim }],
          },
          style,
        ]}
        onStartShouldSetResponder={() => true}
      >
        {/* Botão de Fechar no canto superior esquerdo */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>

        {/* Logo */}
        <View
          style={[styles.logoContainer, { borderBottomColor: colors.border }]}
        >
          <Image
            source={require("../../../assets/logo411.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Header do Sidebar */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <View style={styles.userInfo}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: colors.text }]}>
                {(user?.name?.[0] || user?.email?.[0] || "U").toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text
                style={[styles.userName, { color: colors.text }]}
                numberOfLines={1}
              >
                {user?.name || "Usuário"}
              </Text>
              <Text
                style={[styles.userEmail, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {user?.email || ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <ScrollView
          style={styles.menu}
          contentContainerStyle={styles.menuContent}
        >
          {menuItems.map((item) => {
            const isActive = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  { borderBottomColor: colors.border },
                  isActive && [
                    styles.menuItemActive,
                    { backgroundColor: colors.background },
                  ],
                ]}
                onPress={() => handleNavigate(item.id)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={
                      isActive ? item.color || "#007AFF" : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: colors.textSecondary },
                      isActive && styles.menuItemTextActive,
                      item.color && isActive && { color: item.color },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {isActive && (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={item.color || "#007AFF"}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: colors.background, borderColor: "#F44336" },
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
            <Text style={styles.logoutText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
  },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
    paddingTop: 0,
  },
  logoContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  header: {
    flexDirection: "column",
    alignItems: "flex-start",
    padding: 20,
    paddingTop: 20,
    borderBottomWidth: 1,
  },
  logo: {
    width: 200,
    height: 80,
    alignSelf: "center",
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 1002,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  menu: {
    flex: 1,
  },
  menuContent: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemActive: {
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemTextActive: {
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
});

export default Sidebar;
