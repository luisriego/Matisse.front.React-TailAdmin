export type ExpectedExpenseFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly"
  | string;
export type ExpectedExpenseAmountKind = "fixed" | "variable";

export interface ExpectedExpenseCreateOrUpdate {
  displayName: string;
  frequency: ExpectedExpenseFrequency;
  amountKind: ExpectedExpenseAmountKind;
  dueDay: number;
}

/** Bloco reenviado em ofx-confirm como `expectedExpense`. */
export interface ExpectedExpenseConfirmPayload {
  recurringExpenseId?: string | null;
  createOrUpdate?: ExpectedExpenseCreateOrUpdate;
}

export interface ExpectedExpenseRecord {
  id: string;
  displayName: string;
  expenseTypeId: string;
  expenseTypeCode: string;
  frequency: ExpectedExpenseFrequency;
  monthsOfYear: number[];
  amountKind: ExpectedExpenseAmountKind;
  lastAmountCents: number | null;
  dueDay: number | null;
  isActive: boolean;
  lastReconciledMonth: string | null;
}
