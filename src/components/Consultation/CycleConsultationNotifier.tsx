import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConsultationScheduling } from "../../hooks/useConsultationScheduling";
import {
  requestNotificationPermissions,
  showCycleEndedConsultationNotification,
} from "../../services/notificationServices";
import {
  markCycleConsultationReminderSent,
  wasCycleConsultationReminderSent,
} from "../../utils/consultationReminderStorage";
import { getPlanningCycleReminderKey } from "../../utils/planningCycle";
import { useAuth } from "../../hooks/useAuth";
import { useNavigation } from "../../routes/NavigationContext";

export const CycleConsultationNotifier: React.FC = () => {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { schedulingUrl, planning, preferredDayLabel, shouldPulse, openScheduling } =
    useConsultationScheduling();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const permissionsRequestedRef = useRef(false);
  const notifiedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (permissionsRequestedRef.current || !user?.id) return;
    permissionsRequestedRef.current = true;
    requestNotificationPermissions().catch(() => {
      // Permissão opcional; banner in-app continua funcionando.
    });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !shouldPulse) {
      setVisible(false);
      return;
    }

    const reminderKey = getPlanningCycleReminderKey(user.id, planning);
    if (!reminderKey || notifiedKeysRef.current.has(reminderKey)) return;

    let cancelled = false;

    const notify = async () => {
      const alreadySent = await wasCycleConsultationReminderSent(reminderKey);
      if (cancelled || alreadySent) return;

      notifiedKeysRef.current.add(reminderKey);
      await markCycleConsultationReminderSent(reminderKey);
      setVisible(true);
      showCycleEndedConsultationNotification(preferredDayLabel).catch(() => {
        // ignore push errors
      });
    };

    notify().catch(() => {
      // ignore
    });

    return () => {
      cancelled = true;
    };
  }, [planning, preferredDayLabel, shouldPulse, user?.id]);

  useEffect(() => {
    if (!visible) return;

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [slideAnim, visible]);

  const dismissBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  };

  const handlePress = () => {
    if (schedulingUrl) {
      openScheduling().catch(() => {
        // openChatLink já exibe alerta em caso de erro
      });
    } else {
      navigate("ConsultationScheduling");
    }
    dismissBanner();
  };

  if (!user?.id || !visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        {
          top: insets.top + 72,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.92}
        onPress={handlePress}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="calendar" size={22} color="#fff" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            Seu ciclo acabou!
          </Text>
          <Text style={styles.body} numberOfLines={3}>
            {schedulingUrl
              ? preferredDayLabel
                ? `Agende sua consultoria. Melhor dia sugerido: ${preferredDayLabel}.`
                : "Agende uma consultoria com seu consultor."
              : "Seu ciclo terminou. Solicite a liberação do agendamento na Visão."}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={dismissBanner}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color="#ffd6e0" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9998,
    elevation: 19,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4a1020",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ff4d6d",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ff4d6d",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  body: {
    color: "#ffd6e0",
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

export default CycleConsultationNotifier;
