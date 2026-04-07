/**
 * Serviço para gerenciar Gastos (Expenses)
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
} from "firebase/firestore";
import {
  getExpensesCollection,
  getExpenseDoc,
  convertExpenseFromFirestore,
  convertExpenseToFirestore,
  getDocData,
} from "../lib/firestore";
import {
  Expense,
  CreateExpenseData,
  UpdateExpenseData,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseByDate,
  ExpenseByCategory,
} from "../types/expense";
import { formatDateToString } from "../utils/dateUtils";
import { formatCurrency } from "../utils/currencyUtils";
import { activityServices } from "./activityServices";
import { creditCardServices } from "./creditCardServices";
import { toExpenseCategoryLookupKey } from "../types/category";

/**
 * Validar dados de criação de gasto
 */
const validateCreateExpenseData = (data: CreateExpenseData): string[] => {
  const errors: string[] = [];

  if (!data.value || data.value <= 0) {
    errors.push("Valor deve ser maior que zero");
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push("Descrição é obrigatória");
  }

  if (data.description && data.description.trim().length < 3) {
    errors.push("Descrição deve ter pelo menos 3 caracteres");
  }

  if (!data.date) {
    errors.push("Data é obrigatória");
  }

  if (data.date && data.date > new Date()) {
    errors.push("Data não pode ser no futuro");
  }

  if (!data.category || data.category.trim().length === 0) {
    errors.push("Categoria é obrigatória");
  }

  if (data.paymentMethod === "credit_card" && !data.cardId) {
    errors.push("Selecione um cartão para despesas no crédito");
  }

  return errors;
};

/**
 * Validar dados de atualização de gasto
 */
const validateUpdateExpenseData = (data: UpdateExpenseData): string[] => {
  const errors: string[] = [];

  if (data.value !== undefined && data.value <= 0) {
    errors.push("Valor deve ser maior que zero");
  }

  if (data.description !== undefined && data.description.trim().length < 3) {
    errors.push("Descrição deve ter pelo menos 3 caracteres");
  }

  if (data.date && data.date > new Date()) {
    errors.push("Data não pode ser no futuro");
  }

  if (data.category !== undefined && data.category.trim().length === 0) {
    errors.push("Categoria é obrigatória");
  }

  return errors;
};

/**
 * Serviço de Gastos
 */
export const expenseServices = {
  /**
   * Criar um novo gasto
   */
  async createExpense(
    userId: string,
    data: CreateExpenseData,
  ): Promise<Expense> {
    console.log("💸 [EXPENSE SERVICE] Criando gasto...");
    console.log("💸 [EXPENSE SERVICE] Dados:", data);

    // Validar dados
    const errors = validateCreateExpenseData(data);
    if (errors.length > 0) {
      console.error("❌ [EXPENSE SERVICE] Erros de validação:", errors);
      throw new Error(errors.join(", "));
    }

    try {
      const now = new Date();
      const paymentMethod = data.paymentMethod || "cash";
      let cardLast4: string | undefined;
      let invoiceYearMonth: string | undefined;

      if (paymentMethod === "credit_card" && data.cardId) {
        const card = await creditCardServices.getCreditCardById(data.cardId);
        if (!card || card.userId !== userId) {
          throw new Error("Cartão não encontrado para este usuário");
        }
        cardLast4 = card.last4;
        // Normalize purchase date to midday to avoid timezone shifts affecting day comparison
        const purchaseDate = new Date(data.date);
        purchaseDate.setHours(12, 0, 0, 0);
        invoiceYearMonth = creditCardServices.getInvoiceKeyForPurchase(
          purchaseDate,
          card.bestDay,
        );
      }

      const expenseData: Record<string, any> = {
        userId,
        value: data.value,
        description: data.description.trim(),
        date: Timestamp.fromDate(data.date),
        category: data.category,
        paymentMethod,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      if (paymentMethod === "credit_card" && data.cardId) {
        expenseData.cardId = data.cardId;
        expenseData.cardLast4 = cardLast4;
        expenseData.invoiceYearMonth = invoiceYearMonth;
        console.log(
          "💸 [EXPENSE SERVICE] Invoice key computed:",
          invoiceYearMonth,
          "cardId:",
          data.cardId,
        );
      }

      if (data.isAutoDebitPayment) {
        expenseData.isAutoDebitPayment = true;
      }

      if (data.autoDebitInvoiceKey) {
        expenseData.autoDebitInvoiceKey = data.autoDebitInvoiceKey;
      }

      const docRef = await addDoc(getExpensesCollection(), expenseData);
      console.log("✅ [EXPENSE SERVICE] Gasto criado com ID:", docRef.id);

      const expense: Expense = {
        id: docRef.id,
        userId,
        value: data.value,
        description: data.description.trim(),
        date: data.date,
        category: data.category,
        paymentMethod,
        ...(paymentMethod === "credit_card" && data.cardId
          ? {
              cardId: data.cardId,
              cardLast4,
              invoiceYearMonth,
            }
          : {}),
        ...(data.isAutoDebitPayment ? { isAutoDebitPayment: true } : {}),
        ...(data.autoDebitInvoiceKey
          ? { autoDebitInvoiceKey: data.autoDebitInvoiceKey }
          : {}),
        createdAt: now,
        updatedAt: now,
      };

      // Registrar atividade
      await activityServices.logActivity(userId, {
        type: "expense_created",
        title: data.description.trim(),
        description: `Gasto de ${formatCurrency(data.value)}`,
        metadata: {
          amount: data.value,
          category: data.category,
        },
      });

      return expense;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao criar gasto:", error);
      throw error;
    }
  },

  /**
   * Buscar gastos do usuário
   */
  async getExpenses(
    userId: string,
    filters?: ExpenseFilters,
  ): Promise<Expense[]> {
    console.log("💸 [EXPENSE SERVICE] Buscando gastos...");
    console.log("💸 [EXPENSE SERVICE] Filtros:", filters);

    try {
      // Buscar todos os gastos do usuário (evita problemas de índice)
      let q = query(getExpensesCollection(), where("userId", "==", userId));

      const snapshot = await getDocs(q);
      console.log(
        "💸 [EXPENSE SERVICE] Encontrados",
        snapshot.size,
        "gastos no total",
      );

      // Converter todos os documentos
      let expenses = snapshot.docs.map((doc) =>
        convertExpenseFromFirestore(getDocData(doc)),
      );

      // Aplicar filtros no cliente (mais confiável)
      if (filters?.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        expenses = expenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          expenseDate.setHours(0, 0, 0, 0);
          return expenseDate >= startDate;
        });
        console.log(
          "💸 [EXPENSE SERVICE] Após filtrar por data inicial:",
          expenses.length,
          "gastos",
        );
      }

      if (filters?.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        expenses = expenses.filter((expense) => {
          const expenseDate = new Date(expense.date);
          return expenseDate <= endDate;
        });
        console.log(
          "💸 [EXPENSE SERVICE] Após filtrar por data final:",
          expenses.length,
          "gastos",
        );
      }

      if (filters?.category) {
        const targetCategoryKey = toExpenseCategoryLookupKey(filters.category);
        expenses = expenses.filter(
          (expense) =>
            toExpenseCategoryLookupKey(expense.category) === targetCategoryKey,
        );
        console.log(
          "💸 [EXPENSE SERVICE] Após filtrar por categoria:",
          expenses.length,
          "gastos",
        );
      }

      if (filters?.paymentMethod) {
        expenses = expenses.filter(
          (expense) => expense.paymentMethod === filters.paymentMethod,
        );
      }

      if (filters?.cardId) {
        expenses = expenses.filter(
          (expense) => expense.cardId === filters.cardId,
        );
      }

      if (filters?.invoiceYearMonth) {
        expenses = expenses.filter(
          (expense) => expense.invoiceYearMonth === filters.invoiceYearMonth,
        );
      }

      if (filters?.categories && filters.categories.length > 0) {
        const categoryKeys = new Set(
          filters.categories.map((category) =>
            toExpenseCategoryLookupKey(category),
          ),
        );
        expenses = expenses.filter((expense) =>
          categoryKeys.has(toExpenseCategoryLookupKey(expense.category)),
        );
      }

      if (filters?.minValue) {
        expenses = expenses.filter(
          (expense) => expense.value >= filters.minValue!,
        );
      }

      if (filters?.maxValue) {
        expenses = expenses.filter(
          (expense) => expense.value <= filters.maxValue!,
        );
      }

      if (filters?.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        expenses = expenses.filter((expense) =>
          expense.description.toLowerCase().includes(searchLower),
        );
      }

      // Ordenar por data (mais recente primeiro)
      expenses.sort((a, b) => b.date.getTime() - a.date.getTime());

      console.log(
        "💸 [EXPENSE SERVICE] Total final de gastos:",
        expenses.length,
      );
      return expenses;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao buscar gastos:", error);
      throw error;
    }
  },

  /**
   * Buscar gasto por ID
   */
  async getExpenseById(id: string): Promise<Expense | null> {
    console.log("💸 [EXPENSE SERVICE] Buscando gasto por ID:", id);

    try {
      const docRef = getExpenseDoc(id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log("⚠️ [EXPENSE SERVICE] Gasto não encontrado");
        return null;
      }

      const expense = convertExpenseFromFirestore(getDocData(docSnap));
      console.log("✅ [EXPENSE SERVICE] Gasto encontrado:", expense);
      return expense;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao buscar gasto:", error);
      throw error;
    }
  },

  /**
   * Atualizar gasto
   */
  async updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
    console.log("💸 [EXPENSE SERVICE] Atualizando gasto:", id);
    console.log("💸 [EXPENSE SERVICE] Novos dados:", data);

    // Validar dados
    const errors = validateUpdateExpenseData(data);
    if (errors.length > 0) {
      console.error("❌ [EXPENSE SERVICE] Erros de validação:", errors);
      throw new Error(errors.join(", "));
    }

    try {
      const current = await this.getExpenseById(id);
      if (!current) {
        throw new Error("Gasto não encontrado");
      }

      const mergedPaymentMethod =
        data.paymentMethod || current.paymentMethod || "cash";
      const mergedDate = data.date || current.date;
      const mergedCardId =
        data.cardId !== undefined ? data.cardId : current.cardId;

      const normalizedData: Record<string, any> = {
        ...data,
        paymentMethod: mergedPaymentMethod,
      };

      if (mergedPaymentMethod === "credit_card") {
        if (!mergedCardId) {
          throw new Error("Selecione um cartão para despesas no crédito");
        }
        const card = await creditCardServices.getCreditCardById(mergedCardId);
        if (!card || card.userId !== current.userId) {
          throw new Error("Cartão não encontrado para este usuário");
        }

        normalizedData.cardId = mergedCardId;
        normalizedData.cardLast4 = card.last4;
        // Normalize merged date to midday to avoid timezone shifts
        const normalizedDate = new Date(mergedDate);
        normalizedDate.setHours(12, 0, 0, 0);
        normalizedData.invoiceYearMonth =
          creditCardServices.getInvoiceKeyForPurchase(
            normalizedDate,
            card.bestDay,
          );
        console.log(
          "💸 [EXPENSE SERVICE] Invoice key computed (update):",
          normalizedData.invoiceYearMonth,
          "bestDay:",
          card.bestDay,
        );
      } else {
        normalizedData.cardId = null;
        normalizedData.cardLast4 = null;
        normalizedData.invoiceYearMonth = null;
      }

      const docRef = getExpenseDoc(id);
      const updateData = convertExpenseToFirestore({
        ...normalizedData,
        updatedAt: new Date(),
      });

      await updateDoc(docRef, updateData as any);
      console.log("✅ [EXPENSE SERVICE] Gasto atualizado");

      // Buscar gasto atualizado
      const updated = await this.getExpenseById(id);
      if (!updated) {
        throw new Error("Erro ao buscar gasto atualizado");
      }

      return updated;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao atualizar gasto:", error);
      throw error;
    }
  },

  /**
   * Deletar gasto
   */
  async deleteExpense(id: string): Promise<void> {
    console.log("💸 [EXPENSE SERVICE] Deletando gasto:", id);

    try {
      // Buscar gasto antes de deletar para registrar atividade
      const expense = await this.getExpenseById(id);

      const docRef = getExpenseDoc(id);
      await deleteDoc(docRef);
      console.log("✅ [EXPENSE SERVICE] Gasto deletado");

      // Registrar atividade
      if (expense) {
        await activityServices.logActivity(expense.userId, {
          type: "expense_deleted",
          title: `Gasto removido: ${expense.description}`,
          description: formatCurrency(expense.value),
          metadata: {
            amount: expense.value,
            category: expense.category,
          },
        });
      }
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao deletar gasto:", error);
      throw error;
    }
  },

  /**
   * Buscar gastos por data específica
   */
  async getExpensesByDate(userId: string, date: Date): Promise<Expense[]> {
    console.log("💸 [EXPENSE SERVICE] Buscando gastos do dia:", date);

    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        getExpensesCollection(),
        where("userId", "==", userId),
        where("date", ">=", Timestamp.fromDate(startOfDay)),
        where("date", "<=", Timestamp.fromDate(endOfDay)),
        orderBy("date", "desc"),
      );

      const snapshot = await getDocs(q);
      const expenses = snapshot.docs.map((doc) =>
        convertExpenseFromFirestore(getDocData(doc)),
      );

      console.log("💸 [EXPENSE SERVICE] Gastos do dia:", expenses.length);
      return expenses;
    } catch (error) {
      console.error(
        "❌ [EXPENSE SERVICE] Erro ao buscar gastos por data:",
        error,
      );
      throw error;
    }
  },

  /**
   * Calcular total de gastos
   */
  async getExpensesTotal(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<number> {
    console.log("💸 [EXPENSE SERVICE] Calculando total de gastos...");

    try {
      const expenses = await this.getExpenses(userId, {
        startDate,
        endDate,
      });

      const total = expenses.reduce((sum, expense) => sum + expense.value, 0);
      console.log("💸 [EXPENSE SERVICE] Total calculado:", total);

      return total;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao calcular total:", error);
      throw error;
    }
  },

  /**
   * Obter resumo de gastos
   */
  async getExpensesSummary(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExpenseSummary> {
    console.log("💸 [EXPENSE SERVICE] Gerando resumo de gastos...");

    try {
      const expenses = await this.getExpenses(userId, {
        startDate,
        endDate,
      });

      const total = expenses.reduce((sum, expense) => sum + expense.value, 0);
      const count = expenses.length;
      const average = count > 0 ? total / count : 0;

      // Agrupar por categoria
      const byCategory: Record<string, number> = {};
      expenses.forEach((expense) => {
        byCategory[expense.category] =
          (byCategory[expense.category] || 0) + expense.value;
      });

      const summary: ExpenseSummary = {
        total,
        count,
        average,
        byCategory,
      };

      console.log("💸 [EXPENSE SERVICE] Resumo gerado:", summary);
      return summary;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao gerar resumo:", error);
      throw error;
    }
  },

  /**
   * Agrupar gastos por data
   */
  async getExpensesGroupedByDate(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExpenseByDate[]> {
    console.log("💸 [EXPENSE SERVICE] Agrupando gastos por data...");

    try {
      const expenses = await this.getExpenses(userId, {
        startDate,
        endDate,
      });

      // Agrupar por data
      const grouped: Record<string, Expense[]> = {};
      expenses.forEach((expense) => {
        const dateKey = formatDateToString(expense.date);
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(expense);
      });

      // Converter para array e calcular totais
      const result: ExpenseByDate[] = Object.entries(grouped).map(
        ([date, expenses]) => ({
          date,
          expenses,
          total: expenses.reduce((sum, expense) => sum + expense.value, 0),
        }),
      );

      // Ordenar por data (mais recente primeiro)
      result.sort((a, b) => b.date.localeCompare(a.date));

      console.log(
        "💸 [EXPENSE SERVICE] Gastos agrupados:",
        result.length,
        "dias",
      );
      return result;
    } catch (error) {
      console.error("❌ [EXPENSE SERVICE] Erro ao agrupar gastos:", error);
      throw error;
    }
  },

  /**
   * Agrupar gastos por categoria
   */
  async getExpensesGroupedByCategory(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExpenseByCategory[]> {
    console.log("💸 [EXPENSE SERVICE] Agrupando gastos por categoria...");

    try {
      const expenses = await this.getExpenses(userId, {
        startDate,
        endDate,
      });

      // Agrupar por categoria
      const grouped: Record<string, Expense[]> = {};
      expenses.forEach((expense) => {
        if (!grouped[expense.category]) {
          grouped[expense.category] = [];
        }
        grouped[expense.category].push(expense);
      });

      const total = expenses.reduce((sum, expense) => sum + expense.value, 0);

      // Converter para array e calcular totais
      const result: ExpenseByCategory[] = Object.entries(grouped).map(
        ([category, expenses]) => ({
          category,
          expenses,
          total: expenses.reduce((sum, expense) => sum + expense.value, 0),
          percentage:
            total > 0
              ? (expenses.reduce((sum, expense) => sum + expense.value, 0) /
                  total) *
                100
              : 0,
        }),
      );

      // Ordenar por total (maior primeiro)
      result.sort((a, b) => b.total - a.total);

      console.log(
        "💸 [EXPENSE SERVICE] Gastos agrupados por categoria:",
        result.length,
      );
      return result;
    } catch (error) {
      console.error(
        "❌ [EXPENSE SERVICE] Erro ao agrupar gastos por categoria:",
        error,
      );
      throw error;
    }
  },

  /**
   * Buscar últimos gastos
   */
  async getRecentExpenses(
    userId: string,
    limitCount: number = 10,
  ): Promise<Expense[]> {
    console.log("💸 [EXPENSE SERVICE] Buscando últimos", limitCount, "gastos");

    try {
      // Buscar todos os gastos e ordenar no cliente (evita necessidade de índice composto)
      const q = query(getExpensesCollection(), where("userId", "==", userId));

      const snapshot = await getDocs(q);
      let expenses = snapshot.docs.map((doc) =>
        convertExpenseFromFirestore(getDocData(doc)),
      );

      // Ordenar por data de criação (mais recente primeiro) e limitar
      expenses = expenses
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limitCount);

      console.log("💸 [EXPENSE SERVICE] Gastos recentes:", expenses.length);
      return expenses;
    } catch (error: any) {
      console.error(
        "❌ [EXPENSE SERVICE] Erro ao buscar gastos recentes:",
        error,
      );
      // Se houver erro de índice, retornar array vazio
      if (error?.code === "failed-precondition") {
        console.warn(
          "⚠️ [EXPENSE SERVICE] Índice não encontrado, retornando array vazio",
        );
        return [];
      }
      throw error;
    }
  },
};

export default expenseServices;
