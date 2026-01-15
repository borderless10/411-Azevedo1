/**
 * Utilitários para trabalhar com moeda (Real Brasileiro)
 */

/**
 * Formatar número para moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Formatar número para moeda sem o símbolo
 */
export const formatCurrencyWithoutSymbol = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Converter string de moeda para número
 * Ex: "R$ 1.234,56" -> 1234.56
 */
export const parseCurrency = (value: string): number => {
  const cleaned = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Aplicar máscara de moeda enquanto digita
 * Ex: 123456 -> "R$ 1.234,56"
 */
export const applyCurrencyMask = (value: string): string => {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, '');
  
  if (!numbers) return 'R$ 0,00';
  
  // Converte para número e divide por 100 (centavos)
  const amount = parseFloat(numbers) / 100;
  
  return formatCurrency(amount);
};

/**
 * Remover máscara de moeda
 * Ex: "R$ 1.234,56" -> "123456"
 */
export const removeCurrencyMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Validar se é um valor monetário válido
 */
export const isValidCurrency = (value: string): boolean => {
  const parsed = parseCurrency(value);
  return !isNaN(parsed) && parsed >= 0;
};

/**
 * Formatar valor com sinal (+ ou -)
 */
export const formatCurrencyWithSign = (
  value: number,
  type: 'income' | 'expense'
): string => {
  const formatted = formatCurrency(Math.abs(value));
  return type === 'income' ? `+ ${formatted}` : `- ${formatted}`;
};

/**
 * Formatar valor compacto (1.234.567 -> 1,2M)
 */
export const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1).replace('.', ',')}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(1).replace('.', ',')}K`;
  }
  return formatCurrency(value);
};

/**
 * Calcular porcentagem
 */
export const calculatePercentage = (
  value: number,
  total: number
): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Formatar porcentagem
 */
export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1).replace('.', ',')}%`;
};

/**
 * Calcular e formatar porcentagem
 */
export const formatPercentageOf = (
  value: number,
  total: number
): string => {
  const percentage = calculatePercentage(value, total);
  return formatPercentage(percentage);
};

/**
 * Calcular diferença percentual entre dois valores
 */
export const calculatePercentageChange = (
  oldValue: number,
  newValue: number
): number => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Formatar diferença com sinal
 */
export const formatDifference = (difference: number): string => {
  const sign = difference >= 0 ? '+' : '';
  return `${sign}${formatCurrency(difference)}`;
};

/**
 * Formatar diferença percentual com sinal
 */
export const formatPercentageDifference = (difference: number): string => {
  const sign = difference >= 0 ? '+' : '';
  return `${sign}${formatPercentage(difference)}`;
};

/**
 * Arredondar para duas casas decimais
 */
export const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

/**
 * Somar valores monetários (evita problemas de precisão)
 */
export const sumCurrency = (...values: number[]): number => {
  const sum = values.reduce((acc, val) => acc + val, 0);
  return roundToTwoDecimals(sum);
};

/**
 * Obter cor baseada no tipo de transação
 */
export const getTransactionColor = (type: 'income' | 'expense'): string => {
  return type === 'income' ? '#4CAF50' : '#F44336';
};

/**
 * Obter cor baseada no saldo (positivo/negativo)
 */
export const getBalanceColor = (balance: number): string => {
  if (balance > 0) return '#4CAF50'; // Verde
  if (balance < 0) return '#F44336'; // Vermelho
  return '#666'; // Cinza
};

export default {
  formatCurrency,
  formatCurrencyWithoutSymbol,
  parseCurrency,
  applyCurrencyMask,
  removeCurrencyMask,
  isValidCurrency,
  formatCurrencyWithSign,
  formatCurrencyCompact,
  calculatePercentage,
  formatPercentage,
  formatPercentageOf,
  calculatePercentageChange,
  formatDifference,
  formatPercentageDifference,
  roundToTwoDecimals,
  sumCurrency,
  getTransactionColor,
  getBalanceColor,
};
