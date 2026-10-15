import assert from "node:assert/strict";
import { test } from "node:test";
import { matchesClientSearch } from "./clientSearch.ts";
import {
  incomeValueError,
  isPersistableTrackedZero,
  normalizeIncomeOrigin,
} from "./incomeEntry.ts";
import {
  clientSeesOverdueHighlight,
  consultantSeesOverdue,
  dueDateLabel,
  isAutomaticallyOverdue,
  openObligationDueDate,
  restartPlanningBill,
} from "./planningBillRules.ts";

const day = (year: number, month: number, date: number) =>
  new Date(year, month - 1, date, 12, 0, 0, 0);

test("quatro combinações de recorrência e vencimento", () => {
  const now = day(2026, 3, 15);
  const cases = [
    { recurring: true, dueDay: 10, dueDate: day(2026, 3, 10) },
    { recurring: true, dueDay: undefined, dueDate: null },
    { recurring: false, dueDay: 20, dueDate: day(2026, 3, 20) },
    { recurring: false, dueDay: undefined, dueDate: null },
  ];
  for (const entry of cases) {
    const restarted = restartPlanningBill(
      { ...entry, status: "pending", dueDay: entry.dueDay ?? null },
      day(2026, 3, 1),
      now,
    );
    assert.equal(restarted.recurring, entry.recurring);
    if (!entry.dueDay && !entry.dueDate) {
      assert.equal(restarted.dueDate, null);
      assert.equal(dueDateLabel(entry, now), "Sem vencimento");
    }
  }
});

test("conta sem vencimento não ganha data no reinício", () => {
  const now = day(2026, 4, 2);
  const restarted = restartPlanningBill(
    { recurring: true, status: "pending", markedOverdue: true },
    day(2026, 4, 1),
    now,
  );
  assert.equal(restarted.dueDate, null);
  assert.equal(restarted.dueDay, undefined);
  assert.equal(openObligationDueDate(restarted, now), null);
  assert.equal(dueDateLabel(restarted, now), "Sem vencimento");
});

test("conta vencida e não paga preserva a data", () => {
  const original = day(2026, 1, 5);
  const now = day(2026, 3, 20);
  const restarted = restartPlanningBill(
    {
      recurring: true,
      dueDay: 5,
      dueDate: original,
      status: "overdue",
    },
    day(2026, 3, 1),
    now,
  );
  assert.equal(restarted.dueDate?.getTime(), new Date(2026, 0, 5).setHours(0, 0, 0, 0));
  assert.equal(restarted.status, "overdue");
  assert.equal(isAutomaticallyOverdue(restarted, now), true);
});

test("marca manual fica com o consultor e some para o cliente sem data", () => {
  const now = day(2026, 5, 10);
  const bill = { markedOverdue: true, status: "pending" as const };
  assert.equal(consultantSeesOverdue(bill, now), true);
  assert.equal(clientSeesOverdueHighlight(bill, now), false);
  const cleared = { ...bill, markedOverdue: false, dueDate: day(2026, 5, 1) };
  assert.equal(isAutomaticallyOverdue(cleared, now), true);
  assert.equal(clientSeesOverdueHighlight(cleared, now), true);
});

test("atraso automático: passado, hoje e sem data", () => {
  const now = day(2026, 6, 15);
  assert.equal(
    isAutomaticallyOverdue({ dueDate: day(2026, 6, 14), status: "pending" }, now),
    true,
  );
  assert.equal(
    isAutomaticallyOverdue({ dueDate: day(2026, 6, 15), status: "pending" }, now),
    false,
  );
  assert.equal(isAutomaticallyOverdue({ status: "pending" }, now), false);
  assert.equal(
    isAutomaticallyOverdue(
      { dueDate: day(2026, 6, 1), status: "paid", paidDate: now },
      now,
    ),
    false,
  );
});

test("reinício preserva pendente, avança recorrente paga e não reativa inativa", () => {
  const now = day(2026, 8, 20);
  const cycle = day(2026, 8, 1);
  const pending = restartPlanningBill(
    { dueDate: day(2026, 7, 3), dueDay: 3, status: "pending", recurring: true },
    cycle,
    now,
  );
  assert.equal(pending.dueDate?.getMonth(), 6);

  const paid = restartPlanningBill(
    {
      dueDate: day(2026, 7, 31),
      dueDay: 31,
      status: "paid",
      paidDate: day(2026, 7, 31),
      recurring: true,
      markedOverdue: true,
    },
    cycle,
    now,
  );
  assert.equal(paid.dueDate?.getMonth(), 7);
  assert.equal(paid.dueDate?.getDate(), 31);
  assert.equal(paid.markedOverdue, false);
  assert.equal(paid.status, "pending");

  const again = restartPlanningBill(paid, cycle, now);
  assert.equal(again.dueDate?.getTime(), paid.dueDate?.getTime());

  const inactive = restartPlanningBill(
    {
      inactive: true,
      status: "paid",
      paidDate: day(2026, 7, 1),
      dueDate: day(2026, 7, 1),
      dueDay: 1,
    },
    cycle,
    now,
  );
  assert.equal(inactive.inactive, true);
  assert.equal(inactive.status, "paid");
});

test("fevereiro recebe o último dia quando o vencimento é 31", () => {
  const restarted = restartPlanningBill(
    {
      recurring: true,
      dueDay: 31,
      status: "paid",
      paidDate: day(2026, 1, 31),
    },
    day(2026, 2, 1),
    day(2026, 2, 10),
  );
  assert.equal(restarted.dueDate?.getDate(), 28);
  assert.equal(restarted.dueDate?.getMonth(), 1);
});

test("busca de clientes", () => {
  const client = {
    nickname: "Zé",
    name: "José Almeida",
    email: "contato@exemplo.com",
  };
  assert.equal(matchesClientSearch(client, ""), true);
  assert.equal(matchesClientSearch(client, "zé"), true);
  assert.equal(matchesClientSearch(client, "Almeida"), true);
  assert.equal(matchesClientSearch(client, "CONTATO@"), true);
  assert.equal(matchesClientSearch(client, "Marina"), false);
  assert.equal(matchesClientSearch(client, "Marina", "Marina Costa"), true);
  assert.equal(matchesClientSearch(client, "jose"), false);
  assert.equal(matchesClientSearch(client, "josé"), true);
});

test("renda zero e origem", () => {
  assert.equal(isPersistableTrackedZero(0, true), true);
  assert.equal(incomeValueError(0, true), "");
  assert.equal(incomeValueError(0, false), "Valor deve ser maior que zero");
  assert.equal(incomeValueError(null, true), "Valor é obrigatório");
  assert.equal(normalizeIncomeOrigin("  venda de bolo  "), "venda de bolo");
  assert.equal(normalizeIncomeOrigin("   "), "");
  assert.equal(normalizeIncomeOrigin("á".repeat(90)).length, 80);
});
