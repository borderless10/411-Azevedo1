/**
 * Componente de Sidebar/Menu Lateral
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Image,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation, ScreenName } from "../../routes/NavigationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { planningServices } from "../../services/planningServices";
import { useGlobalChat, useUserChats } from "../../hooks/useUserChats";
import { isChatUnreadForUser } from "../../utils/chatUtils";
import { useConsultationScheduling } from "../../hooks/useConsultationScheduling";
import { isAppClientUser } from "../../services/userServices";
import { perfMeasure } from "../../utils/perfMarks";
import { rankingServices } from "../../services/rankingServices";
import {
  rankingPositionFontSize,
  rankingPositionLabel,
} from "../../utils/rankingPosition";
import { desktop } from "../../theme/desktopTokens";
import {
  getDesktopSidebarRailPinned,
  setDesktopSidebarRailPinned,
} from "../../utils/desktopSidebarRail";

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  style?: ViewStyle;
  docked?: boolean;
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
  docked = false,
}) => {
  const { user, signOut, isAuthenticated } = useAuth();
  const { navigate, currentScreen, params } = useNavigation() as any;
  const { colors } = useTheme();
  const { chats } = useUserChats(user?.id || null, user?.role || null);
  const globalChat = useGlobalChat();
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isConsultor =
    user?.role === "consultor" || user?.role === "supervisor";
  const isAdminUser = user?.isAdmin === true || user?.role === "admin";
  const isCommonUser = isAppClientUser(user);
  const shouldHideRankingItem =
    isCommonUser && user?.rankingPreference === "hidden";
  const [trackedExpenseTitles, setTrackedExpenseTitles] = useState<string[]>(
    [],
  );
  const [trackedIncomeTitles, setTrackedIncomeTitles] = useState<string[]>([]);
  const [trackedExpensesExpanded, setTrackedExpensesExpanded] = useState(false);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);
  /** Desktop web: trilho de ícones que abre no hover. */
  const hoverRail = docked && Platform.OS === "web";
  const [railHover, setRailHover] = useState(() =>
    hoverRail ? getDesktopSidebarRailPinned() : false,
  );
  const railExpanded = !hoverRail || railHover;
  const iconsOnly = hoverRail && !railHover;

  const openDesktopRail = () => {
    if (!hoverRail) return;
    setDesktopSidebarRailPinned(true);
    setRailHover(true);
  };

  const closeDesktopRail = () => {
    if (!hoverRail) return;
    setDesktopSidebarRailPinned(false);
    setRailHover(false);
    setTrackedExpensesExpanded(false);
  };
  const webItemProps = (active?: boolean) =>
    Platform.OS === "web" && docked
      ? ({
          dataSet: {
            sidebarItem: "1",
            ...(active ? { sidebarActive: "1" } : {}),
          },
        } as object)
      : {};
  /** Mobile mantém divisor; desktop docked fica sem linha (hover/ativo via CSS). */
  const itemBorderStyle = docked
    ? { borderBottomWidth: 0, borderBottomColor: "transparent" as const }
    : { borderBottomColor: colors.border };
  const consultationPulseAnim = useRef(new Animated.Value(1)).current;
  const {
    preferredDayLabel,
    bookedDayLabel,
    hasBookedCurrentCycle,
    schedulingState,
    shouldPulse: shouldPulseConsultation,
  } = useConsultationScheduling();

  const normalizeTitle = (value?: string) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");

  const hasUnreadChats = [...(chats || []), ...(globalChat ? [globalChat] : [])].some(
    (chat) => isChatUnreadForUser(chat, user?.id),
  );

  useEffect(() => {
    if (docked) return;
    if (visible) {
      perfMeasure("sidebar.firstPaint", "sidebar.open.press");
      perfMeasure("interaction.handled", "interaction.tap");
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, docked, slideAnim, fadeAnim]);

  useEffect(
    () => () => {
      slideAnim.stopAnimation();
      fadeAnim.stopAnimation();
      consultationPulseAnim.stopAnimation();
    },
    [consultationPulseAnim, fadeAnim, slideAnim],
  );

  useEffect(() => {
    if (!shouldPulseConsultation) {
      consultationPulseAnim.setValue(1);
      return;
    }

    // Só anima opacity (native driver) para não travar o JS thread / toques.
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(consultationPulseAnim, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(consultationPulseAnim, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [consultationPulseAnim, shouldPulseConsultation]);

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

  // Posição própria no ranking: uma leitura pontual por usuário/sessão.
  // Erro ou ausência no ranking deixam o troféu sem número.
  useEffect(() => {
    setRankingPosition(null);
    if (!user?.id || !isAuthenticated || shouldHideRankingItem) return;
    let cancelled = false;
    rankingServices
      .getOwnRankingPosition(user.id)
      .then((position) => {
        if (!cancelled) setRankingPosition(position);
      })
      .catch(() => {
        if (!cancelled) setRankingPosition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, isAuthenticated, shouldHideRankingItem]);

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
        { id: "Home", label: "Início", icon: "home", color: "#B900FF" },
        {
          id: "Feed",
          label: "Linha do Tempo",
          icon: "newspaper",
          color: "#B900FF",
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
            color: "#B900FF",
          },
          {
            id: "BadgeManagement",
            label: "Insígnias",
            icon: "ribbon",
            color: "#e7b958",
          },
          {
            id: "Feed",
            label: "Linha do Tempo",
            icon: "newspaper",
            color: "#B900FF",
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
          { id: "Home", label: "Início", icon: "home", color: "#B900FF" },
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
            color: "#FF008A",
          },
          {
            id: "IncomeList",
            label: "Rendas Acompanhadas",
            icon: "cash",
            color: "#B900FF",
          },
          { id: "Cartoes", label: "Cartões", icon: "card", color: "#B900FF" },
          {
            id: "Feed",
            label: "Linha do Tempo",
            icon: "newspaper",
            color: "#B900FF",
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
      color: "#B900FF",
    });
    menuItems.push({
      id: "Wishlist",
      label: "Lista de Desejos",
      icon: "heart",
      color: "#FF008A",
    });
    menuItems.push({
      id: "Investments",
      label: "Investimentos",
      icon: "trending-up",
      color: "#B900FF",
    });
    menuItems.push({
      id: "UserNotes",
      label: "Notas",
      icon: "document-text",
      color: "#a47aff",
    });
    menuItems.push({
      id: "ShoppingList",
      label: "Lista de compras",
      icon: "cart",
      color: "#B900FF",
    });
    menuItems.push({
      id: "InstallmentPurchases",
      label: "Compra parcelada",
      icon: "card",
      color: "#B900FF",
    });
  }

  // Perfil fica na foto do header (canto superior direito).
  menuItems.push({
    id: "Settings",
    label: "Configurações",
    icon: "settings",
    color: "#a89fc0",
  });

  const finishSidebarNavigation = () => {
    // Mobile overlay fecha; desktop docked mantém aberta (pin do trilho).
    if (docked) {
      openDesktopRail();
      return;
    }
    onClose();
  };

  const handleNavigate = (screen: ScreenName) => {
    // If user is a consultor or admin and trying to go to Home, redirect to respective home
    if (screen === "Home") {
      if (user?.role === "consultor" || user?.role === "supervisor") {
        navigate("ConsultorHome");
        finishSidebarNavigation();
        return;
      }
      if (user?.isAdmin === true || user?.role === "admin") {
        navigate("AdminUsers");
        finishSidebarNavigation();
        return;
      }
    }
    navigate(screen);
    finishSidebarNavigation();
  };

  const handleNavigateWithParams = (
    screen: ScreenName,
    navigationParams?: any,
  ) => {
    navigate(screen, navigationParams);
    finishSidebarNavigation();
  };

  const handleLogout = () => {
    if (docked) {
      closeDesktopRail();
    } else {
      onClose();
    }
    setTimeout(() => {
      void signOut()
        .catch(() => undefined)
        .finally(() => navigate("Login"));
    }, 180);
  };

  const homeMenuItem = menuItems.find((item) => item.id === "Home");
  const chatMenuItem = isCommonUser
    ? menuItems.find((item) => item.id === "Chat")
    : undefined;
  const menuItemsWithoutHome = menuItems.filter(
    (item) => item.id !== "Home" && !(isCommonUser && item.id === "Chat"),
  );
  const showTrackedExpensesAsSecond =
    isCommonUser && trackedExpenseTitles.length > 0 && !!homeMenuItem;

  const renderConsultationItem = () => {
    if (!isCommonUser) return null;

    return (
      <TouchableOpacity
        key="consultation-scheduling"
        style={[
          styles.menuItem,
          docked && styles.menuItemDocked,
          iconsOnly && styles.menuItemIconsOnly,
          styles.consultationMenuItem,
          itemBorderStyle,
        ]}
        activeOpacity={0.7}
        delayPressIn={0}
        onPress={() => {
          handleNavigateWithParams("ConsultationScheduling");
        }}
        {...webItemProps()}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.consultationPulseBackground,
            {
              backgroundColor: "rgba(255, 77, 109, 0.28)",
              opacity: consultationPulseAnim,
            },
          ]}
        />
        <View
          style={[
            styles.menuItemLeft,
            docked && styles.menuItemLeftDocked,
            iconsOnly && styles.menuItemLeftIconsOnly,
          ]}
        >
          <Ionicons
            name="calendar"
            size={24}
            color={shouldPulseConsultation ? "#FF008A" : "#B900FF"}
          />
          {!iconsOnly ? (
            <View style={styles.consultationTextWrap}>
              <Text
                style={[
                  styles.menuItemText,
                  { color: colors.textSecondary },
                  shouldPulseConsultation && styles.consultationMenuTextPulse,
                  hasBookedCurrentCycle && styles.consultationMenuTextBooked,
                ]}
              >
                {hasBookedCurrentCycle
                  ? "Consultoria agendada"
                  : schedulingState === "awaitingConfirmation"
                    ? "Confirme sua consultoria"
                    : "Agende sua consultoria"}
              </Text>
              {hasBookedCurrentCycle && bookedDayLabel ? (
                <Text
                  style={[
                    styles.consultationDayHint,
                    styles.consultationDayHintBooked,
                  ]}
                  numberOfLines={2}
                >
                  Dia da consultoria: {bookedDayLabel}
                </Text>
              ) : schedulingState === "awaitingConfirmation" ? (
                <Text
                  style={[styles.consultationDayHint, { color: "#ff8fab" }]}
                  numberOfLines={2}
                >
                  Informe o dia que ficou agendado
                </Text>
              ) : preferredDayLabel ? (
                <Text
                  style={[
                    styles.consultationDayHint,
                    {
                      color: shouldPulseConsultation
                        ? "#ff8fab"
                        : colors.textSecondary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  Melhor dia: {preferredDayLabel}
                </Text>
              ) : null}
            </View>
          ) : null}
          {shouldPulseConsultation ? (
            <View
              style={[
                styles.consultationPulseDot,
                iconsOnly && styles.iconBadgeDot,
              ]}
            />
          ) : null}
        </View>
        {!iconsOnly ? (
          <Ionicons
            name="open-outline"
            size={20}
            color={
              shouldPulseConsultation
                ? "#FF008A"
                : hasBookedCurrentCycle
                  ? "#B900FF"
                  : colors.textSecondary
            }
          />
        ) : null}
      </TouchableOpacity>
    );
  };

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
          docked && styles.menuItemDocked,
          iconsOnly && styles.menuItemIconsOnly,
          itemBorderStyle,
          isActive && [
            styles.menuItemActive,
            { backgroundColor: colors.background },
          ],
        ]}
        activeOpacity={0.7}
        delayPressIn={0}
        onPress={() => handleNavigate(item.id)}
        accessibilityLabel={
          item.id === "Ranking" && rankingPositionLabel(rankingPosition)
            ? `Ranking, sua posição: ${rankingPosition}`
            : item.label
        }
        {...webItemProps(isActive)}
      >
        <View
          style={[
            styles.menuItemLeft,
            docked && styles.menuItemLeftDocked,
            iconsOnly && styles.menuItemLeftIconsOnly,
          ]}
        >
          {item.id === "Ranking" ? (
            <View style={styles.rankingIconWrap}>
              <Ionicons
                name={item.icon}
                size={24}
                color={
                  isActive ? item.color || "#B900FF" : colors.textSecondary
                }
              />
              {rankingPositionLabel(rankingPosition) ? (
                <View style={styles.rankingPositionOverlay} pointerEvents="none">
                  <Text
                    style={[
                      styles.rankingPositionText,
                      {
                        color: colors.card,
                        fontSize: rankingPositionFontSize(rankingPosition),
                      },
                    ]}
                  >
                    {rankingPositionLabel(rankingPosition)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Ionicons
              name={item.icon}
              size={24}
              color={
                isActive ? item.color || "#B900FF" : colors.textSecondary
              }
            />
          )}
          {!iconsOnly ? (
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
          ) : null}
          {item.id === "Chat" && hasUnreadChats ? (
            <View
              style={[styles.unreadDot, iconsOnly && styles.iconBadgeDot]}
            />
          ) : null}
        </View>
        {!iconsOnly && isActive ? (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={item.color || "#B900FF"}
          />
        ) : null}
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
            docked && styles.menuItemDocked,
            iconsOnly && styles.menuItemIconsOnly,
            itemBorderStyle,
            sectionActive && !trackedExpensesExpanded && [
              styles.menuItemActive,
              { backgroundColor: colors.background },
            ],
          ]}
          onPress={() => {
            if (iconsOnly) {
              openDesktopRail();
              setTrackedExpensesExpanded(true);
              return;
            }
            setTrackedExpensesExpanded((previous) => !previous);
          }}
          {...webItemProps(sectionActive)}
        >
          <View
            style={[
              styles.menuItemLeft,
              docked && styles.menuItemLeftDocked,
              iconsOnly && styles.menuItemLeftIconsOnly,
            ]}
          >
            <Ionicons
              name="analytics"
              size={24}
              color={sectionActive ? "#B900FF" : colors.textSecondary}
            />
            {!iconsOnly ? (
              <Text
                style={[
                  styles.menuItemText,
                  { color: colors.textSecondary },
                  sectionActive && styles.menuItemTextActive,
                  sectionActive && { color: "#B900FF" },
                ]}
              >
                Gastos acompanhados
              </Text>
            ) : null}
          </View>
          {!iconsOnly ? (
            <Ionicons
              name={trackedExpensesExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={sectionActive ? "#B900FF" : colors.textSecondary}
            />
          ) : null}
        </TouchableOpacity>

        {trackedExpensesExpanded && !iconsOnly
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
                    docked && styles.trackedExpenseSubItemDocked,
                    itemBorderStyle,
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
                  {...webItemProps(isActive)}
                >
                  <Text
                    style={[
                      styles.trackedExpenseSubItemText,
                      { color: colors.textSecondary },
                      isActive && styles.menuItemTextActive,
                      isActive && { color: "#B900FF" },
                    ]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {isActive ? (
                    <Ionicons name="chevron-forward" size={20} color="#B900FF" />
                  ) : null}
                </TouchableOpacity>
              );
            })
          : null}
      </View>
    );
  };

  const panel = (
    <>
        {!docked ? (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        ) : null}

        {/* Logo */}
        <View
          style={[
            styles.logoContainer,
            docked && styles.logoDocked,
            iconsOnly && styles.logoIconsOnly,
            !docked ? { borderBottomColor: colors.border } : null,
          ]}
        >
          <Image
            source={require("../../../assets/logo411.png")}
            style={[
              styles.logo,
              docked && styles.logoImageDocked,
              iconsOnly && styles.logoImageIconsOnly,
            ]}
            resizeMode="contain"
          />
        </View>

        {/* Menu Items */}
        <ScrollView
          style={[styles.menu, docked && styles.menuDocked]}
          contentContainerStyle={[
            styles.menuContent,
            docked && styles.menuContentDocked,
          ]}
          showsVerticalScrollIndicator={docked ? false : true}
        >
          {showTrackedExpensesAsSecond ? (
            <>
              {homeMenuItem ? renderMenuItem(homeMenuItem) : null}
              {renderConsultationItem()}
              {chatMenuItem ? renderMenuItem(chatMenuItem) : null}
              {renderTrackedExpensesSection()}
              {menuItemsWithoutHome.map((item) => renderMenuItem(item))}
            </>
          ) : (
            menuItems
              .filter((item) => !(isCommonUser && item.id === "Chat"))
              .map((item) => (
              <React.Fragment key={item.id}>
                {renderMenuItem(item)}
                {item.id === "Home" ? (
                  <>
                    {renderConsultationItem()}
                    {chatMenuItem ? renderMenuItem(chatMenuItem) : null}
                  </>
                ) : null}
              </React.Fragment>
            ))
          )}

          {isCommonUser && trackedIncomeTitles.length > 0 && !iconsOnly ? (
            <View
              style={[
                styles.categorySection,
                docked && styles.categorySectionDocked,
                !docked ? { borderTopColor: colors.border } : null,
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
                      docked && styles.menuItemDocked,
                      itemBorderStyle,
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
                    {...webItemProps(isActive)}
                  >
                    <View
                      style={[
                        styles.menuItemLeft,
                        docked && styles.menuItemLeftDocked,
                      ]}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={24}
                        color={isActive ? "#B900FF" : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.menuItemText,
                          { color: colors.textSecondary },
                          isActive && styles.menuItemTextActive,
                          isActive && { color: "#B900FF" },
                        ]}
                      >
                        {title}
                      </Text>
                    </View>
                    {isActive && (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#B900FF"
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
              iconsOnly && styles.logoutButtonIconsOnly,
              { backgroundColor: colors.background, borderColor: "#FF008A" },
            ]}
            onPress={handleLogout}
            accessibilityLabel="Sair"
            {...(Platform.OS === "web" && docked
              ? ({ dataSet: { sidebarLogout: "1" } } as object)
              : {})}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF008A" />
            {!iconsOnly ? <Text style={styles.logoutText}>Sair</Text> : null}
          </TouchableOpacity>
        </View>
    </>
  );

  if (docked) {
    const railWidth = desktop.sidebarRailWidth;
    const fullWidth = desktop.sidebarWidth;
    const webHoverProps = hoverRail
      ? ({
          onMouseEnter: () => openDesktopRail(),
          onMouseLeave: () => closeDesktopRail(),
        } as object)
      : {};

    return (
      <View
        style={[
          styles.dockedRoot,
          hoverRail ? { width: railWidth } : { width: fullWidth },
        ]}
        {...(Platform.OS === "web"
          ? ({ dataSet: { sidebarDocked: "1" } } as object)
          : {})}
      >
        <View
          style={[
            styles.dockedContainer,
            hoverRail && styles.dockedContainerRail,
            {
              backgroundColor: colors.card,
              borderRightColor: colors.border,
              width: railExpanded ? fullWidth : railWidth,
            },
            railExpanded && hoverRail ? styles.dockedContainerExpanded : null,
            style,
          ]}
          {...webHoverProps}
          {...(Platform.OS === "web"
            ? ({ dataSet: { sidebarDocked: "1" } } as object)
            : {})}
        >
          {panel}
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.overlay, { opacity: fadeAnim }]}
    >
      {/* Área escura à direita: toque fecha a sidebar */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar menu"
        onPress={onClose}
        style={styles.overlayDismiss}
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
      >
        {panel}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dockedRoot: {
    alignSelf: "stretch",
    zIndex: 30,
  },
  dockedContainer: {
    flex: 1,
    borderRightWidth: 1,
    ...(Platform.OS === "web"
      ? ({
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(185,0,255,0.35) transparent",
        } as object)
      : {}),
  },
  dockedContainerRail: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 30,
    ...(Platform.OS === "web"
      ? ({
          transitionProperty: "width, box-shadow",
          transitionDuration: "160ms",
          transitionTimingFunction: "ease-out",
        } as object)
      : {}),
  },
  dockedContainerExpanded: {
    zIndex: 50,
    ...(Platform.OS === "web"
      ? ({
          boxShadow: "8px 0 28px rgba(0,0,0,0.45)",
        } as object)
      : {
          shadowColor: "#000",
          shadowOffset: { width: 6, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  logoDocked: {
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 0,
  },
  logoImageDocked: {
    width: 150,
    height: 56,
  },
  logoIconsOnly: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
  },
  logoImageIconsOnly: {
    width: 44,
    height: 36,
  },
  menuItemIconsOnly: {
    paddingHorizontal: 0,
    justifyContent: "center",
  },
  menuItemLeftIconsOnly: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 0,
  },
  iconBadgeDot: {
    position: "absolute",
    top: -4,
    right: "18%",
    marginLeft: 0,
  },
  logoutButtonIconsOnly: {
    justifyContent: "center",
    paddingHorizontal: 0,
    minHeight: 44,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 1000,
  },
  overlayDismiss: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    zIndex: 1,
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
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  logo: {
    width: 220,
    height: 88,
    alignSelf: "center",
  },
  closeButton: {
    position: "absolute",
    top: 4,
    left: 4,
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
  menuDocked: {
    ...(Platform.OS === "web"
      ? ({
          // @ts-expect-error web-only scrollbar
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(185,0,255,0.3) transparent",
        } as object)
      : {}),
  },
  menuContent: {
    paddingTop: 8,
  },
  menuContentDocked: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  menuItemDocked: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
  },
  menuItemLeftDocked: {
    gap: 12,
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
  trackedExpenseSubItemDocked: {
    borderBottomWidth: 0,
    borderBottomColor: "transparent",
    marginHorizontal: 6,
    borderRadius: 10,
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
  categorySectionDocked: {
    borderTopWidth: 0,
    marginTop: 4,
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
    borderLeftColor: "#B900FF",
  },
  consultationMenuItem: {
    overflow: "hidden",
    position: "relative",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  rankingIconWrap: {
    width: 24,
    height: 24,
    position: "relative",
    flexShrink: 0,
  },
  rankingPositionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 7,
  },
  rankingPositionText: {
    fontWeight: "800",
    textAlign: "center",
    includeFontPadding: false,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuItemTextActive: {
    fontWeight: "600",
  },
  consultationMenuTextPulse: {
    color: "#FF008A",
    fontWeight: "700",
  },
  consultationMenuTextBooked: {
    color: "#B900FF",
    fontWeight: "700",
  },
  consultationTextWrap: {
    flex: 1,
    gap: 2,
  },
  consultationDayHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  consultationDayHintBooked: {
    color: "#c4b5fd",
  },
  consultationPulseBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  consultationPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF008A",
    marginLeft: 8,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#B900FF",
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
    color: "#FF008A",
  },
});

export default Sidebar;
