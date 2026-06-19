/**
 * Componente de Sidebar/Menu Lateral
 */

import React, { useEffect, useRef, useState } from "react";
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
import { planningServices } from "../../services/planningServices";
import { useUserChats } from "../../hooks/useUserChats";
import { isChatUnreadForUser } from "../../utils/chatUtils";

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
  const { user, signOut, isAuthenticated } = useAuth();
  const { navigate, currentScreen, params } = useNavigation() as any;
  const { colors } = useTheme();
  const { chats } = useUserChats(user?.id || null, user?.role || null);
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isConsultor = user?.role === "consultor";
  const isAdminUser = user?.isAdmin === true || user?.role === "admin";
  const isCommonUser = !user?.isAdmin && user?.role !== "consultor";
  const shouldHideRankingItem =
    isCommonUser && user?.rankingPreference === "hidden";
  const [trackedExpenseTitles, setTrackedExpenseTitles] = useState<string[]>(
    [],
  );
  const [trackedIncomeTitles, setTrackedIncomeTitles] = useState<string[]>([]);
  const [trackedExpensesExpanded, setTrackedExpensesExpanded] = useState(false);

  const normalizeTitle = (value?: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");

  const hasUnreadChats = (chats || []).some((chat: any) =>
    isChatUnreadForUser(chat, user?.id),
  );

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

  useEffect(() => {
    let cancelled = false;

    const loadTrackedExpenses = async () => {
      if (!user?.id || !isCommonUser || !isAuthenticated) {
        setTrackedExpenseTitles([]);
        setTrackedIncomeTitles([]);
        return;
      }

      try {
        const planning = await planningServices.getPlanning(user.id);
        if (cancelled) return;
        const rawTitles = [
          ...(planning?.bills || [])
            .filter((bill) => bill.dailyTracking)
            .map((bill) => bill.name),
          ...(planning?.expectedExpenses || [])
            .filter((expense) => expense.dailyTracking)
            .map((expense) => expense.source),
        ]
          .map((title) => String(title || "").trim())
          .filter(Boolean);

        const byKey = new Map<string, string>();
        rawTitles.forEach((title) => {
          const key = normalizeTitle(title);
          if (!key || byKey.has(key)) return;
          byKey.set(key, title);
        });

        const uniqueTitles = Array.from(byKey.values()).sort((a, b) =>
          a.localeCompare(b, "pt-BR"),
        );
        setTrackedExpenseTitles(uniqueTitles);

        const rawIncomeTitles = (planning?.expectedIncomes || [])
          .filter((income) => income.dailyTracking)
          .map((income) => income.source)
          .map((title) => String(title || "").trim())
          .filter(Boolean);

        const byIncomeKey = new Map<string, string>();
        rawIncomeTitles.forEach((title) => {
          const key = normalizeTitle(title);
          if (!key || byIncomeKey.has(key)) return;
          byIncomeKey.set(key, title);
        });

        const uniqueIncomeTitles = Array.from(byIncomeKey.values()).sort(
          (a, b) => a.localeCompare(b, "pt-BR"),
        );
        setTrackedIncomeTitles(uniqueIncomeTitles);
      } catch (error) {
        if (cancelled) return;
        console.warn("Erro ao carregar gastos acompanhados", error);
        setTrackedExpenseTitles([]);
        setTrackedIncomeTitles([]);
      }
    };

    loadTrackedExpenses();
    return () => {
      cancelled = true;
    };
  }, [user?.id, isCommonUser, isAuthenticated]);

  const activeTrackedExpenseTitle = String(
    params?.trackedTitle || params?.categoryName || "",
  );
  const isTrackedExpenseScreenActive =
    currentScreen === "CategoryBudget" &&
    trackedExpenseTitles.some(
      (title) =>
        normalizeTitle(title) === normalizeTitle(activeTrackedExpenseTitle),
    );

  useEffect(() => {
    if (isTrackedExpenseScreenActive) {
      setTrackedExpensesExpanded(true);
    }
  }, [isTrackedExpenseScreenActive]);

  const menuItems: MenuItem[] = isConsultor
    ? [
        { id: "Home", label: "Início", icon: "home", color: "#8c52ff" },
        {
          id: "Feed",
          label: "Linha do Tempo",
          icon: "newspaper",
          color: "#8c52ff",
        },
        { id: "Chat", label: "Chats", icon: "chatbubbles", color: "#a47aff" },
        { id: "Ranking", label: "Ranking", icon: "trophy", color: "#c084fc" },
      ]
    : isAdminUser
      ? [
          {
            id: "AdminUsers",
            label: "Gerenciar Usuários",
            icon: "people",
            color: "#8c52ff",
          },
          {
            id: "Feed",
            label: "Linha do Tempo",
            icon: "newspaper",
            color: "#8c52ff",
          },
          {
            id: "Chat",
            label: "Chats",
            icon: "chatbubbles",
            color: "#a47aff",
          },
          {
            id: "Ranking",
            label: "Ranking",
            icon: "trophy",
            color: "#c084fc",
          },
        ]
      : [
          { id: "Home", label: "Início", icon: "home", color: "#8c52ff" },
          {
            id: "Budget",
            label: "Consumo Moderado",
            icon: "wallet",
            color: "#a47aff",
          },
          {
            id: "Bills",
            label: "Contas a Pagar",
            icon: "receipt",
            color: "#ff4d6d",
          },
          {
            id: "IncomeList",
            label: "Minhas Rendas",
            icon: "cash",
            color: "#8c52ff",
          },
          { id: "Cartoes", label: "Cartões", icon: "card", color: "#8c52ff" },
          {
            id: "Feed",
            label: "Linha do Tempo",
            icon: "newspaper",
            color: "#8c52ff",
          },
          { id: "Chat", label: "Chats", icon: "chatbubbles", color: "#a47aff" },
          { id: "Ranking", label: "Ranking", icon: "trophy", color: "#c084fc" },
          {
            id: "Recomendacao",
            label: "Recomendação",
            icon: "bulb",
            color: "#a47aff",
          },
        ];

  // Rota de Planejamento — visível para usuários não consultores
  if (!isConsultor && !isAdminUser) {
    menuItems.push({
      id: "PlanningView",
      label: "Planejamento",
      icon: "document-text",
      color: "#a47aff",
    });
  }

  // Itens para usuários comuns: wishlist para todos; metas/investimentos visíveis
  if (isCommonUser) {
    menuItems.push({
      id: "Metas",
      label: "Metas",
      icon: "flag",
      color: "#8c52ff",
    });
    menuItems.push({
      id: "Wishlist",
      label: "Lista de Desejos",
      icon: "heart",
      color: "#ff4d6d",
    });
    menuItems.push({
      id: "Investments",
      label: "Investimentos",
      icon: "trending-up",
      color: "#8c52ff",
    });
  }

  // Itens finais
  menuItems.push({
    id: "Profile",
    label: "Perfil",
    icon: "person",
    color: "#8c52ff",
  });
  menuItems.push({
    id: "Settings",
    label: "Configurações",
    icon: "settings",
    color: "#a89fc0",
  });

  const handleNavigate = (screen: ScreenName) => {
    // If user is a consultor or admin and trying to go to Home, redirect to respective home
    if (screen === "Home") {
      if (user?.role === "consultor") {
        navigate("ConsultorHome");
        onClose();
        return;
      }
      if (user?.isAdmin === true || user?.role === "admin") {
        navigate("AdminUsers");
        onClose();
        return;
      }
    }
    navigate(screen);
    onClose();
  };

  const handleNavigateWithParams = (
    screen: ScreenName,
    navigationParams?: any,
  ) => {
    navigate(screen, navigationParams);
    onClose();
  };

  const handleLogout = () => {
    signOut();
    navigate("Login");
    onClose();
  };

  const homeMenuItem = menuItems.find((item) => item.id === "Home");
  const menuItemsWithoutHome = menuItems.filter((item) => item.id !== "Home");
  const showTrackedExpensesAsSecond =
    isCommonUser && trackedExpenseTitles.length > 0 && !!homeMenuItem;

  const renderMenuItem = (item: MenuItem) => {
    if (item.id === "Ranking" && shouldHideRankingItem) {
      return null;
    }

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
              isActive ? item.color || "#8c52ff" : colors.textSecondary
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
          {item.id === "Chat" && hasUnreadChats ? (
            <View style={styles.unreadDot} />
          ) : null}
        </View>
        {isActive && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={item.color || "#8c52ff"}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderTrackedExpensesSection = () => {
    const sectionActive =
      trackedExpensesExpanded || isTrackedExpenseScreenActive;

    return (
      <View>
        <TouchableOpacity
          style={[
            styles.menuItem,
            { borderBottomColor: colors.border },
            sectionActive && !trackedExpensesExpanded && [
              styles.menuItemActive,
              { backgroundColor: colors.background },
            ],
          ]}
          onPress={() => setTrackedExpensesExpanded((previous) => !previous)}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons
              name="analytics"
              size={24}
              color={sectionActive ? "#8c52ff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.menuItemText,
                { color: colors.textSecondary },
                sectionActive && styles.menuItemTextActive,
                sectionActive && { color: "#8c52ff" },
              ]}
            >
              Gastos acompanhados
            </Text>
          </View>
          <Ionicons
            name={trackedExpensesExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={sectionActive ? "#8c52ff" : colors.textSecondary}
          />
        </TouchableOpacity>

        {trackedExpensesExpanded
          ? trackedExpenseTitles.map((title) => {
              const isActive =
                currentScreen === "CategoryBudget" &&
                normalizeTitle(activeTrackedExpenseTitle) ===
                  normalizeTitle(title);

              return (
                <TouchableOpacity
                  key={title}
                  style={[
                    styles.trackedExpenseSubItem,
                    { borderBottomColor: colors.border },
                    isActive && [
                      styles.menuItemActive,
                      { backgroundColor: colors.background },
                    ],
                  ]}
                  onPress={() =>
                    handleNavigateWithParams("CategoryBudget", {
                      trackedTitle: title,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.trackedExpenseSubItemText,
                      { color: colors.textSecondary },
                      isActive && styles.menuItemTextActive,
                      isActive && { color: "#8c52ff" },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {isActive ? (
                    <Ionicons name="chevron-forward" size={20} color="#8c52ff" />
                  ) : null}
                </TouchableOpacity>
              );
            })
          : null}
      </View>
    );
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

        {/* Menu Items */}
        <ScrollView
          style={styles.menu}
          contentContainerStyle={styles.menuContent}
        >
          {showTrackedExpensesAsSecond ? (
            <>
              {homeMenuItem ? renderMenuItem(homeMenuItem) : null}
              {renderTrackedExpensesSection()}
              {menuItemsWithoutHome.map((item) => renderMenuItem(item))}
            </>
          ) : (
            menuItems.map((item) => renderMenuItem(item))
          )}

          {isCommonUser && trackedIncomeTitles.length > 0 ? (
            <View
              style={[
                styles.categorySection,
                { borderTopColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.categorySectionTitle,
                  { color: colors.textSecondary },
                ]}
              >
                Rendas acompanhadas
              </Text>
              {trackedIncomeTitles.map((title) => {
                const activeIncomeTitle = String(params?.trackedTitle || "");
                const isActive =
                  currentScreen === "TrackedIncome" &&
                  normalizeTitle(activeIncomeTitle) === normalizeTitle(title);

                return (
                  <TouchableOpacity
                    key={`tracked-income-${title}`}
                    style={[
                      styles.menuItem,
                      { borderBottomColor: colors.border },
                      isActive && [
                        styles.menuItemActive,
                        { backgroundColor: colors.background },
                      ],
                    ]}
                    onPress={() =>
                      handleNavigateWithParams("TrackedIncome", {
                        trackedTitle: title,
                      })
                    }
                  >
                    <View style={styles.menuItemLeft}>
                      <Ionicons
                        name="cash-outline"
                        size={24}
                        color={isActive ? "#8c52ff" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: colors.textSecondary },
                          isActive && styles.menuItemTextActive,
                          isActive && { color: "#8c52ff" },
                        ]}
                      >
                        {title}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#8c52ff"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              { backgroundColor: colors.background, borderColor: "#ff4d6d" },
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#ff4d6d" />
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
  logo: {
    width: 240,
    height: 100,
    alignSelf: "center",
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
  trackedExpenseSubItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 56,
    paddingRight: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  trackedExpenseSubItemText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
    paddingRight: 8,
  },
  categorySection: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8,
  },
  categorySectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    borderLeftColor: "#8c52ff",
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#8c52ff",
    marginLeft: 10,
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
    color: "#ff4d6d",
  },
});

export default Sidebar;
