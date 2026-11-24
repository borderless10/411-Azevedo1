import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { db } from "../lib/firebase";
import { Planning } from "../types/planning";
import { isAppClientUser, userService } from "../services/userServices";
import { toLinkHref, openChatLink } from "../utils/chatMessageText";
import { formatDateForDisplay } from "../utils/dateUtils";
import {
  getConsultationSuggestedDate,
  getPlanningCycleStartKey,
  isPlanningCycleEnded,
  isPlanningCycleInRenewalWindow,
} from "../utils/planningCycle";
import {
  canConfirmConsultationBooking,
  formatConsultationPreferredDay,
  getConsultationSchedulingState,
  isConsultationBookedForCycle,
} from "../utils/consultationScheduling";

const mapPlanningSnapshot = (data: any): Planning | null => {
  if (!data) return null;

  return {
    consumoModeradoCycleStartedAt: data.consumoModeradoCycleStartedAt
      ? data.consumoModeradoCycleStartedAt.toDate()
      : null,
    consumoModeradoCycleEndedAt: data.consumoModeradoCycleEndedAt
      ? data.consumoModeradoCycleEndedAt.toDate()
      : null,
    consumoModeradoCycleStatus: data.consumoModeradoCycleStatus,
    consumoModeradoCycleDurationDays: data.consumoModeradoCycleDurationDays,
  } as Planning;
};

const applySchedulingProfile = (
  profile: {
    consultationSchedulingUrl?: string;
    consultationPreferredDate?: string;
    consultationBookedDay?: string;
    consultationBookedCycleStartedAt?: string;
    consultationSchedulingOpenedCycleStartedAt?: string;
    consultationSchedulingOpenedAt?: Date | { toDate: () => Date };
  } | null | undefined,
  setSchedulingUrl: (value: string | null) => void,
  setPreferredDate: (value: string | null) => void,
  setBookedDay: (value: string | null) => void,
  setBookedCycleStartedAt: (value: string | null) => void,
  setOpenedCycleStartedAt: (value: string | null) => void,
  setOpenedAt: (value: Date | null) => void,
) => {
  const url = String(profile?.consultationSchedulingUrl || "").trim();
  setSchedulingUrl(url ? toLinkHref(url) : null);

  const preferredRaw = String(profile?.consultationPreferredDate || "").trim();
  setPreferredDate(preferredRaw || null);

  const bookedDay = String(profile?.consultationBookedDay || "").trim();
  setBookedDay(bookedDay || null);

  const bookedCycle = String(profile?.consultationBookedCycleStartedAt || "").trim();
  setBookedCycleStartedAt(bookedCycle || null);

  const openedCycle = String(
    profile?.consultationSchedulingOpenedCycleStartedAt || "",
  ).trim();
  setOpenedCycleStartedAt(openedCycle || null);

  const openedAt = profile?.consultationSchedulingOpenedAt;
  setOpenedAt(
    openedAt instanceof Date
      ? openedAt
      : typeof openedAt?.toDate === "function"
        ? openedAt.toDate()
        : null,
  );
};

function useConsultationSchedulingState() {
  const { user } = useAuth();
  const enabled = isAppClientUser(user) && !!user?.id;

  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [bookedDay, setBookedDay] = useState<string | null>(null);
  const [bookedCycleStartedAt, setBookedCycleStartedAt] = useState<string | null>(
    null,
  );
  const [openedCycleStartedAt, setOpenedCycleStartedAt] = useState<string | null>(
    null,
  );
  const [openedAt, setOpenedAt] = useState<Date | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setSchedulingUrl(null);
      setPreferredDate(null);
      setBookedDay(null);
      setBookedCycleStartedAt(null);
      setOpenedCycleStartedAt(null);
      setOpenedAt(null);
      return;
    }

    applySchedulingProfile(
      user,
      setSchedulingUrl,
      setPreferredDate,
      setBookedDay,
      setBookedCycleStartedAt,
      setOpenedCycleStartedAt,
      setOpenedAt,
    );

    const userRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSchedulingUrl(null);
          setPreferredDate(null);
          setBookedDay(null);
          setBookedCycleStartedAt(null);
          setOpenedCycleStartedAt(null);
          setOpenedAt(null);
          return;
        }
        applySchedulingProfile(
          snapshot.data(),
          setSchedulingUrl,
          setPreferredDate,
          setBookedDay,
          setBookedCycleStartedAt,
          setOpenedCycleStartedAt,
          setOpenedAt,
        );
      },
      () => {
        applySchedulingProfile(
          user,
          setSchedulingUrl,
          setPreferredDate,
          setBookedDay,
          setBookedCycleStartedAt,
          setOpenedCycleStartedAt,
          setOpenedAt,
        );
      },
    );

    return unsubscribe;
  }, [
    enabled,
    user?.consultationBookedCycleStartedAt,
    user?.consultationBookedDay,
    user?.consultationPreferredDate,
    user?.consultationSchedulingOpenedAt?.getTime(),
    user?.consultationSchedulingOpenedCycleStartedAt,
    user?.consultationSchedulingUrl,
    user?.id,
  ]);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setPlanning(null);
      return;
    }

    const planningRef = doc(db, "users", user.id, "planning", "current");
    const unsubscribe = onSnapshot(
      planningRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setPlanning(null);
          return;
        }
        setPlanning(mapPlanningSnapshot(snapshot.data()));
      },
      () => {
        setPlanning(null);
      },
    );

    return unsubscribe;
  }, [enabled, user?.id]);

  const cycleEnded = useMemo(
    () => isPlanningCycleEnded(planning),
    [planning],
  );

  const cycleStartKey = useMemo(
    () => getPlanningCycleStartKey(planning),
    [planning],
  );

  const inRenewalWindow = useMemo(
    () => isPlanningCycleInRenewalWindow(planning),
    [planning],
  );

  const hasBookedCurrentCycle = useMemo(
    () =>
      isConsultationBookedForCycle(bookedDay, bookedCycleStartedAt, cycleStartKey),
    [bookedCycleStartedAt, bookedDay, cycleStartKey],
  );

  const schedulingState = useMemo(
    () =>
      getConsultationSchedulingState({
        hasSchedulingUrl: !!schedulingUrl,
        openedCycleStartedAt,
        bookedDay,
        bookedCycleStartedAt,
        cycleStartKey,
      }),
    [
      bookedCycleStartedAt,
      bookedDay,
      cycleStartKey,
      openedCycleStartedAt,
      schedulingUrl,
    ],
  );

  const hasOpenedSchedulingCurrentCycle =
    schedulingState === "awaitingConfirmation" ||
    schedulingState === "booked";

  // Opção B: dia sugerido = último dia do ciclo − 7 (não usa dia fixo do consultor).
  const consultationSuggestedDate = useMemo(
    () => getConsultationSuggestedDate(planning),
    [planning],
  );

  const preferredDayLabel = useMemo(
    () =>
      consultationSuggestedDate
        ? formatDateForDisplay(consultationSuggestedDate)
        : null,
    [consultationSuggestedDate],
  );

  const suggestedDayOfMonth = useMemo(
    () => (consultationSuggestedDate ? consultationSuggestedDate.getDate() : null),
    [consultationSuggestedDate],
  );

  const bookedDayLabel = useMemo(
    () => (hasBookedCurrentCycle ? formatConsultationPreferredDay(bookedDay) : null),
    [bookedDay, hasBookedCurrentCycle],
  );

  const openScheduling = useCallback(async () => {
    if (!user?.id) {
      throw new Error("Não foi possível identificar sua conta.");
    }
    if (!schedulingUrl) {
      throw new Error("O link de agendamento ainda não está disponível.");
    }
    if (!cycleStartKey) {
      throw new Error("O ciclo atual ainda não está disponível.");
    }
    if (schedulingState !== "available") {
      throw new Error("O agendamento já foi aberto neste ciclo.");
    }
    await userService.markConsultationSchedulingOpened(
      user.id,
      cycleStartKey,
    );
    setOpenedCycleStartedAt(cycleStartKey);
    setOpenedAt(new Date());
    await openChatLink(schedulingUrl);
  }, [
    cycleStartKey,
    schedulingState,
    schedulingUrl,
    user?.id,
  ]);

  const confirmBooking = useCallback(
    async (day: number) => {
      if (!user?.id) {
        throw new Error("Não foi possível identificar sua conta.");
      }
      if (!cycleStartKey) {
        throw new Error("Não foi possível identificar o ciclo atual.");
      }
      if (
        !canConfirmConsultationBooking(
          bookedDay,
          bookedCycleStartedAt,
          cycleStartKey,
        )
      ) {
        throw new Error(
          "O dia da consultoria já foi confirmado neste ciclo.",
        );
      }
      await userService.confirmConsultationBooking(user.id, day, cycleStartKey);
    },
    [bookedCycleStartedAt, bookedDay, cycleStartKey, user?.id],
  );

  return useMemo(
    () => ({
      enabled,
      schedulingUrl,
      preferredDate,
      preferredDayLabel,
      suggestedDayOfMonth,
      bookedDay,
      bookedDayLabel,
      hasBookedCurrentCycle,
      hasOpenedSchedulingCurrentCycle,
      openedAt,
      schedulingState,
      planning,
      cycleEnded,
      cycleStartKey,
      shouldPulse:
        schedulingState === "awaitingConfirmation" ||
        (inRenewalWindow && schedulingState === "available"),
      openScheduling,
      confirmBooking,
    }),
    [
      bookedDay,
      bookedDayLabel,
      confirmBooking,
      cycleEnded,
      cycleStartKey,
      enabled,
      hasBookedCurrentCycle,
      hasOpenedSchedulingCurrentCycle,
      inRenewalWindow,
      openScheduling,
      openedAt,
      planning,
      preferredDate,
      preferredDayLabel,
      suggestedDayOfMonth,
      schedulingState,
      schedulingUrl,
    ],
  );
}

type ConsultationSchedulingValue = ReturnType<typeof useConsultationSchedulingState>;

const ConsultationSchedulingContext =
  createContext<ConsultationSchedulingValue | null>(null);

export function ConsultationSchedulingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const value = useConsultationSchedulingState();
  return createElement(
    ConsultationSchedulingContext.Provider,
    { value },
    children,
  );
}

export function useConsultationScheduling(): ConsultationSchedulingValue {
  const value = useContext(ConsultationSchedulingContext);
  if (!value) {
    throw new Error("useConsultationScheduling precisa do provider");
  }
  return value;
}
