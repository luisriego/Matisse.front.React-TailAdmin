/**
 * GET /api/v1/bank/ofx-matching-context — só leitura; alinhado com matchers SQL do back-end.
 * Ver OpenAPI em /api/v1/doc.
 */

export const OFX_MATCHING_CONTEXT_PATH = "/api/v1/bank/ofx-matching-context";

export interface OfxMatchingContext {
  historyWindowMonths?: number;
  windowStartDate?: string;
  windowEndDate?: string;
  activeExpenseCountInWindow?: number;
  activeExpenseWithDescriptionCountInWindow?: number;
  incomeRecordedCountInWindow?: number;
  incomeWithDescriptionCountInWindow?: number;
  expenseEmbeddingIndexedCount?: number;
  debitSqlHistoryAvailable?: boolean;
  debitSemanticIndexAvailable?: boolean;
  creditSqlHistoryAvailable?: boolean;
  manualDebitClassificationExpected?: boolean;
}

function pickNum(o: Record<string, unknown>, camel: string, snake: string): number | undefined {
  const v = o[camel] ?? o[snake];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function pickStr(o: Record<string, unknown>, camel: string, snake: string): string | undefined {
  const v = o[camel] ?? o[snake];
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

function pickBool(o: Record<string, unknown>, camel: string, snake: string): boolean | undefined {
  const v = o[camel] ?? o[snake];
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "true") return true;
  if (v === 0 || v === "0" || v === "false") return false;
  return undefined;
}

export function parseOfxMatchingContext(raw: unknown): OfxMatchingContext | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    historyWindowMonths: pickNum(o, "historyWindowMonths", "history_window_months"),
    windowStartDate: pickStr(o, "windowStartDate", "window_start_date"),
    windowEndDate: pickStr(o, "windowEndDate", "window_end_date"),
    activeExpenseCountInWindow: pickNum(o, "activeExpenseCountInWindow", "active_expense_count_in_window"),
    activeExpenseWithDescriptionCountInWindow: pickNum(
      o,
      "activeExpenseWithDescriptionCountInWindow",
      "active_expense_with_description_count_in_window"
    ),
    incomeRecordedCountInWindow: pickNum(o, "incomeRecordedCountInWindow", "income_recorded_count_in_window"),
    incomeWithDescriptionCountInWindow: pickNum(
      o,
      "incomeWithDescriptionCountInWindow",
      "income_with_description_count_in_window"
    ),
    expenseEmbeddingIndexedCount: pickNum(o, "expenseEmbeddingIndexedCount", "expense_embedding_indexed_count"),
    debitSqlHistoryAvailable: pickBool(o, "debitSqlHistoryAvailable", "debit_sql_history_available"),
    debitSemanticIndexAvailable: pickBool(o, "debitSemanticIndexAvailable", "debit_semantic_index_available"),
    creditSqlHistoryAvailable: pickBool(o, "creditSqlHistoryAvailable", "credit_sql_history_available"),
    manualDebitClassificationExpected: pickBool(
      o,
      "manualDebitClassificationExpected",
      "manual_debit_classification_expected"
    ),
  };
}
