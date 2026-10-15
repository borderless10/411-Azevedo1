export const INCOME_ORIGIN_MAX = 80;

export const isPersistableTrackedZero = (
  value: number | null | undefined,
  dailyTracking?: boolean,
): boolean => dailyTracking === true && value === 0;

export const incomeValueError = (
  value: number | null | undefined,
  dailyTracking?: boolean,
): string => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Valor é obrigatório";
  }
  if (value < 0) return "Valor deve ser maior que zero";
  if (value === 0 && !isPersistableTrackedZero(value, dailyTracking)) {
    return "Valor deve ser maior que zero";
  }
  return "";
};

export const normalizeIncomeOrigin = (raw?: string | null): string => {
  const text = String(raw || "").trim();
  if (!text) return "";
  return text.slice(0, INCOME_ORIGIN_MAX);
};
