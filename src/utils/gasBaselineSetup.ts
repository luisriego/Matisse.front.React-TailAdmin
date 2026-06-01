import type { ResidentUnit } from "../types/residentUnit";
import { parseJsonResponseBody } from "./safeJsonResponse";
import {
  getBaselineReferenceYmFromStorage,
  parseYm,
  GAS_BASELINE_REFERENCE_YM_KEY,
} from "./gasBaselineReference";

export function parsePtBrM3(raw: string): number | null | "invalid" {
  const t = raw.trim();
  if (t === "") return null;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}

export async function saveGasPriceDirect(
  token: string,
  pricePerM3InCents: number,
): Promise<void> {
  const res = await fetch("/api/v1/gas/price/direct", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      pricePerM3InCents,
      price_per_m3_in_cents: pricePerM3InCents,
    }),
  });
  if (!res.ok) {
    const err = await parseJsonResponseBody<{ message?: string }>(res);
    throw new Error(err?.message || "Falha ao guardar o preço do gás.");
  }
}

export async function fetchUnitsMissingBaselineGas(
  units: ResidentUnit[],
  token: string,
  year: number,
  month: number,
): Promise<ResidentUnit[]> {
  const headers = { Authorization: `Bearer ${token}` };
  const missing: ResidentUnit[] = [];
  for (const u of units) {
    const res = await fetch(
      `/api/v1/gas/resident-units/${u.id}/reading/${year}/${month}`,
      { headers },
    );
    if (res.status === 404) missing.push(u);
  }
  return missing;
}

export async function saveGasReading(
  token: string,
  residentUnitId: string,
  year: number,
  month: number,
  reading: number,
): Promise<void> {
  const res = await fetch("/api/v1/gas/reading", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id: crypto.randomUUID(),
      residentUnitId,
      year,
      month,
      reading,
    }),
  });
  if (!res.ok) {
    const err = await parseJsonResponseBody<{ message?: string }>(res);
    throw new Error(err?.message || "Falha ao gravar leitura de gás.");
  }
}

export function defaultBaselineYm(): string {
  return getBaselineReferenceYmFromStorage();
}

export function setBaselineYm(ym: string): void {
  localStorage.setItem(GAS_BASELINE_REFERENCE_YM_KEY, ym);
}

export { parseYm };
