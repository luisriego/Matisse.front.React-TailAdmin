import type { ExpectedExpenseRecord } from "../types/expectedExpenseApi";
import type { ForecastPayload } from "../types/forecastApi";
import { parseJsonResponseBody } from "./safeJsonResponse";

function unwrapEnvelope<T extends object>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.data && typeof o.data === "object") return o.data as T;
    if (o.content && typeof o.content === "object") return o.content as T;
  }
  return (raw ?? {}) as T;
}

export async function fetchExpectedExpenses(
  year: number,
  activeOnly = true,
): Promise<ExpectedExpenseRecord[]> {
  const token = localStorage.getItem("token");
  if (!token) return [];
  const query = new URLSearchParams({
    year: String(year),
    activeOnly: String(activeOnly),
  });
  const res = await fetch(`/api/v1/expected-expenses?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const raw = unwrapEnvelope<{ data?: unknown[] }>(await res.json());
  const list = Array.isArray(raw) ? raw : Array.isArray(raw.data) ? raw.data : [];
  return list.filter((x): x is ExpectedExpenseRecord => !!x && typeof x === "object") as ExpectedExpenseRecord[];
}

export async function fetchForecast(
  targetMonth: string,
  reconciliationMonth: string,
): Promise<ForecastPayload | null> {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const query = new URLSearchParams({ reconciliationMonth, reconciliation_month: reconciliationMonth });
  const res = await fetch(`/api/v1/forecast/${targetMonth}?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const err = await parseJsonResponseBody<{ message?: string }>(res);
    throw new Error(err?.message || `Falha ao carregar previsão (${res.status}).`);
  }
  return unwrapEnvelope<ForecastPayload>(await res.json());
}

export function formatCentsPtBr(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function monthLabelYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
