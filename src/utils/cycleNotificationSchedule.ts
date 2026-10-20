export const CONSULTATION_RENEWAL_LEAD_DAYS = 7;

export type CycleClock = {
  consumoModeradoCycleStartedAt?: Date | string | null;
  consumoModeradoCycleEndedAt?: Date | string | null;
  consumoModeradoCycleDurationDays?: number | null;
};

export type CycleNotificationInstant = {
  kind: "renewal" | "ended";
  at: Date;
};

const startOfDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const atLocalHour = (day: Date, hour: number): Date => {
  const at = new Date(day);
  at.setHours(hour, 0, 0, 0);
  return at;
};

const lastCycleDay = (planning: CycleClock | null | undefined): Date | null => {
  if (!planning?.consumoModeradoCycleStartedAt) return null;
  if (planning.consumoModeradoCycleEndedAt) {
    return startOfDay(new Date(planning.consumoModeradoCycleEndedAt));
  }
  const durationDays = Number(planning.consumoModeradoCycleDurationDays || 0);
  if (durationDays > 0) {
    const start = startOfDay(new Date(planning.consumoModeradoCycleStartedAt));
    return startOfDay(addDays(start, durationDays - 1));
  }
  return null;
};

/** 9h do início da janela e 9h do dia seguinte ao último dia do ciclo. */
export const getCycleNotificationInstants = (
  planning: CycleClock | null | undefined,
): CycleNotificationInstant[] => {
  const lastDay = lastCycleDay(planning);
  if (!lastDay) return [];
  const windowStart = startOfDay(
    addDays(lastDay, -CONSULTATION_RENEWAL_LEAD_DAYS),
  );
  const dayAfterEnd = startOfDay(addDays(lastDay, 1));
  return [
    { kind: "renewal", at: atLocalHour(windowStart, 9) },
    { kind: "ended", at: atLocalHour(dayAfterEnd, 9) },
  ];
};
