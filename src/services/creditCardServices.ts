import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import {
  convertCreditCardFromFirestore,
  convertCreditCardToFirestore,
  convertExpenseFromFirestore,
  getCreditCardDoc,
  getCreditCardsCollection,
  getDocData,
  getExpensesCollection,
} from "../lib/firestore";
import {
  CreditCard,
  CreateCreditCardData,
  CreditCardInvoiceSummary,
  UpdateCreditCardData,
} from "../types/creditCard";
import {
  getDueDateForInvoiceKey,
  getInvoiceKeyForPurchase,
  getInvoiceLabel,
  toInvoiceKey,
} from "../utils/creditCardUtils";

const validateLast4 = (last4: string): boolean => /^\d{4}$/.test(last4);

// card day can be 1-31 when storing day+month
const validateCardDay = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 31;

// invoice day must be between 1-28
const validateInvoiceDay = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 28;

// bestDay allowed up to 31 as requested
const validateBestDay = (day: number): boolean =>
  Number.isInteger(day) && day >= 1 && day <= 31;

const validateMonth = (m: number): boolean =>
  Number.isInteger(m) && m >= 1 && m <= 12;

const validateYear = (y: number): boolean =>
  Number.isInteger(y) && y >= 2000 && y <= 2100;

const normalizeCreatePayload = (data: CreateCreditCardData) => {
  if (!data.bank || data.bank.trim().length < 2) {
    throw new Error("Banco inválido");
  }
  if (!validateLast4(data.last4)) {
    throw new Error("Os 4 dígitos finais devem conter exatamente 4 números");
  }
  if (!validateCardDay(data.cardDueDay)) {
    throw new Error("Vencimento do cartão (dia) inválido");
  }
  if (!validateMonth((data as any).cardExpiryMonth)) {
    throw new Error("Vencimento do cartão (mês) inválido");
  }
  if (!validateYear((data as any).cardExpiryYear)) {
    throw new Error("Vencimento do cartão (ano) inválido");
  }
  if (!validateInvoiceDay(data.invoiceDueDay)) {
    throw new Error("Vencimento da fatura deve estar entre 1 e 28");
  }
  if (!Number.isFinite(data.limit) || data.limit <= 0) {
    throw new Error("Limite inválido");
  }

  return {
    bank: data.bank.trim(),
    last4: data.last4,
    bestDay: data.bestDay,
    cardDueDay: data.cardDueDay,
    cardExpiryMonth: (data as any).cardExpiryMonth || 1,
    cardExpiryYear: (data as any).cardExpiryYear || new Date().getFullYear(),
    invoiceDueDay: data.invoiceDueDay,
    limit: data.limit,
    autoDebit: !!data.autoDebit,
  };
};

export const creditCardServices = {
  async createCreditCard(
    userId: string,
    data: CreateCreditCardData,
  ): Promise<CreditCard> {
    const payload = normalizeCreatePayload(data);
    const now = new Date();

    const docRef = await addDoc(getCreditCardsCollection(), {
      userId,
      ...payload,
      isActive: true,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    return {
      id: docRef.id,
      userId,
      ...payload,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getCreditCards(userId: string): Promise<CreditCard[]> {
    const q = query(getCreditCardsCollection(), where("userId", "==", userId));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((doc) => convertCreditCardFromFirestore(getDocData(doc) as any))
      .map((card) => ({ ...card, id: (card as any).id || "" }))
      .map((card, idx) => ({
        ...card,
        id: snapshot.docs[idx].id,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async getCreditCardById(cardId: string): Promise<CreditCard | null> {
    const snap = await getDoc(getCreditCardDoc(cardId));
    if (!snap.exists()) return null;
    const card = convertCreditCardFromFirestore(getDocData(snap) as any);
    return {
      ...card,
      id: snap.id,
    };
  },

  async updateCreditCard(
    cardId: string,
    data: UpdateCreditCardData,
  ): Promise<void> {
    const payload: Record<string, any> = {
      updatedAt: Timestamp.now(),
    };

    if (data.bank !== undefined) {
      if (!data.bank || data.bank.trim().length < 2) {
        throw new Error("Banco inválido");
      }
      payload.bank = data.bank.trim();
    }

    if (data.last4 !== undefined) {
      if (!validateLast4(data.last4)) {
        throw new Error(
          "Os 4 dígitos finais devem conter exatamente 4 números",
        );
      }
      payload.last4 = data.last4;
    }

    if (data.bestDay !== undefined) {
      if (!validateBestDay(data.bestDay)) {
        throw new Error("Melhor dia deve estar entre 1 e 31");
      }
      payload.bestDay = data.bestDay;
    }

    if (data.cardDueDay !== undefined) {
      if (!validateCardDay(data.cardDueDay)) {
        throw new Error("Vencimento do cartão (dia) inválido");
      }
      payload.cardDueDay = data.cardDueDay;
    }

    if ((data as any).cardExpiryMonth !== undefined) {
      if (!validateMonth((data as any).cardExpiryMonth)) {
        throw new Error("Vencimento do cartão (mês) inválido");
      }
      payload.cardExpiryMonth = (data as any).cardExpiryMonth;
    }

    if ((data as any).cardExpiryYear !== undefined) {
      if (!validateYear((data as any).cardExpiryYear)) {
        throw new Error("Vencimento do cartão (ano) inválido");
      }
      payload.cardExpiryYear = (data as any).cardExpiryYear;
    }

    if (data.invoiceDueDay !== undefined) {
      if (!validateInvoiceDay(data.invoiceDueDay)) {
        throw new Error("Vencimento da fatura deve estar entre 1 e 28");
      }
      payload.invoiceDueDay = data.invoiceDueDay;
    }

    if (data.limit !== undefined) {
      if (!Number.isFinite(data.limit) || data.limit <= 0) {
        throw new Error("Limite inválido");
      }
      payload.limit = data.limit;
    }

    if (data.autoDebit !== undefined) {
      payload.autoDebit = !!data.autoDebit;
    }

    if (data.isActive !== undefined) {
      payload.isActive = !!data.isActive;
    }

    if (data.lastAutoDebitInvoiceKey !== undefined) {
      payload.lastAutoDebitInvoiceKey = data.lastAutoDebitInvoiceKey;
    }

    await updateDoc(getCreditCardDoc(cardId), payload);
  },

  async deleteCreditCard(cardId: string): Promise<void> {
    await deleteDoc(getCreditCardDoc(cardId));
  },

  async getInvoiceSummaries(
    userId: string,
  ): Promise<CreditCardInvoiceSummary[]> {
    const [cards, expensesSnap] = await Promise.all([
      this.getCreditCards(userId),
      getDocs(query(getExpensesCollection(), where("userId", "==", userId))),
    ]);

    const activeCards = cards.filter((card) => card.isActive !== false);
    const expenses = expensesSnap.docs.map((doc) => {
      const e = convertExpenseFromFirestore(getDocData(doc) as any);
      return { ...e, id: doc.id } as any;
    });

    const invoiceMap = new Map<string, CreditCardInvoiceSummary>();

    activeCards.forEach((card) => {
      const cardExpenses = expenses.filter(
        (expense) =>
          expense.paymentMethod === "credit_card" &&
          expense.cardId === card.id &&
          !!expense.invoiceYearMonth,
      );

      const groupedByInvoice = new Map<string, typeof cardExpenses>();

      cardExpenses.forEach((expense) => {
        const key = String(expense.invoiceYearMonth);
        if (!groupedByInvoice.has(key)) {
          groupedByInvoice.set(key, []);
        }
        groupedByInvoice.get(key)!.push(expense);
      });

      groupedByInvoice.forEach((items, invoiceKey) => {
        const entryKey = `${card.id}:${invoiceKey}`;
        const total = items.reduce((acc, item) => acc + (item.value || 0), 0);
        const dueDate = getDueDateForInvoiceKey(invoiceKey, card.invoiceDueDay);

        invoiceMap.set(entryKey, {
          invoiceKey,
          invoiceLabel: getInvoiceLabel(invoiceKey),
          dueDate,
          total,
          cardId: card.id,
          cardLabel: `${card.bank} ••••${card.last4}`,
          expenseCount: items.length,
          expenses: items
            .slice()
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((item) => ({
              id: item.id,
              description: item.description,
              date: item.date,
              amount: item.value,
            })),
        });
      });
    });

    return Array.from(invoiceMap.values()).sort(
      (a, b) => b.dueDate.getTime() - a.dueDate.getTime(),
    );
  },

  async runAutoDebitForUser(
    userId: string,
    runDate: Date = new Date(),
  ): Promise<void> {
    const today = new Date(runDate);
    today.setHours(0, 0, 0, 0);

    const cards = (await this.getCreditCards(userId)).filter(
      (card) => card.isActive !== false && card.autoDebit,
    );

    if (cards.length === 0) return;

    const expensesSnap = await getDocs(
      query(getExpensesCollection(), where("userId", "==", userId)),
    );
    const expenses = expensesSnap.docs.map((doc) => {
      const expense = convertExpenseFromFirestore(getDocData(doc) as any);
      return { ...expense, id: doc.id } as any;
    });

    const dueInvoiceDate = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    const dueInvoiceKey = toInvoiceKey(dueInvoiceDate);

    for (const card of cards) {
      if (today.getDate() !== card.invoiceDueDay) {
        continue;
      }

      if (card.lastAutoDebitInvoiceKey === dueInvoiceKey) {
        continue;
      }

      const invoiceTotal = expenses
        .filter(
          (expense) =>
            expense.paymentMethod === "credit_card" &&
            expense.cardId === card.id &&
            expense.invoiceYearMonth === dueInvoiceKey,
        )
        .reduce((acc, expense) => acc + (expense.value || 0), 0);

      const alreadyCreated = expenses.some(
        (expense) =>
          expense.isAutoDebitPayment === true &&
          expense.cardId === card.id &&
          expense.autoDebitInvoiceKey === dueInvoiceKey,
      );

      if (invoiceTotal > 0 && !alreadyCreated) {
        await addDoc(getExpensesCollection(), {
          userId,
          value: invoiceTotal,
          description: `Fatura ${card.bank} ••••${card.last4} (${dueInvoiceKey})`,
          date: Timestamp.fromDate(today),
          category: "Cartão de Crédito",
          paymentMethod: "other",
          cardId: card.id,
          cardLast4: card.last4,
          isAutoDebitPayment: true,
          autoDebitInvoiceKey: dueInvoiceKey,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        });
      }

      await this.updateCreditCard(card.id, {
        lastAutoDebitInvoiceKey: dueInvoiceKey,
      });
    }
  },

  getInvoiceKeyForPurchase,
};

export default creditCardServices;
