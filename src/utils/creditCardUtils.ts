import { addMonths } from "./dateUtils";

const clampDay = (day: number): number => {
  const n = Number(day) || 1;
  return Math.min(28, Math.max(1, n));
};

// clamp bestDay to 1..28
const clampBestDay = (day: number): number => {
  const n = Number(day) || 1;
  return Math.min(31, Math.max(1, n));
};

export const toInvoiceKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export const parseInvoiceKey = (invoiceKey: string): Date => {
  const [yearStr, monthStr] = invoiceKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  if (!year || !month) {
    return new Date();
  }

  return new Date(year, month - 1, 1);
};

export const getInvoiceKeyForPurchase = (
  purchaseDate: Date,
  bestDay: number,
): string => {
  const safeBestDay = clampBestDay(bestDay);
  const currentMonth = new Date(
    purchaseDate.getFullYear(),
    purchaseDate.getMonth(),
    1,
  );

  // Purchases before the best day belong to the current invoice.
  // Purchases on/after the best day roll to the next invoice.
  if (purchaseDate.getDate() < safeBestDay) {
    return toInvoiceKey(currentMonth);
  }

  return toInvoiceKey(addMonths(currentMonth, 1));
};

export const getDueDateForInvoiceKey = (
  invoiceKey: string,
  invoiceDueDay: number,
): Date => {
  const invoiceMonth = parseInvoiceKey(invoiceKey);
  const dueMonth = addMonths(invoiceMonth, 1);
  return new Date(
    dueMonth.getFullYear(),
    dueMonth.getMonth(),
    clampDay(invoiceDueDay),
    0,
    0,
    0,
    0,
  );
};

export const getInvoiceLabel = (invoiceKey: string): string => {
  const invoiceMonth = parseInvoiceKey(invoiceKey);
  return invoiceMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
};
