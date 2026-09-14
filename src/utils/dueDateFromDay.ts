export type BillDueKind = "overdue" | "due_today" | "pending";

export const startOfLocalDay = (date: Date = new Date()): Date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const lastDayOfMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

export const clampDayToMonth = (
  year: number,
  month: number,
  day: number,
): number => {
  const lastDay = lastDayOfMonth(year, month);
  const safeDay = Math.trunc(Number(day));
  if (!Number.isFinite(safeDay) || safeDay < 1) return 1;
  return Math.min(safeDay, lastDay);
};

/**
 * Interpreta vencimento informado só com o DIA (1–31) no fuso local.
 * Se o dia ainda não passou neste mês (incluindo hoje), usa o mês atual.
 * Se já passou, usa o próximo mês (virada de ano incluída).
 * Dias inexistentes (31/fev, 31/abr) caem no último dia válido do mês.
 */
export const resolveDueDateFromDay = (
  dueDay: number,
  now: Date = new Date(),
): Date => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = startOfLocalDay(now);
  const thisMonth = startOfLocalDay(
    new Date(year, month, clampDayToMonth(year, month, dueDay)),
  );

  if (thisMonth.getTime() >= today.getTime()) {
    return thisMonth;
  }

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return startOfLocalDay(
    new Date(
      nextYear,
      nextMonth,
      clampDayToMonth(nextYear, nextMonth, dueDay),
    ),
  );
};

export const classifyDueDate = (
  dueDate: Date,
  now: Date = new Date(),
): BillDueKind => {
  const due = startOfLocalDay(dueDate);
  const today = startOfLocalDay(now);
  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "due_today";
  return "pending";
};

export const billStatusFromDueDate = (
  dueDate: Date,
  now: Date = new Date(),
): "overdue" | "pending" =>
  classifyDueDate(dueDate, now) === "overdue" ? "overdue" : "pending";
