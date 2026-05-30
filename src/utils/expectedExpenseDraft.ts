import type {
  ExpectedExpenseAmountKind,
  ExpectedExpenseConfirmPayload,
  ExpectedExpenseCreateOrUpdate,
  ExpectedExpenseFrequency,
} from "../types/expectedExpenseApi";
import type { DraftLine } from "./ofxPreviewDrafts";

/** Valores enviados ao backend em `createOrUpdate.frequency`. */
export type ExpectedExpenseFrequencyOption =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly";

export const EXPECTED_EXPENSE_FREQUENCY_OPTIONS: Array<{
  value: ExpectedExpenseFrequencyOption;
  label: string;
}> = [
  { value: "monthly", label: "Mensal" },
  { value: "bimonthly", label: "Bimestral" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

export function frequencyOptionLabel(freq: string): string {
  const hit = EXPECTED_EXPENSE_FREQUENCY_OPTIONS.find((o) => o.value === freq);
  if (hit) return hit.label;
  if (freq === "none" || !freq) return "Pontual";
  return freq;
}

function dueDayFromPostedAt(postedAt: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(postedAt.trim());
  if (!m) return 1;
  const day = Number(m[3]);
  return day >= 1 && day <= 31 ? day : 1;
}

function normalizeFrequency(raw: string): ExpectedExpenseFrequencyOption {
  const n = raw.trim().toLowerCase().replace(/-/g, "_");
  if (n === "bimonthly" || n === "bi_monthly" || n === "every_two_months") return "bimonthly";
  if (n === "quarterly" || n === "trimestral") return "quarterly";
  if (n === "yearly" || n === "annual" || n === "anual") return "yearly";
  return "monthly";
}

function guessFrequencyFromContext(memo: string, expenseTypeLabel?: string): ExpectedExpenseFrequencyOption | null {
  const hay = `${memo} ${expenseTypeLabel ?? ""}`.toLowerCase();
  if (/jardin|paisag|podas?/.test(hay)) return "bimonthly";
  return null;
}

/** Inicializa bloco editável a partir do preview + memo. */
export function buildInitialExpectedExpenseEdit(
  draft: Pick<DraftLine, "memo" | "postedAt" | "suggestedExpectedExpense" | "recurringExpenseId">,
  expenseTypeLabel?: string,
): ExpectedExpenseConfirmPayload | null {
  const suggested = draft.suggestedExpectedExpense;
  if (suggested?.recurringExpenseId && !suggested.createOrUpdate) {
    return { recurringExpenseId: suggested.recurringExpenseId };
  }
  const baseName =
    suggested?.createOrUpdate?.displayName?.trim() ||
    expenseTypeLabel?.trim() ||
    draft.memo.trim().slice(0, 80) ||
    "Despesa";
  const cu = suggested?.createOrUpdate;
  const guessed = guessFrequencyFromContext(draft.memo, expenseTypeLabel);
  const createOrUpdate: ExpectedExpenseCreateOrUpdate = {
    displayName: baseName,
    frequency: cu?.frequency
      ? normalizeFrequency(String(cu.frequency))
      : guessed ?? "monthly",
    amountKind: cu?.amountKind === "fixed" ? "fixed" : "variable",
    dueDay: cu?.dueDay ?? dueDayFromPostedAt(draft.postedAt),
  };
  if (draft.recurringExpenseId.trim()) {
    return { recurringExpenseId: draft.recurringExpenseId.trim(), createOrUpdate };
  }
  return { createOrUpdate };
}

export function resolveFrequencyFromDraft(draft: DraftLine): ExpectedExpenseFrequencyOption | "none" {
  if (!draft.isExpectedExpense) return "none";
  if (draft.expectedExpenseEdit?.recurringExpenseId && !draft.expectedExpenseEdit.createOrUpdate) {
    return "monthly";
  }
  const f = draft.expectedExpenseEdit?.createOrUpdate?.frequency;
  if (!f) return "monthly";
  return normalizeFrequency(String(f));
}

export function patchDraftForFrequency(
  draft: DraftLine,
  frequency: ExpectedExpenseFrequencyOption | "none",
  expenseTypeLabel?: string,
): Partial<DraftLine> {
  if (frequency === "none") {
    return { isExpectedExpense: false, expectedExpenseEdit: null };
  }
  const existing = draft.expectedExpenseEdit ?? buildInitialExpectedExpenseEdit(draft, expenseTypeLabel);
  const cu = existing?.createOrUpdate ?? buildInitialExpectedExpenseEdit(draft, expenseTypeLabel)?.createOrUpdate;
  if (!cu) {
    return { isExpectedExpense: true, expectedExpenseEdit: buildInitialExpectedExpenseEdit(draft, expenseTypeLabel) };
  }
  return {
    isExpectedExpense: true,
    expectedExpenseEdit: {
      recurringExpenseId: existing?.recurringExpenseId,
      createOrUpdate: {
        ...cu,
        frequency: frequency as ExpectedExpenseFrequency,
      },
    },
  };
}

export function patchDraftForAmountKind(
  draft: DraftLine,
  amountKind: ExpectedExpenseAmountKind,
  expenseTypeLabel?: string,
): Partial<DraftLine> {
  if (!draft.isExpectedExpense) return {};
  const base = draft.expectedExpenseEdit ?? buildInitialExpectedExpenseEdit(draft, expenseTypeLabel);
  if (!base?.createOrUpdate) return {};
  return {
    expectedExpenseEdit: {
      ...base,
      createOrUpdate: { ...base.createOrUpdate, amountKind },
    },
  };
}

export function buildExpectedExpenseConfirmPayload(draft: DraftLine): {
  isExpectedExpense: boolean;
  expectedExpense?: ExpectedExpenseConfirmPayload;
} {
  if (!draft.isExpectedExpense) {
    return { isExpectedExpense: false };
  }
  const edit = draft.expectedExpenseEdit ?? buildInitialExpectedExpenseEdit(draft);
  if (edit) {
    return { isExpectedExpense: true, expectedExpense: edit };
  }
  if (draft.recurringExpenseId.trim()) {
    return {
      isExpectedExpense: true,
      expectedExpense: { recurringExpenseId: draft.recurringExpenseId.trim() },
    };
  }
  return { isExpectedExpense: true };
}

export function ensureExpectedExpenseEditOnDrafts(
  drafts: DraftLine[],
  expenseTypeNameById: Map<string, string>,
): DraftLine[] {
  return drafts.map((d) => {
    if (!d.isExpectedExpense) return d;
    if (d.expectedExpenseEdit) return d;
    const label = expenseTypeNameById.get(d.expenseTypeId);
    return {
      ...d,
      expectedExpenseEdit: buildInitialExpectedExpenseEdit(d, label),
    };
  });
}
