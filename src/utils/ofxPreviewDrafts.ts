/**
 * Mapeia o JSON do preview de POST /api/v1/bank/ofx-ingest → rascunhos da UI.
 * Formas dos campos: ver OpenAPI em /api/v1/doc (não duplicar o schema completo aqui).
 */

function toDateOnly(value: string): string {
  if (!value) return "";
  return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}

export function rowPickString(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = row[key];
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s === "" || s === "null") continue;
    return s;
  }
  return "";
}

export function firstObjectInRowArray(
  row: Record<string, unknown>,
  keys: string[]
): Record<string, unknown> | null {
  for (const key of keys) {
    const arr = row[key];
    if (!Array.isArray(arr) || arr.length === 0) continue;
    const el = arr[0];
    if (el && typeof el === "object" && !Array.isArray(el)) {
      return el as Record<string, unknown>;
    }
  }
  return null;
}

function isNeedsReviewRow(row: Record<string, unknown>): boolean {
  const s = rowPickString(row, ["status", "previewStatus", "preview_status"]).toLowerCase();
  return s === "needs_review" || s === "needs-review";
}

export type CreditKind = "boleto_settlement" | "other";

export interface CreditDraftLine {
  fitId: string;
  bankAccountId: string;
  amountInCents: number;
  postedAt: string;
  memo: string;
  creditKind: CreditKind;
  incomeTypeId: string;
  classificationHint?: string;
  /** true quando status === needs_review (mesmo com sugestões aplicadas) */
  needsHumanReview?: boolean;
}

export interface DraftLine {
  fitId: string;
  bankAccountId: string;
  amountInCents: number;
  postedAt: string;
  memo: string;
  expenseTypeId: string;
  accountId: string;
  dueDate: string;
  description: string;
  recurringExpenseId: string;
  residentUnitId: string;
  needsHumanReview?: boolean;
}

export interface OfxIngestResponse {
  totalNeedsReview?: number;
  totalPreFilled?: number;
  lines?: unknown[];
  transactions?: unknown[];
  expenses?: unknown[];
  credits?: unknown[];
  incomes?: unknown[];
}

function isCreditLikeRow(row: Record<string, unknown>): boolean {
  const t = String(row.type ?? row.trnType ?? row.trntype ?? "").toUpperCase();
  if (t === "DEBIT" || t === "EXPENSE") return false;
  if (t === "CREDIT" || t === "INCOME") return true;
  const lineType = String(row.lineType ?? "").toLowerCase();
  if (lineType === "expense" || lineType === "debit") return false;
  if (lineType === "income" || lineType === "credit") return true;
  return false;
}

function gatherIngestRows(data: OfxIngestResponse): {
  debitRows: Record<string, unknown>[];
  creditRows: Record<string, unknown>[];
} {
  const seenFit = new Set<string>();
  const debitRows: Record<string, unknown>[] = [];
  const creditRows: Record<string, unknown>[] = [];

  const pushRow = (row: Record<string, unknown>, forceCredit: boolean) => {
    const fitId = String(row.fitId ?? "").trim();
    if (!fitId) return;
    if (seenFit.has(fitId)) return;
    seenFit.add(fitId);
    const isCredit = forceCredit || isCreditLikeRow(row);
    if (isCredit) creditRows.push(row);
    else debitRows.push(row);
  };

  const walk = (arr: unknown[] | undefined, forceCredit: boolean) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      pushRow(item as Record<string, unknown>, forceCredit);
    }
  };

  walk(data.lines, false);
  walk(data.transactions, false);
  walk(data.expenses, false);
  walk(data.credits, true);
  walk(data.incomes, true);

  return { debitRows, creditRows };
}

function resolveExpenseTypeIdFromPreview(row: Record<string, unknown>): string {
  const direct = rowPickString(row, ["suggestedExpenseTypeId", "suggested_expense_type_id"]);
  if (direct) return direct;
  const past = firstObjectInRowArray(row, ["pastAssignments", "past_assignments"]);
  if (past) {
    const id = rowPickString(past, ["expenseTypeId", "expense_type_id"]);
    if (id) return id;
  }
  const emb = firstObjectInRowArray(row, ["embeddingCandidates", "embedding_candidates"]);
  if (emb) {
    const id = rowPickString(emb, [
      "candidateId",
      "candidate_id",
      "expenseTypeId",
      "expense_type_id",
    ]);
    if (id) return id;
  }
  return "";
}

function resolveAccountIdFromPreview(row: Record<string, unknown>): string {
  const direct = rowPickString(row, ["suggestedAccountId", "suggested_account_id"]);
  if (direct) return direct;
  const past = firstObjectInRowArray(row, ["pastAssignments", "past_assignments"]);
  if (past) {
    const id = rowPickString(past, ["accountId", "account_id"]);
    if (id) return id;
  }
  return "";
}

export function rowToExpenseDraft(row: Record<string, unknown>): DraftLine | null {
  const fitId = String(row.fitId ?? "").trim();
  const bankAccountId = String(row.bankAccountId ?? "").trim();
  const amountInCents = Number(row.amountInCents ?? 0);
  if (!fitId || !bankAccountId || !Number.isFinite(amountInCents)) return null;
  const postedAt = String(row.postedAt ?? "");
  const memo = String(row.memo ?? "");
  const expenseTypeId = resolveExpenseTypeIdFromPreview(row);
  const accountId = resolveAccountIdFromPreview(row);
  const needsHumanReview = isNeedsReviewRow(row);

  return {
    fitId,
    bankAccountId,
    amountInCents,
    postedAt: toDateOnly(postedAt),
    memo,
    expenseTypeId,
    accountId,
    dueDate: toDateOnly(postedAt),
    description: "",
    recurringExpenseId: rowPickString(row, [
      "suggestedRecurringExpenseId",
      "suggested_recurring_expense_id",
    ]),
    residentUnitId: rowPickString(row, [
      "suggestedResidentUnitId",
      "suggested_resident_unit_id",
    ]),
    needsHumanReview: needsHumanReview || undefined,
  };
}

function parseCreditKindFromRow(row: Record<string, unknown>): CreditKind {
  const raw = rowPickString(row, [
    "suggestedCreditKind",
    "suggested_credit_kind",
    "creditKind",
    "credit_kind",
  ]).toLowerCase();
  if (raw === "other") return "other";
  return "boleto_settlement";
}

/** Sugestões do API para tipo de ingresso aplicam a qualquer creditKind (incl. boleto_settlement). */
function resolveIncomeTypeIdFromPreview(row: Record<string, unknown>): string {
  const direct = rowPickString(row, [
    "suggestedIncomeTypeId",
    "suggested_income_type_id",
    "incomeTypeId",
    "income_type_id",
  ]);
  if (direct) return direct;
  const past = firstObjectInRowArray(row, ["pastIncomeAssignments", "past_income_assignments"]);
  if (past) {
    const id = rowPickString(past, ["incomeTypeId", "income_type_id"]);
    if (id) return id;
  }
  return "";
}

export function rowToCreditDraft(
  row: Record<string, unknown>,
  fallbackBankAccountId: string
): CreditDraftLine | null {
  const fitId = String(row.fitId ?? "").trim();
  let bankAccountId = String(row.bankAccountId ?? "").trim();
  if (!bankAccountId && fallbackBankAccountId) {
    bankAccountId = fallbackBankAccountId;
  }
  let amountInCents = Number(row.amountInCents ?? 0);
  if (!Number.isFinite(amountInCents)) return null;
  amountInCents = Math.abs(amountInCents);
  const postedAt = String(row.postedAt ?? "");
  const memo = String(row.memo ?? "");
  if (!fitId || !bankAccountId) return null;
  const creditKind = parseCreditKindFromRow(row);
  const incomeTypeId = resolveIncomeTypeIdFromPreview(row);
  const needsHumanReview = isNeedsReviewRow(row);

  const src = rowPickString(row, [
    "creditClassificationSource",
    "credit_classification_source",
  ]);
  const confRaw = row.creditClassificationConfidence ?? row.credit_classification_confidence;
  const conf =
    typeof confRaw === "number" && Number.isFinite(confRaw) ? (confRaw as number) : null;
  const hintParts = [memo];
  if (src) hintParts.push(`Origem: ${src}`);
  if (conf !== null) hintParts.push(`Confiança: ${Math.round(conf * 100)}%`);
  const classificationHint = hintParts.length > 1 ? hintParts.join("\n") : undefined;

  return {
    fitId,
    bankAccountId,
    amountInCents,
    postedAt: toDateOnly(postedAt),
    memo,
    creditKind,
    incomeTypeId,
    classificationHint,
    needsHumanReview: needsHumanReview || undefined,
  };
}

export function buildPreviewDrafts(data: OfxIngestResponse): {
  expenseDrafts: DraftLine[];
  creditDrafts: CreditDraftLine[];
} {
  const { debitRows, creditRows } = gatherIngestRows(data);
  const fallbackBank =
    String(debitRows[0]?.bankAccountId ?? "").trim() ||
    String(creditRows[0]?.bankAccountId ?? "").trim() ||
    "";

  const expenseDrafts = debitRows
    .map((r) => rowToExpenseDraft(r))
    .filter((x): x is DraftLine => x !== null);

  const creditDrafts = creditRows
    .map((r) => rowToCreditDraft(r, fallbackBank))
    .filter((x): x is CreditDraftLine => x !== null);

  return { expenseDrafts, creditDrafts };
}
