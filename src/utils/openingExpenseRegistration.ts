import expenseServices from "../services/expenseServices";
import budgetServices from "../services/budgetServices";
import { OpeningExpenseEntry } from "../types/openingExpense";

export async function registerOpeningExpenses(
  userId: string,
  date: Date,
  entries: OpeningExpenseEntry[],
  options?: { coupleMember?: 1 | 2; reconcileConsumo?: boolean },
): Promise<{ hadConsumo: boolean }> {
  const coupleFields =
    options?.coupleMember === 1 || options?.coupleMember === 2
      ? { coupleMember: options.coupleMember }
      : {};

  let hadConsumo = false;

  for (const row of entries) {
    const amount = Number(row.amount) || 0;
    if (amount <= 0) continue;
    const title = row.title.trim() || "Gasto do dia";

    if (row.kind === "consumption") {
      hadConsumo = true;
      await expenseServices.createExpense(userId, {
        value: amount,
        description: title,
        date,
        category: "Consumo Moderado",
        paymentMethod: "other",
        isConsumoModerado: true,
        ...coupleFields,
      });
    } else {
      await expenseServices.createExpense(userId, {
        value: amount,
        description: title,
        date,
        category: "Acompanhamento Diário",
        paymentMethod: "other",
        isTrackedDaily: true,
        ...coupleFields,
      });
    }
  }

  if (hadConsumo && options?.reconcileConsumo !== false) {
    await budgetServices.reconcileConsumoModeradoDay(
      userId,
      date,
      coupleFields.coupleMember,
    );
  }

  return { hadConsumo };
}