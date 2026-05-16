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

/**
 * Identificador único da linha no preview: OFX costuma expor FITID; a API também pode usar importLineKey.
 */
export function resolveIngestLineId(row: Record<string, unknown>): string {
  return rowPickString(row, [
    "fitId",
    "fit_id",
    "FITID",
    "importLineKey",
    "import_line_key",
  ]);
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
  settlementMonth: string;
  settlementExtraFeePerUnitCents?: number;
  settlementReserveFundPerUnitCents?: number;
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
    const fitId = resolveIngestLineId(row);
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

function rowBankAccountId(row: Record<string, unknown> | undefined): string {
  if (!row) return "";
  return rowPickString(row, ["bankAccountId", "bank_account_id"]);
}

export function rowToExpenseDraft(row: Record<string, unknown>): DraftLine | null {
  const fitId = resolveIngestLineId(row);
  const bankAccountId = rowBankAccountId(row);
  const amountRaw = rowPickNumber(row, ["amountInCents", "amount_in_cents"]);
  const amountInCents =
    amountRaw !== undefined ? amountRaw : Number(row.amountInCents ?? NaN);
  if (!fitId || !bankAccountId || !Number.isFinite(amountInCents)) return null;
  const postedAt = rowPickString(row, ["postedAt", "posted_at"]);
  const memo = String(row.memo ?? row.description ?? "");
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

function rowPickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const raw = row[key];
    if (typeof raw === "number" && Number.isFinite(raw)) return raw;
    if (typeof raw === "string") {
      const parsed = Number(raw);
      if (raw.trim() && Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
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

function resolveSettlementMonthFromPreview(row: Record<string, unknown>): string {
  const direct = rowPickString(row, ["settlementMonth", "settlement_month"]);
  if (/^\d{4}-\d{2}$/.test(direct)) return direct;
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct.slice(0, 7);
  return "";
}

export function rowToCreditDraft(
  row: Record<string, unknown>,
  fallbackBankAccountId: string
): CreditDraftLine | null {
  const fitId = resolveIngestLineId(row);
  let bankAccountId = rowBankAccountId(row);
  if (!bankAccountId && fallbackBankAccountId) {
    bankAccountId = fallbackBankAccountId;
  }
  const amtRaw = rowPickNumber(row, ["amountInCents", "amount_in_cents"]);
  let amountInCents =
    amtRaw !== undefined ? amtRaw : Number(row.amountInCents ?? NaN);
  if (!Number.isFinite(amountInCents)) return null;
  amountInCents = Math.abs(amountInCents);
  const postedAt = rowPickString(row, ["postedAt", "posted_at"]);
  const memo = String(row.memo ?? row.description ?? "");
  if (!fitId || !bankAccountId) return null;
  const creditKind = parseCreditKindFromRow(row);
  const incomeTypeId = resolveIncomeTypeIdFromPreview(row);
  const settlementMonth = resolveSettlementMonthFromPreview(row);
  const settlementExtraFeePerUnitCents = rowPickNumber(row, [
    "settlementExtraFeePerUnitCents",
    "settlement_extra_fee_per_unit_cents",
  ]);
  const settlementReserveFundPerUnitCents = rowPickNumber(row, [
    "settlementReserveFundPerUnitCents",
    "settlement_reserve_fund_per_unit_cents",
  ]);
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
    settlementMonth,
    settlementExtraFeePerUnitCents,
    settlementReserveFundPerUnitCents,
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
    rowBankAccountId(debitRows[0]) || rowBankAccountId(creditRows[0]);

  const expenseDrafts = debitRows
    .map((r) => rowToExpenseDraft(r))
    .filter((x): x is DraftLine => x !== null);

  const creditDrafts = creditRows
    .map((r) => rowToCreditDraft(r, fallbackBank))
    .filter((x): x is CreditDraftLine => x !== null);

  return { expenseDrafts, creditDrafts };
}
