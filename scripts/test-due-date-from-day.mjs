const startOfLocalDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const lastDayOfMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const clampDayToMonth = (year, month, day) => {
  const lastDay = lastDayOfMonth(year, month);
  const safeDay = Math.trunc(Number(day));
  if (!Number.isFinite(safeDay) || safeDay < 1) return 1;
  return Math.min(safeDay, lastDay);
};

const resolveDueDateFromDay = (dueDay, now) => {
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = startOfLocalDay(now);
  const thisMonth = startOfLocalDay(
    new Date(year, month, clampDayToMonth(year, month, dueDay)),
  );
  if (thisMonth.getTime() >= today.getTime()) return thisMonth;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return startOfLocalDay(
    new Date(nextYear, nextMonth, clampDayToMonth(nextYear, nextMonth, dueDay)),
  );
};

const classifyDueDate = (dueDate, now) => {
  const due = startOfLocalDay(dueDate);
  const today = startOfLocalDay(now);
  if (due.getTime() < today.getTime()) return "overdue";
  if (due.getTime() === today.getTime()) return "due_today";
  return "pending";
};

const fmt = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const now = new Date(2026, 8, 14, 18, 0, 0);
assert(fmt(resolveDueDateFromDay(20, now)) === "20/09/2026", "dia 20 em 14/09");
assert(fmt(resolveDueDateFromDay(13, now)) === "13/10/2026", "dia 13 em 14/09");
assert(fmt(resolveDueDateFromDay(14, now)) === "14/09/2026", "mesmo dia 14/09");
assert(classifyDueDate(resolveDueDateFromDay(14, now), now) === "due_today", "hoje não vence como atrasada");
assert(classifyDueDate(resolveDueDateFromDay(13, now), now) === "pending", "13/10 pendente");
assert(classifyDueDate(resolveDueDateFromDay(20, now), now) === "pending", "20/09 pendente");

const dec = new Date(2026, 11, 20, 10, 0, 0);
assert(fmt(resolveDueDateFromDay(10, dec)) === "10/01/2027", "virada de ano");

const feb = new Date(2026, 1, 10, 10, 0, 0);
assert(fmt(resolveDueDateFromDay(31, feb)) === "28/02/2026", "fev 2026 não tem 31");

const apr = new Date(2026, 3, 20, 10, 0, 0);
assert(fmt(resolveDueDateFromDay(31, apr)) === "30/04/2026", "20/04 + dia 31 → 30/04");

const may = new Date(2026, 4, 1, 10, 0, 0);
assert(fmt(resolveDueDateFromDay(31, may)) === "31/05/2026", "01/05 + dia 31 → 31/05");

const leap = new Date(2028, 1, 10, 10, 0, 0);
assert(fmt(resolveDueDateFromDay(31, leap)) === "29/02/2028", "fev bissexto");

console.log("dueDateFromDay: todos os casos passaram");
