/**
 * Tipos relacionados a Saldo e Balanço Financeiro
 */

/**
 * Balanço financeiro
 */
export interface Balance {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  period: BalancePeriod;
}

/**
 * Período do balanço
 */
export interface BalancePeriod {
  startDate: Date;
  endDate: Date;
  label: string; // "Janeiro 2026", "Últimos 30 dias", etc
}

/**
 * Balanço mensal
 */
export interface MonthlyBalance extends Balance {
  month: number; // 1-12
  year: number;
  daysInMonth: number;
  dailyAverage: number;
}

/**
 * Balanço diário
 */
export interface DailyBalance extends Balance {
  date: Date;
  dayOfWeek: string;
  transactionCount: number;
}

/**
 * Evolução do balanço (para gráficos)
 */
export interface BalanceEvolution {
  date: string; // YYYY-MM-DD
  income: number;
  expense: number;
  balance: number;
  cumulativeBalance: number;
}

/**
 * Comparação de períodos
 */
export interface BalanceComparison {
  current: Balance;
  previous: Balance;
  difference: number;
  percentageChange: number;
  trend: 'up' | 'down' | 'stable';
}

/**
 * Estatísticas financeiras
 */
export interface FinancialStats {
  currentMonth: MonthlyBalance;
  previousMonth: MonthlyBalance;
  yearToDate: Balance;
  last30Days: Balance;
  last7Days: Balance;
  today: DailyBalance;
}

/**
 * Tipo de período predefinido
 */
export type PredefinedPeriod = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'last_30_days'
  | 'last_90_days'
  | 'all_time';

/**
 * Obter datas de um período predefinido
 */
export interface PredefinedPeriodDates {
  startDate: Date;
  endDate: Date;
  label: string;
}

export default Balance;
