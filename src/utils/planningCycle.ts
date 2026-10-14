import { Planning } from "../types/planning";
import { addDays, getEndOfDay, getStartOfDay } from "./dateUtils";

export const CONSULTATION_RENEWAL_LEAD_DAYS = 7;

export const getPlanningCycleStartKey = (
  planning: Planning | null | undefined,
): string | null => {
  if (!planning?.consumoModeradoCycleStartedAt) return null;
  const startedAtMs = new Date(planning.consumoModeradoCycleStartedAt).getTime();
  if (!Number.isFinite(startedAtMs)) return null;
  return String(startedAtMs);
};

export const isPlanningCycleEnded = (
  planning: Planning | null | undefined,
  referenceDate: Date = new Date(),
): boolean => {
  if (!planning?.consumoModeradoCycleStartedAt) return false;

  const today = getStartOfDay(referenceDate);

  if (planning.consumoModeradoCycleStatus === "closed") {
    return true;
  }

  if (planning.consumoModeradoCycleEndedAt) {
    const endDay = getStartOfDay(
      new Date(planning.consumoModeradoCycleEndedAt),
    );
    return today.getTime() > endDay.getTime();
  }

  const durationDays = Number(planning.consumoModeradoCycleDurationDays || 0);
  if (durationDays > 0) {
    const start = getStartOfDay(
      new Date(planning.consumoModeradoCycleStartedAt),
    );
    const lastCycleDay = addDays(start, durationDays - 1);
    return today.getTime() > getStartOfDay(lastCycleDay).getTime();
  }

  return false;
};

const getPlanningCycleLastDay = (
  planning: Planning | null | undefined,
): Date | null => {
  if (!planning?.consumoModeradoCycleStartedAt) return null;

  if (planning.consumoModeradoCycleEndedAt) {
    return getStartOfDay(new Date(planning.consumoModeradoCycleEndedAt));
  }

  const durationDays = Number(planning.consumoModeradoCycleDurationDays || 0);
  if (durationDays > 0) {
    const start = getStartOfDay(new Date(planning.consumoModeradoCycleStartedAt));
    return getStartOfDay(addDays(start, durationDays - 1));
  }

  return null;
};

export const isPlanningCycleInRenewalWindow = (
  planning: Planning | null | undefined,
  referenceDate: Date = new Date(),
): boolean => {
  if (!planning?.consumoModeradoCycleStartedAt) return false;
  if (isPlanningCycleEnded(planning, referenceDate)) return true;

  const lastDay = getPlanningCycleLastDay(planning);
  if (!lastDay) return false;

  const today = getStartOfDay(referenceDate);
  const windowStart = getStartOfDay(
    addDays(lastDay, -CONSULTATION_RENEWAL_LEAD_DAYS),
  );
  return today.getTime() >= windowStart.getTime();
};

export const getPlanningCycleReminderKey = (
  userId: string,
  planning: Planning | null | undefined,
): string | null => {
  if (!planning?.consumoModeradoCycleStartedAt) return null;
  const startMs = new Date(planning.consumoModeradoCycleStartedAt).getTime();
  return `${userId}:${startMs}`;
};

export const getPlanningCycleEndLabel = (
  planning: Planning | null | undefined,
): string | null => {
  if (!planning?.consumoModeradoCycleStartedAt) return null;

  if (planning.consumoModeradoCycleEndedAt) {
    return getEndOfDay(
      new Date(planning.consumoModeradoCycleEndedAt),
    ).toISOString();
  }

  const durationDays = Number(planning.consumoModeradoCycleDurationDays || 0);
  if (durationDays > 0) {
    const start = getStartOfDay(
      new Date(planning.consumoModeradoCycleStartedAt),
    );
    return getEndOfDay(addDays(start, durationDays - 1)).toISOString();
  }

  return null;
};
