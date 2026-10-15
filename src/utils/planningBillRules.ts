export type DueKind = "overdue" | "due_today" | "pending" | "none";

export type PlanningBillSnapshot = {
  dueDay?: number | null;
  dueDate?: Date | null;
  recurring?: boolean;
  status?: string | null;
  paidDate?: Date | null;
  markedOverdue?: boolean;
  inactive?: boolean;
};

export type RestartedBill = {
  dueDay?: number;
  dueDate: Date | null;
  recurring: boolean;
  status: "pending" | "overdue" | "paid";
  paidDate: Date | null;
  markedOverdue: boolean;
  inactive: boolean;
};

export const startOfLocalDay = (date: Date): Date => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

export const clampDayToMonth = (
  year: number,
  month: number,
  day: number,
): number => {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.trunc(Number(day));
  if (!Number.isFinite(safeDay) || safeDay < 1) return 1;
  return Math.min(safeDay, lastDay);
};

const dateFromDayInMonth = (year: number, month: number, day: number): Date =>
  startOfLocalDay(new Date(year, month, clampDayToMonth(year, month, day)));

export const isBillInactive = (bill: PlanningBillSnapshot): boolean =>
  bill.inactive === true;

export const isBillPaid = (bill: PlanningBillSnapshot): boolean => {
  const status = String(bill.status || "")
    .trim()
    .toLowerCase();
  if (status === "paid" || status === "paga") return true;
  return Boolean(bill.paidDate);
};

export const openObligationDueDate = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): Date | null => {
  if (bill.dueDate instanceof Date && !Number.isNaN(bill.dueDate.getTime())) {
    return startOfLocalDay(bill.dueDate);
  }
  if (bill.dueDay === undefined || bill.dueDay === null) return null;
  const day = Number(bill.dueDay);
  if (!Number.isFinite(day)) return null;
  return dateFromDayInMonth(now.getFullYear(), now.getMonth(), day);
};

export const classifyOpenBill = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): DueKind => {
  if (isBillPaid(bill) || isBillInactive(bill)) return "none";
  const due = openObligationDueDate(bill, now);
  if (!due) return "none";
  const today = startOfLocalDay(now);
  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "due_today";
  return "pending";
};

export const isAutomaticallyOverdue = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): boolean => classifyOpenBill(bill, now) === "overdue";

export const consultantSeesOverdue = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): boolean => {
  if (isBillPaid(bill) || isBillInactive(bill)) return false;
  return isAutomaticallyOverdue(bill, now) || bill.markedOverdue === true;
};

export const clientSeesOverdueHighlight = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): boolean => isAutomaticallyOverdue(bill, now);

export const dueDateLabel = (
  bill: PlanningBillSnapshot,
  now: Date = new Date(),
): string => {
  const due = openObligationDueDate(bill, now);
  if (!due) return "Sem vencimento";
  const day = String(due.getDate()).padStart(2, "0");
  const month = String(due.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${due.getFullYear()}`;
};

export const restartPlanningBill = (
  bill: PlanningBillSnapshot,
  cycleStart: Date,
  now: Date = new Date(),
): RestartedBill => {
  if (isBillInactive(bill)) {
    const stored =
      bill.dueDate instanceof Date && !Number.isNaN(bill.dueDate.getTime())
        ? startOfLocalDay(bill.dueDate)
        : null;
    return {
      dueDay:
        bill.dueDay === undefined || bill.dueDay === null
          ? undefined
          : Number(bill.dueDay),
      dueDate: stored,
      recurring: Boolean(bill.recurring),
      status: isBillPaid(bill) ? "paid" : "pending",
      paidDate: bill.paidDate || null,
      markedOverdue: bill.markedOverdue === true,
      inactive: true,
    };
  }

  const paid = isBillPaid(bill);
  const storedDue =
    bill.dueDate instanceof Date && !Number.isNaN(bill.dueDate.getTime())
      ? startOfLocalDay(bill.dueDate)
      : null;
  const configuredDay =
    bill.dueDay === undefined || bill.dueDay === null
      ? storedDue
        ? storedDue.getDate()
        : undefined
      : Number(bill.dueDay);

  if (paid && bill.recurring && configuredDay) {
    const dueDate = dateFromDayInMonth(
      cycleStart.getFullYear(),
      cycleStart.getMonth(),
      configuredDay,
    );
    return {
      dueDay: configuredDay,
      dueDate,
      recurring: true,
      status: "pending",
      paidDate: null,
      markedOverdue: false,
      inactive: false,
    };
  }

  const dueDate =
    storedDue ||
    (configuredDay
      ? dateFromDayInMonth(now.getFullYear(), now.getMonth(), configuredDay)
      : null);

  const next: RestartedBill = {
    dueDay: configuredDay,
    dueDate,
    recurring: Boolean(bill.recurring),
    status: "pending",
    paidDate: null,
    markedOverdue: paid ? false : bill.markedOverdue === true,
    inactive: false,
  };

  if (
    !paid &&
    dueDate &&
    dueDate.getTime() < startOfLocalDay(now).getTime()
  ) {
    next.status = "overdue";
  }

  return next;
};
