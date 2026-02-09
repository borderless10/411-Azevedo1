/**
 * Serviço para gerenciar Rendas (Incomes)
 */

import {
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import {
  getIncomesCollection,
  getIncomeDoc,
  convertIncomeFromFirestore,
  convertIncomeToFirestore,
  getDocData,
} from '../lib/firestore';
import {
  Income,
  CreateIncomeData,
  UpdateIncomeData,
  IncomeFilters,
  IncomeSummary,
  IncomeByDate,
} from '../types/income';
import { formatDateToString } from '../utils/dateUtils';
import { formatCurrency } from '../utils/currencyUtils';
import { activityServices } from './activityServices';

/**
 * Validar dados de criação de renda
 */
const validateCreateIncomeData = (data: CreateIncomeData): string[] => {
  const errors: string[] = [];

  if (!data.value || data.value <= 0) {
    errors.push('Valor deve ser maior que zero');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('Descrição é obrigatória');
  }

  if (data.description && data.description.trim().length < 3) {
    errors.push('Descrição deve ter pelo menos 3 caracteres');
  }

  if (!data.date) {
    errors.push('Data é obrigatória');
  }

  if (data.date && data.date > new Date()) {
    errors.push('Data não pode ser no futuro');
  }

  return errors;
};

/**
 * Validar dados de atualização de renda
 */
const validateUpdateIncomeData = (data: UpdateIncomeData): string[] => {
  const errors: string[] = [];

  if (data.value !== undefined && data.value <= 0) {
    errors.push('Valor deve ser maior que zero');
  }

  if (data.description !== undefined && data.description.trim().length < 3) {
    errors.push('Descrição deve ter pelo menos 3 caracteres');
  }

  if (data.date && data.date > new Date()) {
    errors.push('Data não pode ser no futuro');
  }

  return errors;
};

/**
 * Serviço de Rendas
 */
export const incomeServices = {
  /**
   * Criar uma nova renda
   */
  async createIncome(
    userId: string,
    data: CreateIncomeData
  ): Promise<Income> {
    console.log('💰 [INCOME SERVICE] Criando renda...');
    console.log('💰 [INCOME SERVICE] Dados:', data);

    // Validar dados
    const errors = validateCreateIncomeData(data);
    if (errors.length > 0) {
      console.error('❌ [INCOME SERVICE] Erros de validação:', errors);
      throw new Error(errors.join(', '));
    }

    try {
      const now = new Date();
      const incomeData = {
        userId,
        value: data.value,
        description: data.description.trim(),
        date: Timestamp.fromDate(data.date),
        category: data.category || 'Outros',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      const docRef = await addDoc(getIncomesCollection(), incomeData);
      console.log('✅ [INCOME SERVICE] Renda criada com ID:', docRef.id);

      const income: Income = {
        id: docRef.id,
        userId,
        value: data.value,
        description: data.description.trim(),
        date: data.date,
        category: data.category,
        createdAt: now,
        updatedAt: now,
      };

      // Registrar atividade
      await activityServices.logActivity(userId, {
        type: 'income_created',
        title: data.description.trim(),
        description: `Renda de ${formatCurrency(data.value)}`,
        metadata: {
          amount: data.value,
          category: data.category,
        },
      });

      return income;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao criar renda:', error);
      throw error;
    }
  },

  /**
   * Buscar rendas do usuário
   */
  async getIncomes(
    userId: string,
    filters?: IncomeFilters
  ): Promise<Income[]> {
    console.log('💰 [INCOME SERVICE] Buscando rendas...');
    console.log('💰 [INCOME SERVICE] Filtros:', filters);

    try {
      // Buscar todas as rendas do usuário (evita problemas de índice)
      let q = query(
        getIncomesCollection(),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      console.log('💰 [INCOME SERVICE] Encontradas', snapshot.size, 'rendas no total');

      // Converter todos os documentos
      let incomes = snapshot.docs.map((doc) =>
        convertIncomeFromFirestore(getDocData(doc))
      );

      // Aplicar filtros no cliente (mais confiável)
      if (filters?.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        incomes = incomes.filter((income) => {
          const incomeDate = new Date(income.date);
          incomeDate.setHours(0, 0, 0, 0);
          return incomeDate >= startDate;
        });
        console.log('💰 [INCOME SERVICE] Após filtrar por data inicial:', incomes.length, 'rendas');
      }

      if (filters?.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        incomes = incomes.filter((income) => {
          const incomeDate = new Date(income.date);
          return incomeDate <= endDate;
        });
        console.log('💰 [INCOME SERVICE] Após filtrar por data final:', incomes.length, 'rendas');
      }

      if (filters?.category) {
        incomes = incomes.filter((income) => income.category === filters.category);
        console.log('💰 [INCOME SERVICE] Após filtrar por categoria:', incomes.length, 'rendas');
      }

      if (filters?.minValue) {
        incomes = incomes.filter((income) => income.value >= filters.minValue!);
      }

      if (filters?.maxValue) {
        incomes = incomes.filter((income) => income.value <= filters.maxValue!);
      }

      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        incomes = incomes.filter((income) =>
          income.description.toLowerCase().includes(searchLower)
        );
      }

      // Ordenar por data (mais recente primeiro)
      incomes.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log('💰 [INCOME SERVICE] Total final de rendas:', incomes.length);
      return incomes;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao buscar rendas:', error);
      throw error;
    }
  },

  /**
   * Buscar renda por ID
   */
  async getIncomeById(id: string): Promise<Income | null> {
    console.log('💰 [INCOME SERVICE] Buscando renda por ID:', id);

    try {
      const docRef = getIncomeDoc(id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('⚠️ [INCOME SERVICE] Renda não encontrada');
        return null;
      }

      const income = convertIncomeFromFirestore(getDocData(docSnap));
      console.log('✅ [INCOME SERVICE] Renda encontrada:', income);
      return income;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao buscar renda:', error);
      throw error;
    }
  },

  /**
   * Atualizar renda
   */
  async updateIncome(
    id: string,
    data: UpdateIncomeData
  ): Promise<Income> {
    console.log('💰 [INCOME SERVICE] Atualizando renda:', id);
    console.log('💰 [INCOME SERVICE] Novos dados:', data);

    // Validar dados
    const errors = validateUpdateIncomeData(data);
    if (errors.length > 0) {
      console.error('❌ [INCOME SERVICE] Erros de validação:', errors);
      throw new Error(errors.join(', '));
    }

    try {
      const docRef = getIncomeDoc(id);
      const updateData = convertIncomeToFirestore({
        ...data,
        updatedAt: new Date(),
      });

      await updateDoc(docRef, updateData as any);
      console.log('✅ [INCOME SERVICE] Renda atualizada');

      // Buscar renda atualizada
      const updated = await this.getIncomeById(id);
      if (!updated) {
        throw new Error('Erro ao buscar renda atualizada');
      }

      return updated;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao atualizar renda:', error);
      throw error;
    }
  },

  /**
   * Deletar renda
   */
  async deleteIncome(id: string): Promise<void> {
    console.log('💰 [INCOME SERVICE] Deletando renda:', id);

    try {
      // Buscar renda antes de deletar para registrar atividade
      const income = await this.getIncomeById(id);
      
      const docRef = getIncomeDoc(id);
      await deleteDoc(docRef);
      console.log('✅ [INCOME SERVICE] Renda deletada');

      // Registrar atividade
      if (income) {
        await activityServices.logActivity(income.userId, {
          type: 'income_deleted',
          title: `Renda removida: ${income.description}`,
          description: formatCurrency(income.value),
          metadata: {
            amount: income.value,
            category: income.category,
          },
        });
      }
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao deletar renda:', error);
      throw error;
    }
  },

  /**
   * Buscar rendas por data específica
   */
  async getIncomesByDate(userId: string, date: Date): Promise<Income[]> {
    console.log('💰 [INCOME SERVICE] Buscando rendas do dia:', date);

    try {
      // Criar range do dia (00:00 até 23:59)
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        getIncomesCollection(),
        where('userId', '==', userId),
        where('date', '>=', Timestamp.fromDate(startOfDay)),
        where('date', '<=', Timestamp.fromDate(endOfDay)),
        orderBy('date', 'desc')
      );

      const snapshot = await getDocs(q);
      const incomes = snapshot.docs.map((doc) =>
        convertIncomeFromFirestore(getDocData(doc))
      );

      console.log('💰 [INCOME SERVICE] Rendas do dia:', incomes.length);
      return incomes;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao buscar rendas por data:', error);
      throw error;
    }
  },

  /**
   * Calcular total de rendas
   */
  async getIncomesTotal(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    console.log('💰 [INCOME SERVICE] Calculando total de rendas...');

    try {
      const incomes = await this.getIncomes(userId, {
        startDate,
        endDate,
      });

      const total = incomes.reduce((sum, income) => sum + income.value, 0);
      console.log('💰 [INCOME SERVICE] Total calculado:', total);

      return total;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao calcular total:', error);
      throw error;
    }
  },

  /**
   * Obter resumo de rendas
   */
  async getIncomesSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IncomeSummary> {
    console.log('💰 [INCOME SERVICE] Gerando resumo de rendas...');

    try {
      const incomes = await this.getIncomes(userId, {
        startDate,
        endDate,
      });

      const total = incomes.reduce((sum, income) => sum + income.value, 0);
      const count = incomes.length;
      const average = count > 0 ? total / count : 0;

      // Agrupar por categoria
      const byCategory: Record<string, number> = {};
      incomes.forEach((income) => {
        const category = income.category || 'Outros';
        byCategory[category] = (byCategory[category] || 0) + income.value;
      });

      const summary: IncomeSummary = {
        total,
        count,
        average,
        byCategory,
      };

      console.log('💰 [INCOME SERVICE] Resumo gerado:', summary);
      return summary;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao gerar resumo:', error);
      throw error;
    }
  },

  /**
   * Agrupar rendas por data
   */
  async getIncomesGroupedByDate(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<IncomeByDate[]> {
    console.log('💰 [INCOME SERVICE] Agrupando rendas por data...');

    try {
      const incomes = await this.getIncomes(userId, {
        startDate,
        endDate,
      });

      // Agrupar por data
      const grouped: Record<string, Income[]> = {};
      incomes.forEach((income) => {
        const dateKey = formatDateToString(income.date);
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(income);
      });

      // Converter para array e calcular totais
      const result: IncomeByDate[] = Object.entries(grouped).map(
        ([date, incomes]) => ({
          date,
          incomes,
          total: incomes.reduce((sum, income) => sum + income.value, 0),
        })
      );

      // Ordenar por data (mais recente primeiro)
      result.sort((a, b) => b.date.localeCompare(a.date));

      console.log('💰 [INCOME SERVICE] Rendas agrupadas:', result.length, 'dias');
      return result;
    } catch (error) {
      console.error('❌ [INCOME SERVICE] Erro ao agrupar rendas:', error);
      throw error;
    }
  },

  /**
   * Buscar últimas rendas
   */
  async getRecentIncomes(
    userId: string,
    limitCount: number = 10
  ): Promise<Income[]> {
    console.log('💰 [INCOME SERVICE] Buscando últimas', limitCount, 'rendas');

    try {
      // Buscar todas as rendas e ordenar no cliente (evita necessidade de índice composto)
      const q = query(
        getIncomesCollection(),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      let incomes = snapshot.docs.map((doc) =>
        convertIncomeFromFirestore(getDocData(doc))
      );

      // Ordenar por data de criação (mais recente primeiro) e limitar
      incomes = incomes
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limitCount);

      console.log('💰 [INCOME SERVICE] Rendas recentes:', incomes.length);
      return incomes;
    } catch (error: any) {
      console.error('❌ [INCOME SERVICE] Erro ao buscar rendas recentes:', error);
      // Se houver erro de índice, retornar array vazio
      if (error?.code === 'failed-precondition') {
        console.warn('⚠️ [INCOME SERVICE] Índice não encontrado, retornando array vazio');
        return [];
      }
      throw error;
    }
  },
};

export default incomeServices;
