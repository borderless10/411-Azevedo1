import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { db } from "../lib/firebase";
import { Planning } from "../types/planning";
import { isAppClientUser, userService } from "../services/userServices";
import { toLinkHref, openChatLink } from "../utils/chatMessageText";
import {
  getPlanningCycleStartKey,
  isPlanningCycleEnded,
  isPlanningCycleInRenewalWindow,
} from "../utils/planningCycle";
import {
  formatConsultationPreferredDay,
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
  } | null | undefined,
  setSchedulingUrl: (value: string | null) => void,
  setPreferredDate: (value: string | null) => void,
  setBookedDay: (value: string | null) => void,
  setBookedCycleStartedAt: (value: string | null) => void,
) => {
  const url = String(profile?.consultationSchedulingUrl || "").trim();
  setSchedulingUrl(url ? toLinkHref(url) : null);

  const preferredRaw = String(profile?.consultationPreferredDate || "").trim();
  setPreferredDate(preferredRaw || null);

  const bookedDay = String(profile?.consultationBookedDay || "").trim();
  setBookedDay(bookedDay || null);

  const bookedCycle = String(profile?.consultationBookedCycleStartedAt || "").trim();
  setBookedCycleStartedAt(bookedCycle || null);
};

export const useConsultationScheduling = () => {
  const { user } = useAuth();
  const enabled = isAppClientUser(user) && !!user?.id;

  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [bookedDay, setBookedDay] = useState<string | null>(null);
  const [bookedCycleStartedAt, setBookedCycleStartedAt] = useState<string | null>(
    null,
  );
  const [planning, setPlanning] = useState<Planning | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setSchedulingUrl(null);
      setPreferredDate(null);
      setBookedDay(null);
      setBookedCycleStartedAt(null);
      return;
    }

    applySchedulingProfile(
      user,
      setSchedulingUrl,
      setPreferredDate,
      setBookedDay,
      setBookedCycleStartedAt,
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
          return;
        }
        applySchedulingProfile(
          snapshot.data(),
          setSchedulingUrl,
          setPreferredDate,
          setBookedDay,
          setBookedCycleStartedAt,
        );
      },
      () => {
        applySchedulingProfile(
          user,
          setSchedulingUrl,
          setPreferredDate,
          setBookedDay,
          setBookedCycleStartedAt,
        );
      },
    );

    return unsubscribe;
  }, [
    enabled,
    user?.consultationBookedCycleStartedAt,
    user?.consultationBookedDay,
    user?.consultationPreferredDate,
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

  const preferredDayLabel = useMemo(
    () => formatConsultationPreferredDay(preferredDate),
    [preferredDate],
  );

  const bookedDayLabel = useMemo(
    () => (hasBookedCurrentCycle ? formatConsultationPreferredDay(bookedDay) : null),
    [bookedDay, hasBookedCurrentCycle],
  );

  const openScheduling = useCallback(async () => {
    if (!schedulingUrl) return;
    await openChatLink(schedulingUrl);
  }, [schedulingUrl]);

  const confirmBooking = useCallback(
    async (day: number) => {
      if (!user?.id) {
        throw new Error("Não foi possível identificar sua conta.");
      }
      if (!cycleStartKey) {
        throw new Error("Não foi possível identificar o ciclo atual.");
      }
      await userService.confirmConsultationBooking(user.id, day, cycleStartKey);
    },
    [cycleStartKey, user?.id],
  );

  return {
    enabled,
    schedulingUrl,
    preferredDate,
    preferredDayLabel,
    bookedDay,
    bookedDayLabel,
    hasBookedCurrentCycle,
    planning,
    cycleEnded,
    cycleStartKey,
    shouldPulse: inRenewalWindow && !hasBookedCurrentCycle,
    openScheduling,
    confirmBooking,
  };
};
