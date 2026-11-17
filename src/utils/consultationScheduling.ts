/** Dia do mês (1–31) sugerido para consultoria. Aceita legado YYYY-MM-DD na leitura. */
export const parseConsultationPreferredDay = (
  value?: string | null,
): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return normalizeDay(Number(isoMatch[3]));
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return normalizeDay(Number(brMatch[1]));
  }

  const dayOnly = raw.match(/^(\d{1,2})$/);
  if (dayOnly) {
    return normalizeDay(Number(dayOnly[1]));
  }

  return null;
};

export const isValidConsultationPreferredDay = (
  day: number | null | undefined,
): day is number => typeof day === "number" && day >= 1 && day <= 31;

const normalizeDay = (day: number): number | null =>
  isValidConsultationPreferredDay(day) ? day : null;

export const formatConsultationPreferredDayLabel = (
  value?: string | null,
): string | null => {
  const day = parseConsultationPreferredDay(value);
  if (!day) return null;
  return `Dia ${day}`;
};

export const formatConsultationPreferredDay = formatConsultationPreferredDayLabel;

export const toConsultationPreferredDayStorage = (
  day: number | null | undefined,
): string => {
  if (!isValidConsultationPreferredDay(day)) return "";
  return String(day);
};

export const toConsultationPreferredDateStorage = toConsultationPreferredDayStorage;

export const defaultConsultationPreferredDay = (): number => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.getDate();
};

export const defaultConsultationPreferredDate = defaultConsultationPreferredDay;

export const parseConsultationPreferredDate = parseConsultationPreferredDay;

export const isConsultationBookedForCycle = (
  bookedDay: string | null | undefined,
  bookedCycleStartedAt: string | null | undefined,
  cycleStartKey: string | null,
): boolean => {
  if (!cycleStartKey) return false;
  if (String(bookedCycleStartedAt || "") !== cycleStartKey) return false;
  return parseConsultationPreferredDay(bookedDay) !== null;
};

export type ConsultationSchedulingState =
  | "available"
  | "awaitingConfirmation"
  | "booked";

interface ConsultationSchedulingStateInput {
  hasSchedulingUrl: boolean;
  openedCycleStartedAt?: string | null;
  bookedDay?: string | null;
  bookedCycleStartedAt?: string | null;
  cycleStartKey: string | null;
}

export const getConsultationSchedulingState = ({
  hasSchedulingUrl,
  openedCycleStartedAt,
  bookedDay,
  bookedCycleStartedAt,
  cycleStartKey,
}: ConsultationSchedulingStateInput): ConsultationSchedulingState => {
  if (
    isConsultationBookedForCycle(
      bookedDay,
      bookedCycleStartedAt,
      cycleStartKey,
    )
  ) {
    return "booked";
  }

  if (
    hasSchedulingUrl &&
    cycleStartKey &&
    String(openedCycleStartedAt || "") === cycleStartKey
  ) {
    return "awaitingConfirmation";
  }

  return "available";
};

/**
 * Ajuda pós-clique (clique equivocado): só depois que o link foi aberto
 * neste ciclo. No estado inicial ela não aparece, porque ainda não houve
 * clique para desfazer.
 */
export const shouldShowConsultationSupportHelp = (
  state: ConsultationSchedulingState,
): boolean => state === "awaitingConfirmation" || state === "booked";

interface ConsultationSupportChatCandidate {
  id: string;
  type?: string | null;
  participants?: string[] | null;
}

/**
 * Localiza, entre os chats já carregados, a conversa direta exibida como
 * "Visão" para o cliente: chat direto cujo outro participante não é o
 * consultor dele (mesma regra de título do ChatScreen).
 */
export const findConsultationSupportChatId = (
  chats: ConsultationSupportChatCandidate[] | null | undefined,
  userId: string | null | undefined,
  consultantId?: string | null,
): string | null => {
  if (!userId) return null;
  const consultant = String(consultantId || "").trim();
  for (const chat of chats || []) {
    if (chat?.type !== "direct") continue;
    const participants = chat.participants || [];
    if (!participants.includes(userId)) continue;
    const otherId = participants.find((id) => id !== userId);
    if (!otherId || otherId === consultant) continue;
    return chat.id;
  }
  return null;
};

export const canConfirmConsultationBooking = (
  bookedDay: string | null | undefined,
  bookedCycleStartedAt: string | null | undefined,
  cycleStartKey: string | null,
): boolean =>
  !isConsultationBookedForCycle(
    bookedDay,
    bookedCycleStartedAt,
    cycleStartKey,
  );

export const hasConsultationBookingLock = (
  bookedDay: string | null | undefined,
  bookedCycleStartedAt: string | null | undefined,
): boolean =>
  parseConsultationPreferredDay(bookedDay) !== null &&
  String(bookedCycleStartedAt || "").trim() !== "";

export interface ConsultationBookingReleaseUpdate {
  consultationBookedDay: "";
  consultationBookedCycleStartedAt: "";
  consultationSchedulingOpenedCycleStartedAt: "";
  consultationSchedulingOpenedAt: null;
  consultationPreviousBookedDay: string;
  consultationPreviousBookedCycleStartedAt: string;
}

export const getConsultationBookingReleaseUpdate = (
  bookedDay: string | null | undefined,
  bookedCycleStartedAt: string | null | undefined,
): ConsultationBookingReleaseUpdate => ({
  consultationBookedDay: "",
  consultationBookedCycleStartedAt: "",
  consultationSchedulingOpenedCycleStartedAt: "",
  consultationSchedulingOpenedAt: null,
  consultationPreviousBookedDay: String(bookedDay || "").trim(),
  consultationPreviousBookedCycleStartedAt: String(
    bookedCycleStartedAt || "",
  ).trim(),
});
