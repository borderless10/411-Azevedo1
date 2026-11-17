export type OpeningExpenseKind = "consumption" | "tracked";

export interface OpeningExpenseEntry {
  kind: OpeningExpenseKind;
  title: string;
  amount: number;
}