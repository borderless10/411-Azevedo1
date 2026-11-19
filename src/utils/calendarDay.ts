/**
 * Comparação e normalização por dia civil (timezone local do dispositivo).
 * Evita rejeitar "hoje" por causa de hora (ex.: meio-dia vs agora de manhã).
 */

/** YYYY-MM-DD no calendário local */
export const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Normaliza para meio-dia local (evita deslocar o dia civil em UTC).
 * Adequado para America/Sao_Paulo e demais timezones locais do dispositivo.
 */
export const normalizeToLocalMidday = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  return result;
};

/**
 * True só se o dia civil da data for depois do dia civil de referência (hoje).
 * Ignora hora: "hoje 23:59" e "hoje 00:00" não são futuro.
 */
export const isFutureCalendarDay = (
  date: Date,
  reference: Date = new Date(),
): boolean => {
  return toLocalDateKey(date) > toLocalDateKey(reference);
};
