import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "./useAuth";
import { db } from "../lib/firebase";
import { Planning } from "../types/planning";
import { isAppClientUser } from "../services/userServices";
import { toLinkHref, openChatLink } from "../utils/chatMessageText";
import { isPlanningCycleEnded } from "../utils/planningCycle";
import { formatConsultationPreferredDay } from "../utils/consultationScheduling";

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
  } | null | undefined,
  setSchedulingUrl: (value: string | null) => void,
  setPreferredDate: (value: string | null) => void,
) => {
  const url = String(profile?.consultationSchedulingUrl || "").trim();
  setSchedulingUrl(url ? toLinkHref(url) : null);

  const preferredRaw = String(profile?.consultationPreferredDate || "").trim();
  setPreferredDate(preferredRaw || null);
};

export const useConsultationScheduling = () => {
  const { user } = useAuth();
  const enabled = isAppClientUser(user) && !!user?.id;

  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [preferredDate, setPreferredDate] = useState<string | null>(null);
  const [planning, setPlanning] = useState<Planning | null>(null);

  useEffect(() => {
    if (!enabled || !user?.id) {
      setSchedulingUrl(null);
      setPreferredDate(null);
      return;
    }

    applySchedulingProfile(user, setSchedulingUrl, setPreferredDate);

    const userRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setSchedulingUrl(null);
          setPreferredDate(null);
          return;
        }
        applySchedulingProfile(snapshot.data(), setSchedulingUrl, setPreferredDate);
      },
      () => {
        applySchedulingProfile(user, setSchedulingUrl, setPreferredDate);
      },
    );

    return unsubscribe;
  }, [
    enabled,
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

  const preferredDayLabel = useMemo(
    () => formatConsultationPreferredDay(preferredDate),
    [preferredDate],
  );

  const openScheduling = useCallback(async () => {
    if (!schedulingUrl) return;
    await openChatLink(schedulingUrl);
  }, [schedulingUrl]);

  return {
    enabled,
    schedulingUrl,
    preferredDate,
    preferredDayLabel,
    planning,
    cycleEnded,
    shouldPulse: cycleEnded,
    openScheduling,
  };
};
