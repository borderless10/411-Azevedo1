import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Layout } from "../../components/Layout/Layout";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../hooks/useAuth";
import { useConsultationScheduling } from "../../hooks/useConsultationScheduling";
import { useUserConsultationRequest } from "../../hooks/useConsultationRequest";
import { consultationRequestService } from "../../services/consultationRequestService";
import { getCoupleDisplayName, isCoupleAccount } from "../../utils/coupleAccount";
import { profileDisplayName } from "../../utils/chatDisplayNames";
import CustomModal from "../../components/ui/CustomModal";
import { ConsultationBookingCalendar } from "../../components/Consultation/ConsultationBookingCalendar";
import {
  findConsultationSupportChatId,
  parseConsultationPreferredDay,
  shouldShowConsultationSupportHelp,
} from "../../utils/consultationScheduling";
import { useNavigation } from "../../routes/NavigationContext";
import { useUserChats } from "../../hooks/useUserChats";
import chatService from "../../services/chatService";
import { userService } from "../../services/userServices";

type FeedbackModal = {
  visible: boolean;
  title: string;
  message: string;
  tone: "success" | "error";
};

export const ConsultationSchedulingScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { chats } = useUserChats(user?.id || null, user?.role || null);
  const {
    schedulingUrl,
    preferredDayLabel,
    suggestedDayOfMonth,
    bookedDay,
    bookedDayLabel,
    hasBookedCurrentCycle,
    schedulingState,
    shouldPulse,
    cycleEnded,
    cycleStartKey,
    openScheduling,
    confirmBooking,
  } = useConsultationScheduling();
  const request = useUserConsultationRequest(user?.id || null);
  const [submitting, setSubmitting] = useState(false);
  const [openingVisaoChat, setOpeningVisaoChat] = useState(false);
  const [opening, setOpening] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const confirmationPulse = useRef(new Animated.Value(1)).current;
  const suggestedDay = hasBookedCurrentCycle
    ? parseConsultationPreferredDay(bookedDay)
    : suggestedDayOfMonth;
  const [selectedDay, setSelectedDay] = useState<number | null>(suggestedDay);
  const dayTouchedRef = useRef(false);
  const [feedback, setFeedback] = useState<FeedbackModal>({
    visible: false,
    title: "",
    message: "",
    tone: "success",
  });

  const hasPendingRequest =
    request?.status === "pending" || user?.consultationSchedulingRequestPending;
  const requestSentRecently = useMemo(() => {
    const requestedAt =
      request?.lastRequestedAt || user?.consultationSchedulingRequestedAt;
    if (!requestedAt) return false;
    const diffMs = Date.now() - new Date(requestedAt).getTime();
    return diffMs < 1000 * 60 * 30;
  }, [request?.lastRequestedAt, user?.consultationSchedulingRequestedAt]);

  useEffect(() => {
    if (dayTouchedRef.current) return;
    setSelectedDay(suggestedDay);
  }, [suggestedDay]);

  useEffect(() => {
    setIsCalendarVisible(false);
    dayTouchedRef.current = false;
  }, [schedulingState]);

  useEffect(() => {
    if (
      schedulingState !== "awaitingConfirmation" ||
      isCalendarVisible
    ) {
      confirmationPulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(confirmationPulse, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(confirmationPulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [confirmationPulse, isCalendarVisible, schedulingState]);

  const showFeedback = (
    tone: "success" | "error",
    title: string,
    message: string,
  ) => {
    setFeedback({ visible: true, title, message, tone });
  };

  const handleRequestAccess = async () => {
    if (!user?.id) return;

    try {
      setSubmitting(true);
      await consultationRequestService.requestSchedulingAccess({
        userId: user.id,
        userDisplayName: isCoupleAccount(user)
          ? getCoupleDisplayName(user)
          : profileDisplayName(user, "Cliente"),
        userEmail: user.email || "",
        consultantId: user.consultantId || null,
        accountType: user.accountType || "individual",
      });

      showFeedback(
        "success",
        "Solicitação enviada",
        "A equipe Visão foi avisada. Em breve seu link de agendamento será liberado.",
      );
    } catch (error: any) {
      console.error("Erro ao solicitar agendamento:", error);
      showFeedback(
        "error",
        "Não foi possível enviar",
        error?.message ||
          "Tente novamente em instantes. Se persistir, fale com a equipe Visão.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedDay) {
      showFeedback("error", "Escolha o dia", "Informe o dia da consultoria.");
      return;
    }

    try {
      setConfirming(true);
      await confirmBooking(selectedDay);
      showFeedback(
        "success",
        "Consultoria agendada",
        "A sidebar agora mostra a consultoria agendada e o aviso vermelho fica desligado neste ciclo.",
      );
    } catch (error: any) {
      console.error("Erro ao confirmar consultoria:", error);
      showFeedback(
        "error",
        "Não foi possível confirmar",
        error?.message || "Tente novamente em instantes.",
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenScheduling = async () => {
    try {
      setOpening(true);
      await openScheduling();
    } catch (error: any) {
      console.error("Erro ao abrir agendamento:", error);
      showFeedback(
        "error",
        "Não foi possível abrir",
        error?.message || "Tente novamente em instantes.",
      );
    } finally {
      setOpening(false);
    }
  };

  // Abre a conversa direta com a equipe Visão (a mesma que o ChatScreen
  // cria para todo cliente: chat direto com o admin, exibido como "Visão").
  // Só navega: não reabre o agendamento nem desfaz abertura/confirmação.
  const handleContactVisao = async () => {
    if (!user?.id || openingVisaoChat) return;
    setOpeningVisaoChat(true);
    try {
      const existingChatId = findConsultationSupportChatId(
        chats,
        user.id,
        user.consultantId || null,
      );
      if (existingChatId) {
        navigate("Chat", { chatId: existingChatId });
        return;
      }
      // Chat ainda não criado (usuário nunca abriu o Chat): cria do mesmo
      // jeito que o ChatScreen e navega direto para ele.
      const admins = await userService.getUsersByRole("admin");
      const targetAdmin = admins.find((admin) => admin.id !== user.id) || null;
      if (!targetAdmin?.id) {
        // Sem admin localizado, a lista de chats é o destino mais direto.
        navigate("Chat");
        return;
      }
      const chat = await chatService.createChatIfNotExists(
        user.id,
        targetAdmin.id,
        "direct",
      );
      navigate("Chat", { chatId: chat.id });
    } catch (error) {
      console.error("Erro ao abrir chat com a Visão:", error);
      // O ChatScreen cria essa conversa ao abrir; a lista é o fallback.
      navigate("Chat");
    } finally {
      setOpeningVisaoChat(false);
    }
  };

  const supportHelpSection = shouldShowConsultationSupportHelp(
    schedulingState,
  ) ? (
    <View style={styles.supportHelpBox}>
      <Text style={styles.supportHelpText}>
        Você clicou de maneira equivocada? Entre em contato com o time Visão.
      </Text>
      <TouchableOpacity
        style={[
          styles.supportHelpButton,
          openingVisaoChat && styles.buttonDisabled,
        ]}
        onPress={handleContactVisao}
        disabled={openingVisaoChat}
        accessibilityRole="button"
        accessibilityLabel="Falar com a Visão"
      >
        {openingVisaoChat ? (
          <ActivityIndicator color="#FF008A" />
        ) : (
          <>
            <Ionicons name="chatbubbles-outline" size={20} color="#FF008A" />
            <Text style={styles.supportHelpButtonText}>Falar com a Visão</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  ) : null;

  const bookingSection = (
    <View
      style={[
        styles.bookingBox,
        { borderColor: colors.border },
      ]}
    >
      <Text style={[styles.bookingTitle, { color: colors.text }]}>
        Informe o dia da consultoria
      </Text>
      <Text style={[styles.bookingBody, { color: colors.textSecondary }]}>
        Escolha no calendário o dia em que a consultoria ficou marcada.
      </Text>
      <ConsultationBookingCalendar
        day={selectedDay}
        onChangeDay={(day) => {
          dayTouchedRef.current = true;
          setSelectedDay(day);
        }}
      />
      <TouchableOpacity
        style={[
          styles.secondaryButton,
          (!selectedDay || !cycleStartKey || confirming) && styles.buttonDisabled,
        ]}
        onPress={handleConfirmBooking}
        disabled={confirming || !selectedDay || !cycleStartKey}
      >
        {confirming ? (
          <ActivityIndicator color="#B900FF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>
              Confirmar dia da consultoria
            </Text>
          </>
        )}
      </TouchableOpacity>
      {!cycleStartKey ? (
        <Text style={[styles.bookingBody, { color: colors.textSecondary }]}>
          O ciclo atual ainda não está disponível para confirmar.
        </Text>
      ) : null}
    </View>
  );

  if (schedulingUrl) {
    return (
      <Layout title="Agendar consultoria" showBackButton showSidebar>
        <ScrollView
          style={[styles.container, { backgroundColor: colors.background }]}
          contentContainerStyle={styles.scrollContent}
        >
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.iconCircle}>
              <Ionicons name="calendar" size={32} color="#B900FF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {schedulingState === "booked"
                ? "Consultoria agendada"
                : schedulingState === "awaitingConfirmation"
                  ? "Confirme sua consultoria"
                  : "Sua consultoria está disponível"}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {schedulingState === "booked"
                ? bookedDayLabel
                  ? `Dia da consultoria: ${bookedDayLabel}`
                  : "Sua consultoria foi confirmada."
                : schedulingState === "awaitingConfirmation"
                  ? "O link já foi aberto neste ciclo. Confirme abaixo o dia que ficou agendado."
                  : "Toque no botão abaixo para abrir o calendário e escolher o melhor horário."}
            </Text>
            {schedulingState === "available" && preferredDayLabel ? (
              <View
                style={[
                  styles.dayBadge,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="sparkles" size={18} color="#B900FF" />
                <Text style={[styles.dayBadgeText, { color: colors.text }]}>
                  Melhor dia sugerido: {preferredDayLabel}
                </Text>
              </View>
            ) : null}
            {schedulingState === "available" && shouldPulse ? (
              <Text style={styles.pulseHint}>
                {cycleEnded
                  ? "Seu ciclo de Consumo Moderado terminou. Agende sua consultoria."
                  : "Seu ciclo de Consumo Moderado acaba em breve. Agende sua consultoria."}
              </Text>
            ) : null}
            {schedulingState === "available" ? (
              <>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                    (!cycleStartKey || opening) && styles.buttonDisabled,
                  ]}
                  onPress={handleOpenScheduling}
                  disabled={!cycleStartKey || opening}
                >
                  {opening ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="open-outline" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>
                        Abrir agendamento
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {!cycleStartKey ? (
                  <Text
                    style={[
                      styles.bookingBody,
                      { color: colors.textSecondary },
                    ]}
                  >
                    O ciclo atual ainda não está disponível. Não é possível
                    abrir o agendamento agora.
                  </Text>
                ) : null}
              </>
            ) : null}
            {schedulingState === "awaitingConfirmation" ? (
              <>
                {!isCalendarVisible ? (
                  <Animated.View style={{ opacity: confirmationPulse }}>
                    <TouchableOpacity
                      style={styles.confirmationCta}
                      onPress={() => setIsCalendarVisible(true)}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={styles.primaryButtonText}>
                        Sua consultoria já foi agendada? Clique aqui!
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ) : (
                  bookingSection
                )}
              </>
            ) : null}
            {schedulingState === "booked" ? (
              <Text style={styles.bookedMessage}>
                Para mudar o dia da consultoria, entre em contato com a equipe
                Visão.
              </Text>
            ) : null}
          </View>
          {supportHelpSection}
        </ScrollView>
        <CustomModal
          visible={feedback.visible}
          title={feedback.title}
          message={feedback.message}
          primaryLabel="Entendi"
          onClose={() => setFeedback((current) => ({ ...current, visible: false }))}
        />
      </Layout>
    );
  }

  return (
    <Layout title="Agendar consultoria" showBackButton showSidebar>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.iconCircle, styles.iconCircleMuted]}>
            <Ionicons name="calendar-outline" size={32} color="#a89fc0" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {hasBookedCurrentCycle
              ? "Consultoria agendada"
              : "Agendamento ainda não liberado"}
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {hasBookedCurrentCycle && bookedDayLabel
              ? `Dia da consultoria: ${bookedDayLabel}`
              : "Seu link de consultoria ainda não foi configurado pela equipe Visão. Toque no botão abaixo para avisarmos. Liberaremos o agendamento para você o quanto antes."}
          </Text>

          {hasBookedCurrentCycle ? (
            <Text style={styles.bookedMessage}>
              Para mudar o dia da consultoria, entre em contato com a equipe
              Visão.
            </Text>
          ) : null}

          {!hasBookedCurrentCycle && hasPendingRequest ? (
            <View
              style={[
                styles.statusBox,
                styles.statusBoxSuccess,
                { borderColor: "#B900FF", backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#B900FF" />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {requestSentRecently
                  ? "Solicitação enviada! A equipe Visão foi avisada. Aguarde a liberação do link."
                  : "Você já solicitou liberação. Pode enviar novamente se ainda não foi atendido."}
              </Text>
            </View>
          ) : null}

          {!hasBookedCurrentCycle ? (
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.primary },
                submitting && styles.buttonDisabled,
              ]}
              onPress={handleRequestAccess}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.primaryButtonText}>
                    {hasPendingRequest && requestSentRecently
                      ? "Reenviar solicitação"
                      : "Solicitar liberação do agendamento"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        {supportHelpSection}
      </ScrollView>

      <CustomModal
        visible={feedback.visible}
        title={feedback.title}
        message={feedback.message}
        primaryLabel="Entendi"
        onClose={() => setFeedback((current) => ({ ...current, visible: false }))}
      />
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(140, 82, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconCircleMuted: {
    backgroundColor: "rgba(168, 159, 192, 0.12)",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  dayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  dayBadgeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  pulseHint: {
    color: "#FF008A",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  statusBoxSuccess: {
    borderWidth: 1.5,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryButton: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  bookingBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  bookingBody: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  bookedLabel: {
    color: "#c4b5fd",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#B900FF",
  },
  confirmationCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#B900FF",
  },
  bookedMessage: {
    color: "#c4b5fd",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  supportHelpBox: {
    marginTop: 20,
    gap: 12,
    alignItems: "center",
  },
  supportHelpText: {
    color: "#FF008A",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  supportHelpButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FF008A",
    backgroundColor: "rgba(255, 77, 109, 0.12)",
    alignSelf: "stretch",
  },
  supportHelpButtonText: {
    color: "#FF008A",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ConsultationSchedulingScreen;
