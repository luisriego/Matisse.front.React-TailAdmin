/** Linhas do extrato da conta (entradas/saídas), ordenáveis por data. */

export type LedgerDirection = "entrada" | "saida";

export interface AccountLedgerRow {
  id: string;
  sortTime: number;
  /** Primeira data disponível (pagamento, vencimento ou criação), para exibição com `formatDateDMY`. */
  postedDateRaw: string;
  direction: LedgerDirection;
  kindLabel: string;
  description: string;
  amountCents: number;
  signedCents: number;
}

function unwrapDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && value !== null && "date" in value) {
    const d = (value as { date: unknown }).date;
    if (typeof d === "string" && d.trim()) return d.trim();
  }
  return null;
}

function parseSortTime(...candidates: unknown[]): number {
  for (const c of candidates) {
    const s = unwrapDate(c);
    if (!s) continue;
    const t = new Date(s).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function pickFirstDateString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    const s = unwrapDate(c);
    if (s) return s;
  }
  return null;
}

function coalesceId(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function readAccountIdFromExpense(raw: Record<string, unknown>): string | null {
  const directKeys = ["accountId", "account_id", "chartAccountId", "chart_account_id"] as const;
  for (const k of directKeys) {
    const id = coalesceId(raw[k]);
    if (id) return id;
  }
  const acc = raw.account;
  if (acc && typeof acc === "object" && acc !== null && "id" in acc) {
    const id = coalesceId((acc as { id: unknown }).id);
    if (id) return id;
  }
  return null;
}

function readAccountIdFromIncome(raw: Record<string, unknown>): string | null {
  const directKeys = ["accountId", "account_id", "chartAccountId", "chart_account_id"] as const;
  for (const k of directKeys) {
    const id = coalesceId(raw[k]);
    if (id) return id;
  }
  const acc = raw.account;
  if (acc && typeof acc === "object" && acc !== null && "id" in acc) {
    const id = coalesceId((acc as { id: unknown }).id);
    if (id) return id;
  }
  return null;
}

function asRecordArray(data: unknown): Record<string, unknown>[] {
  if (!Array.isArray(data)) return [];
  return data.filter((x): x is Record<string, unknown> => x !== null && typeof x === "object");
}

/** Respostas em array cru ou envelope (`{ expenses: [...] }`, `{ data: [...] }`, etc.). */
export function parseLedgerSourceList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return asRecordArray(raw);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const keys = [
      "expenses",
      "incomes",
      "data",
      "content",
      "items",
      "rows",
      "results",
      "records",
    ] as const;
    for (const k of keys) {
      const v = o[k];
      if (Array.isArray(v)) return asRecordArray(v);
    }
  }
  return [];
}

function sameAccountId(candidate: string | null, accountId: string): boolean {
  if (!candidate) return false;
  return candidate.trim().toLowerCase() === accountId.trim().toLowerCase();
}

/** Junta várias respostas de despesas (lista global + vários `date-range`) sem duplicar `id`. */
export function mergeLedgerExpenseSources(...sources: unknown[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const out: Record<string, unknown>[] = [];
  for (const src of sources) {
    if (src == null) continue;
    for (const row of parseLedgerSourceList(src)) {
      const id = coalesceId(row.id);
      if (id) {
        if (seen.has(id)) continue;
        seen.add(id);
      }
      out.push(row);
    }
  }
  return out;
}

function expenseKindLabel(raw: Record<string, unknown>): string {
  const t = raw.type;
  if (t && typeof t === "object" && t !== null && "name" in t) {
    const n = (t as { name: unknown }).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return "Despesa";
}

function incomeKindLabel(raw: Record<string, unknown>): string {
  const t = raw.type;
  if (t && typeof t === "object" && t !== null && "name" in t) {
    const n = (t as { name: unknown }).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return "Ingresso";
}

function readString(raw: Record<string, unknown>, key: string): string {
  const v = raw[key];
  return typeof v === "string" ? v : "";
}

function stableIncomeId(raw: Record<string, unknown>, index: number): string {
  const id = raw.id;
  if (typeof id === "string" && id) return id;
  const amt = raw.amount;
  const due = unwrapDate(raw.dueDate ?? raw.due_date);
  const desc = readString(raw, "description");
  return `inc-fallback-${index}-${due ?? ""}-${amt ?? ""}-${desc.slice(0, 40)}`;
}

/**
 * Combina despesas e ingressos da API, filtrados pela conta, e ordena do mais antigo ao mais recente.
 */
export function buildAccountLedger(
  accountId: string,
  expensesPayload: unknown,
  incomesPayload: unknown
): AccountLedgerRow[] {
  const rows: AccountLedgerRow[] = [];
  const expenses = parseLedgerSourceList(expensesPayload);
  const incomes = parseLedgerSourceList(incomesPayload);

  expenses.forEach((raw, index) => {
    const accId = readAccountIdFromExpense(raw);
    if (!sameAccountId(accId, accountId)) return;
    const id = readString(raw, "id");
    const eid = id || `exp-fallback-${index}`;
    const amount = raw.amount;
    const cents = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
    const sortTime = parseSortTime(raw.paidAt ?? raw.paid_at, raw.dueDate ?? raw.due_date, raw.createdAt ?? raw.created_at);
    const postedDateRaw =
      pickFirstDateString(raw.paidAt ?? raw.paid_at, raw.dueDate ?? raw.due_date, raw.createdAt ?? raw.created_at) ??
      new Date(sortTime || Date.now()).toISOString();
    rows.push({
      id: `exp-${eid}`,
      sortTime,
      postedDateRaw,
      direction: "saida",
      kindLabel: expenseKindLabel(raw),
      description: readString(raw, "description") || "—",
      amountCents: cents,
      signedCents: -Math.abs(cents),
    });
  });

  incomes.forEach((raw, index) => {
    const accId = readAccountIdFromIncome(raw);
    if (!sameAccountId(accId, accountId)) return;
    const iid = stableIncomeId(raw, index);
    const amount = raw.amount;
    const cents = typeof amount === "number" && Number.isFinite(amount) ? amount : 0;
    const sortTime = parseSortTime(
      raw.paidAt ?? raw.paid_at,
      raw.dueDate ?? raw.due_date,
      raw.createdAt ?? raw.created_at
    );
    const postedDateRaw =
      pickFirstDateString(
        raw.paidAt ?? raw.paid_at,
        raw.dueDate ?? raw.due_date,
        raw.createdAt ?? raw.created_at
      ) ?? new Date(sortTime || Date.now()).toISOString();
    rows.push({
      id: `inc-${iid}`,
      sortTime,
      postedDateRaw,
      direction: "entrada",
      kindLabel: incomeKindLabel(raw),
      description: readString(raw, "description") || "—",
      amountCents: cents,
      signedCents: Math.abs(cents),
    });
  });

  rows.sort((a, b) => {
    if (a.sortTime !== b.sortTime) return a.sortTime - b.sortTime;
    return a.id.localeCompare(b.id);
  });
  return rows;
}
