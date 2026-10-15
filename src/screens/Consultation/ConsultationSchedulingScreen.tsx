import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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
import { parseConsultationPreferredDay } from "../../utils/consultationScheduling";

type FeedbackModal = {
  visible: boolean;
  title: string;
  message: string;
  tone: "success" | "error";
};

export const ConsultationSchedulingScreen: React.FC = () => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const {
    schedulingUrl,
    preferredDate,
    preferredDayLabel,
    bookedDay,
    bookedDayLabel,
    hasBookedCurrentCycle,
    shouldPulse,
    cycleEnded,
    cycleStartKey,
    openScheduling,
    confirmBooking,
  } = useConsultationScheduling();
  const request = useUserConsultationRequest(user?.id || null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const suggestedDay = parseConsultationPreferredDay(
    hasBookedCurrentCycle ? bookedDay : preferredDate,
  );
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

  const bookingSection = (
    <View
      style={[
        styles.bookingBox,
        { borderColor: hasBookedCurrentCycle ? "#8c52ff" : colors.border },
      ]}
    >
      <Text style={[styles.bookingTitle, { color: colors.text }]}>
        {hasBookedCurrentCycle
          ? "Consultoria agendada"
          : "Já agendei a consultoria"}
      </Text>
      <Text style={[styles.bookingBody, { color: colors.textSecondary }]}>
        {hasBookedCurrentCycle
          ? "Se o horário mudar, escolha outro dia e atualize."
          : "Escolha no calendário o dia em que a consultoria ficou marcada."}
      </Text>
      {hasBookedCurrentCycle && bookedDayLabel ? (
        <Text style={styles.bookedLabel}>
          Dia da consultoria: {bookedDayLabel}
        </Text>
      ) : null}
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
          <ActivityIndicator color="#8c52ff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>
              {hasBookedCurrentCycle ? "Atualizar dia" : "Confirmar que agendei"}
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
              <Ionicons name="calendar" size={32} color="#8c52ff" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Sua consultoria está disponível
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Toque no botão abaixo para abrir o calendário e escolher o melhor
              horário.
            </Text>
            {!hasBookedCurrentCycle && preferredDayLabel ? (
              <View
                style={[
                  styles.dayBadge,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="sparkles" size={18} color="#8c52ff" />
                <Text style={[styles.dayBadgeText, { color: colors.text }]}>
                  Melhor dia sugerido: {preferredDayLabel} de cada mês
                </Text>
              </View>
            ) : null}
            {shouldPulse ? (
              <Text style={styles.pulseHint}>
                {cycleEnded
                  ? "Seu ciclo de Consumo Moderado terminou. Agende sua consultoria."
                  : "Seu ciclo de Consumo Moderado acaba em breve. Agende sua consultoria."}
              </Text>
            ) : null}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                openScheduling().catch(() => {
                  // openChatLink já trata erro
                });
              }}
            >
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Abrir agendamento</Text>
            </TouchableOpacity>
            {bookingSection}
          </View>
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
            Agendamento ainda não liberado
          </Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Seu link de consultoria ainda não foi configurado pela equipe Visão.
            Toque no botão abaixo para avisarmos — liberaremos o agendamento para
            você o quanto antes.
          </Text>

          {hasPendingRequest ? (
            <View
              style={[
                styles.statusBox,
                styles.statusBoxSuccess,
                { borderColor: "#8c52ff", backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#8c52ff" />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {requestSentRecently
                  ? "Solicitação enviada! A equipe Visão foi avisada. Aguarde a liberação do link."
                  : "Você já solicitou liberação. Pode enviar novamente se ainda não foi atendido."}
              </Text>
            </View>
          ) : null}

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
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                <Text style={styles.primaryButtonText}>
                  {hasPendingRequest && requestSentRecently
                    ? "Reenviar solicitação"
                    : "Solicitar liberação do agendamento"}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {bookingSection}
        </View>
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
    color: "#ff4d6d",
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
    backgroundColor: "#8c52ff",
  },
});

export default ConsultationSchedulingScreen;
