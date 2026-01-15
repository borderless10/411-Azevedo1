/**
 * Utilitários para trabalhar com datas
 */

import { PredefinedPeriod, PredefinedPeriodDates } from '../types/balance';

/**
 * Formatar data para string YYYY-MM-DD
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formatar data para exibição (DD/MM/YYYY)
 */
export const formatDateForDisplay = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formatar data para exibição com nome do mês
 */
export const formatDateWithMonthName = (date: Date): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} de ${month} de ${year}`;
};

/**
 * Obter nome do mês
 */
export const getMonthName = (monthIndex: number): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[monthIndex];
};

/**
 * Obter nome do dia da semana
 */
export const getDayOfWeekName = (date: Date): string => {
  const days = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  return days[date.getDay()];
};

/**
 * Obter nome curto do dia da semana
 */
export const getShortDayName = (date: Date): string => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[date.getDay()];
};

/**
 * Verificar se é hoje
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDateToString(date) === formatDateToString(today);
};

/**
 * Verificar se é ontem
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateToString(date) === formatDateToString(yesterday);
};

/**
 * Obter primeiro dia do mês
 */
export const getFirstDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

/**
 * Obter último dia do mês
 */
export const getLastDayOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

/**
 * Obter primeiro dia do ano
 */
export const getFirstDayOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 0, 1);
};

/**
 * Obter último dia do ano
 */
export const getLastDayOfYear = (date: Date): Date => {
  return new Date(date.getFullYear(), 11, 31);
};

/**
 * Adicionar dias a uma data
 */
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/**
 * Subtrair dias de uma data
 */
export const subtractDays = (date: Date, days: number): Date => {
  return addDays(date, -days);
};

/**
 * Adicionar meses a uma data
 */
export const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

/**
 * Subtrair meses de uma data
 */
export const subtractMonths = (date: Date, months: number): Date => {
  return addMonths(date, -months);
};

/**
 * Obter início do dia (00:00:00)
 */
export const getStartOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

/**
 * Obter fim do dia (23:59:59)
 */
export const getEndOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

/**
 * Obter datas de um período predefinido
 */
export const getPredefinedPeriodDates = (
  period: PredefinedPeriod
): PredefinedPeriodDates => {
  const today = new Date();
  const startOfToday = getStartOfDay(today);
  const endOfToday = getEndOfDay(today);
  
  switch (period) {
    case 'today':
      return {
        startDate: startOfToday,
        endDate: endOfToday,
        label: 'Hoje',
      };
      
    case 'yesterday':
      return {
        startDate: getStartOfDay(subtractDays(today, 1)),
        endDate: getEndOfDay(subtractDays(today, 1)),
        label: 'Ontem',
      };
      
    case 'this_week': {
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Segunda-feira
      const monday = subtractDays(today, diff);
      return {
        startDate: getStartOfDay(monday),
        endDate: endOfToday,
        label: 'Esta Semana',
      };
    }
      
    case 'last_week': {
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const lastMonday = subtractDays(today, diff + 7);
      const lastSunday = addDays(lastMonday, 6);
      return {
        startDate: getStartOfDay(lastMonday),
        endDate: getEndOfDay(lastSunday),
        label: 'Semana Passada',
      };
    }
      
    case 'this_month':
      return {
        startDate: getFirstDayOfMonth(today),
        endDate: endOfToday,
        label: `${getMonthName(today.getMonth())} ${today.getFullYear()}`,
      };
      
    case 'last_month': {
      const lastMonth = subtractMonths(today, 1);
      return {
        startDate: getFirstDayOfMonth(lastMonth),
        endDate: getLastDayOfMonth(lastMonth),
        label: `${getMonthName(lastMonth.getMonth())} ${lastMonth.getFullYear()}`,
      };
    }
      
    case 'this_year':
      return {
        startDate: getFirstDayOfYear(today),
        endDate: endOfToday,
        label: `${today.getFullYear()}`,
      };
      
    case 'last_year': {
      const lastYear = new Date(today.getFullYear() - 1, 0, 1);
      return {
        startDate: getFirstDayOfYear(lastYear),
        endDate: getLastDayOfYear(lastYear),
        label: `${lastYear.getFullYear()}`,
      };
    }
      
    case 'last_30_days':
      return {
        startDate: getStartOfDay(subtractDays(today, 30)),
        endDate: endOfToday,
        label: 'Últimos 30 dias',
      };
      
    case 'last_90_days':
      return {
        startDate: getStartOfDay(subtractDays(today, 90)),
        endDate: endOfToday,
        label: 'Últimos 90 dias',
      };
      
    case 'all_time':
      return {
        startDate: new Date(2000, 0, 1),
        endDate: endOfToday,
        label: 'Todos os períodos',
      };
      
    default:
      return {
        startDate: startOfToday,
        endDate: endOfToday,
        label: 'Hoje',
      };
  }
};

/**
 * Obter label de data amigável
 */
export const getFriendlyDateLabel = (date: Date): string => {
  if (isToday(date)) return 'Hoje';
  if (isYesterday(date)) return 'Ontem';
  
  const daysDiff = Math.floor(
    (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysDiff < 7) {
    return getDayOfWeekName(date);
  }
  
  return formatDateForDisplay(date);
};

export default {
  formatDateToString,
  formatDateForDisplay,
  formatDateWithMonthName,
  getMonthName,
  getDayOfWeekName,
  getShortDayName,
  isToday,
  isYesterday,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getFirstDayOfYear,
  getLastDayOfYear,
  addDays,
  subtractDays,
  addMonths,
  subtractMonths,
  getStartOfDay,
  getEndOfDay,
  getPredefinedPeriodDates,
  getFriendlyDateLabel,
};
