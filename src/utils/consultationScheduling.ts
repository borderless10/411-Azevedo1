/** Dia do mês (1–31) sugerido para consultoria. Aceita legado YYYY-MM-DD na leitura. */
export const parseConsultationPreferredDay = (
  value?: string | null,
): number | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return normalizeDay(Number(isoMatch[3]));
  }

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return normalizeDay(Number(brMatch[1]));
  }

  const dayOnly = raw.match(/^(\d{1,2})$/);
  if (dayOnly) {
    return normalizeDay(Number(dayOnly[1]));
  }

  return null;
};

export const isValidConsultationPreferredDay = (
  day: number | null | undefined,
): day is number => typeof day === "number" && day >= 1 && day <= 31;

const normalizeDay = (day: number): number | null =>
  isValidConsultationPreferredDay(day) ? day : null;

export const formatConsultationPreferredDayLabel = (
  value?: string | null,
): string | null => {
  const day = parseConsultationPreferredDay(value);
  if (!day) return null;
  return `Dia ${day}`;
};

export const formatConsultationPreferredDay = formatConsultationPreferredDayLabel;

export const toConsultationPreferredDayStorage = (
  day: number | null | undefined,
): string => {
  if (!isValidConsultationPreferredDay(day)) return "";
  return String(day);
};

export const toConsultationPreferredDateStorage = toConsultationPreferredDayStorage;

export const defaultConsultationPreferredDay = (): number => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.getDate();
};

export const defaultConsultationPreferredDate = defaultConsultationPreferredDay;

export const parseConsultationPreferredDate = parseConsultationPreferredDay;
