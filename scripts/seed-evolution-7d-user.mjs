/**
 * Popula incomes/expenses dos últimos 7 dias para o usuário de dev,
 * no formato que o app grava (como se o cliente tivesse lançado).
 *
 * Uso: node scripts/seed-evolution-7d-user.mjs
 * Não altera regras/lógica — só grava documentos no Firestore.
 */
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const PROJECT_ID = "visao-cce8f";
const USER_ID = "0jnooNRpZhMAeuE9z2e6YbQ2ErK2";
const CARD_ID = "Fh4BeQjPniP2NVuyfpoq";
const CARD_LAST4 = "1234";
const CARD_BEST_DAY = 3;
const SEED_BATCH = "evolution-7d-2026-11-18";

const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const admin = require("firebase-admin");

const cliConfig = JSON.parse(
  readFileSync(
    path.join(os.homedir(), ".config/configstore/firebase-tools.json"),
    "utf8",
  ),
);
const adcPath = path.join(os.tmpdir(), "visao-adc-seed-evolution.json");
writeFileSync(
  adcPath,
  JSON.stringify({
    client_id:
      "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: cliConfig.tokens.refresh_token,
    type: "authorized_user",
  }),
  { mode: 0o600 },
);
process.env.GOOGLE_APPLICATION_CREDENTIALS = adcPath;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const db = admin.firestore();
const { Timestamp } = admin.firestore;

const atLocalNoon = (daysAgo) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
};

const invoiceKeyForPurchase = (purchaseDate, bestDay) => {
  const day = Math.min(31, Math.max(1, Number(bestDay) || 1));
  const y = purchaseDate.getFullYear();
  const m = purchaseDate.getMonth();
  if (purchaseDate.getDate() < day) {
    return `${y}-${String(m + 1).padStart(2, "0")}`;
  }
  const next = new Date(y, m + 1, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};

const stamp = (date) => Timestamp.fromDate(date);

/** Plano diário: variação clara renda x gasto no gráfico Evolução (histórico geral). */
const DAY_PLAN = [
  // daysAgo, incomes[], expenses[]
  {
    daysAgo: 6,
    incomes: [
      {
        value: 180,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "venda de bolo",
      },
      { value: 120, description: "Freela pontual", category: "Freelancer" },
    ],
    expenses: [
      {
        value: 45,
        description: "Almoço",
        category: "Alimentação",
        paymentMethod: "pix",
      },
      {
        value: 32,
        description: "Uber centro",
        category: "Transporte",
        paymentMethod: "pix",
      },
      {
        value: 28,
        description: "Mercado",
        category: "Acompanhamento Diário",
        paymentMethod: "cash",
        isTrackedDaily: true,
      },
    ],
  },
  {
    daysAgo: 5,
    incomes: [
      {
        value: 220,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "Bolo de pote",
      },
    ],
    expenses: [
      {
        value: 89,
        description: "Mercado semanal",
        category: "Alimentação",
        paymentMethod: "debit_card",
      },
      {
        value: 55,
        description: "Farmácia",
        category: "Saúde",
        paymentMethod: "pix",
      },
      {
        value: 40,
        description: "Uber",
        category: "Acompanhamento Diário",
        paymentMethod: "credit_card",
        isTrackedDaily: true,
        cardId: CARD_ID,
      },
    ],
  },
  {
    daysAgo: 4,
    incomes: [
      { value: 150, description: "Venda de equipamento", category: "Venda" },
    ],
    expenses: [
      {
        value: 60,
        description: "Jantar",
        category: "Alimentação",
        paymentMethod: "credit_card",
        cardId: CARD_ID,
      },
      {
        value: 25,
        description: "Café e padaria",
        category: "Consumo Moderado",
        paymentMethod: "cash",
        isConsumoModerado: true,
      },
    ],
  },
  {
    daysAgo: 3,
    incomes: [
      {
        value: 260,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "encomenda",
      },
      { value: 80, description: "Cashback", category: "Outros" },
    ],
    expenses: [
      {
        value: 120,
        description: "Compras casa",
        category: "Compras",
        paymentMethod: "pix",
      },
      {
        value: 70,
        description: "Combustível",
        category: "Transporte",
        paymentMethod: "debit_card",
      },
      {
        value: 35,
        description: "Mercado",
        category: "Acompanhamento Diário",
        paymentMethod: "credit_card",
        isTrackedDaily: true,
        cardId: CARD_ID,
      },
    ],
  },
  {
    daysAgo: 2,
    incomes: [
      {
        value: 90,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "venda de bolo",
      },
    ],
    expenses: [
      {
        value: 95,
        description: "Cinema e lanche",
        category: "Lazer",
        paymentMethod: "credit_card",
        cardId: CARD_ID,
      },
      {
        value: 48,
        description: "Delivery",
        category: "Alimentação",
        paymentMethod: "pix",
      },
      {
        value: 18,
        description: "Lanche rápido",
        category: "Consumo Moderado",
        paymentMethod: "cash",
        isConsumoModerado: true,
      },
    ],
  },
  {
    daysAgo: 1,
    incomes: [
      {
        value: 240,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "Bolo de pote",
      },
    ],
    expenses: [
      {
        value: 55,
        description: "Uber aeroporto",
        category: "Transporte",
        paymentMethod: "pix",
      },
      {
        value: 42,
        description: "Mercado",
        category: "Acompanhamento Diário",
        paymentMethod: "cash",
        isTrackedDaily: true,
      },
      {
        value: 30,
        description: "Material escritório",
        category: "Serviços",
        paymentMethod: "pix",
      },
    ],
  },
  {
    daysAgo: 0,
    incomes: [
      {
        value: 200,
        description: "Salário",
        category: "Acompanhamento Diário",
        dailyTracking: true,
        origin: "encomenda",
      },
      { value: 50, description: "Presente recebido", category: "Presente" },
    ],
    expenses: [
      {
        value: 75,
        description: "Supermercado",
        category: "Alimentação",
        paymentMethod: "debit_card",
      },
      {
        value: 50,
        description: "Uber",
        category: "Acompanhamento Diário",
        paymentMethod: "credit_card",
        isTrackedDaily: true,
        cardId: CARD_ID,
      },
      {
        value: 38,
        description: "Farmácia",
        category: "Saúde",
        paymentMethod: "pix",
      },
    ],
  },
];

const buildExpenseDoc = (item, when) => {
  const paymentMethod = item.paymentMethod || "cash";
  const createdAt = new Date(when.getTime() + 5 * 60 * 1000);
  const doc = {
    userId: USER_ID,
    value: item.value,
    description: item.description.trim(),
    date: stamp(when),
    category: item.category,
    paymentMethod,
    createdAt: stamp(createdAt),
    updatedAt: stamp(createdAt),
    seedBatch: SEED_BATCH,
  };
  if (item.isConsumoModerado) doc.isConsumoModerado = true;
  if (item.isTrackedDaily) doc.isTrackedDaily = true;
  if (paymentMethod === "credit_card" && item.cardId) {
    doc.cardId = item.cardId;
    doc.cardLast4 = CARD_LAST4;
    doc.invoiceYearMonth = invoiceKeyForPurchase(when, CARD_BEST_DAY);
  }
  return doc;
};

const buildIncomeDoc = (item, when) => {
  const createdAt = new Date(when.getTime() + 2 * 60 * 1000);
  const doc = {
    userId: USER_ID,
    value: item.value,
    description: item.description.trim(),
    date: stamp(when),
    category: item.category || "Outros",
    dailyTracking: Boolean(item.dailyTracking),
    createdAt: stamp(createdAt),
    updatedAt: stamp(createdAt),
    seedBatch: SEED_BATCH,
  };
  if (item.origin) doc.origin = String(item.origin).trim();
  return doc;
};

try {
  // Evita duplicar o mesmo batch se rodar de novo
  const [oldExp, oldInc] = await Promise.all([
    db.collection("expenses").where("seedBatch", "==", SEED_BATCH).get(),
    db.collection("incomes").where("seedBatch", "==", SEED_BATCH).get(),
  ]);
  if (!oldExp.empty || !oldInc.empty) {
    const batch = db.batch();
    oldExp.docs.forEach((d) => batch.delete(d.ref));
    oldInc.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(
      `Removidos seeds anteriores: ${oldExp.size} gastos, ${oldInc.size} rendas`,
    );
  }

  let incomeCount = 0;
  let expenseCount = 0;
  const writer = db.batch();

  for (const day of DAY_PLAN) {
    const when = atLocalNoon(day.daysAgo);
    for (const income of day.incomes) {
      writer.set(db.collection("incomes").doc(), buildIncomeDoc(income, when));
      incomeCount += 1;
    }
    for (const expense of day.expenses) {
      writer.set(
        db.collection("expenses").doc(),
        buildExpenseDoc(expense, when),
      );
      expenseCount += 1;
    }
  }

  // Renda "Show" do plano (não diária), dentro do ciclo — alinhada ao expectedIncomes.
  writer.set(
    db.collection("incomes").doc(),
    buildIncomeDoc(
      {
        value: 3000,
        description: "Show",
        category: "Show",
        dailyTracking: false,
      },
      atLocalNoon(10),
    ),
  );
  incomeCount += 1;

  await writer.commit();

  // Home Evolução: todas as rendas + gastos do histórico geral (sem CM/acompanhamento).
  const chartIncomeAll = DAY_PLAN.reduce(
    (sum, d) => sum + d.incomes.reduce((s, i) => s + i.value, 0),
    0,
  );
  const chartExpense = DAY_PLAN.reduce(
    (sum, d) =>
      sum +
      d.expenses
        .filter((e) => !e.isTrackedDaily && !e.isConsumoModerado)
        .filter((e) => {
          const c = String(e.category || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          return (
            c !== "consumo moderado" &&
            c !== "acompanhamento diario" &&
            c !== "gasto acompanhado"
          );
        })
        .reduce((s, e) => s + e.value, 0),
    0,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        userId: USER_ID,
        seedBatch: SEED_BATCH,
        created: { incomes: incomeCount, expenses: expenseCount },
        chartApprox7d: {
          incomeTotal: chartIncomeAll,
          expenseTotalGeneralHistory: chartExpense,
          note: "Home Evolução usa todas as rendas + gastos sem seção (CM/acompanhamento)",
        },
        days: DAY_PLAN.map((d) => ({
          date: atLocalNoon(d.daysAgo).toISOString().slice(0, 10),
          income: d.incomes.reduce((s, i) => s + i.value, 0),
          expenseGeneral: d.expenses
            .filter((e) => !e.isTrackedDaily && !e.isConsumoModerado)
            .reduce((s, e) => s + e.value, 0),
        })),
      },
      null,
      2,
    ),
  );
} finally {
  try {
    unlinkSync(adcPath);
  } catch {
    // ignore
  }
}
