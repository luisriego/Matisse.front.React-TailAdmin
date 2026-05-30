import type { DashboardSlip } from "../hooks/useDashboardData";

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function normalizeSlipRow(raw: Record<string, unknown>): DashboardSlip | null {
  const id = raw.id ?? raw.slipId ?? raw.slip_id;
  if (typeof id !== "string" && typeof id !== "number") return null;
  return {
    id: String(id),
    residentUnitId: (raw.residentUnitId ?? raw.resident_unit_id ?? null) as string | null,
    amount: typeof raw.amount === "number" ? raw.amount : null,
    status: (raw.status as string) ?? null,
    dueDate: (raw.dueDate ?? raw.due_date ?? null) as string | null,
    paidAt: (raw.paidAt ?? raw.paid_at ?? null) as string | null,
  };
}

export function extractSlipsFromListPayload(data: unknown): DashboardSlip[] {
  if (!data) return [];
  const root = data as Record<string, unknown>;
  const nested = root.slip && typeof root.slip === "object" ? [root.slip] : null;
  const candidates = nested
    ?? (Array.isArray(data) ? data : null)
    ?? (Array.isArray(root.slips) ? root.slips : null)
    ?? (Array.isArray(root.data) ? root.data : null)
    ?? (Array.isArray(root.items) ? root.items : null)
    ?? [];

  return (candidates as Record<string, unknown>[])
    .map(normalizeSlipRow)
    .filter((row): row is DashboardSlip => row !== null);
}

export function collectSlipIdsFromLocalStorage(year: number, month: number): string[] {
  const key = `slips.generated.ids.${monthKey(year, month)}`;
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export async function fetchSlipById(
  id: string,
  headers: HeadersInit,
): Promise<DashboardSlip | null> {
  const res = await fetch(`/api/v1/slips/${id}`, { headers });
  if (!res.ok) return null;
  const data = (await res.json()) as Record<string, unknown>;
  const raw = (data.slip && typeof data.slip === "object" ? data.slip : data) as Record<
    string,
    unknown
  >;
  return normalizeSlipRow({ ...raw, id: raw.id ?? id });
}

/**
 * Lista boletos do mês: tenta endpoints de listagem da API, funde com IDs do localStorage
 * e completa detalhes via GET /slips/{id}.
 */
export async function resolveSlipsForMonth(
  year: number,
  month: number,
  headers: HeadersInit,
): Promise<DashboardSlip[]> {
  const ym = monthKey(year, month);
  const byId = new Map<string, DashboardSlip>();

  const listUrls = [
    `/api/v1/slips?targetMonth=${ym}`,
    `/api/v1/slips/date-range/${year}/${month}`,
  ];

  for (const url of listUrls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      const rows = extractSlipsFromListPayload(data);
      for (const row of rows) {
        byId.set(row.id, row);
      }
      if (rows.length > 0) break;
    } catch {
      /* try next */
    }
  }

  for (const id of collectSlipIdsFromLocalStorage(year, month)) {
    if (!byId.has(id)) {
      byId.set(id, { id, residentUnitId: null, amount: null, status: null, dueDate: null, paidAt: null });
    }
  }

  const ids = [...byId.keys()];
  if (ids.length === 0) return [];

  const detailResults = await Promise.allSettled(
    ids.map(async (id) => {
      const cached = byId.get(id)!;
      if (cached.amount != null && cached.dueDate != null) return cached;
      const detail = await fetchSlipById(id, headers);
      return detail ?? cached;
    }),
  );

  return detailResults
    .filter((r): r is PromiseFulfilledResult<DashboardSlip> => r.status === "fulfilled")
    .map((r) => r.value);
}

export function attachUnitLabels(
  slips: DashboardSlip[],
  unitLabelById: Record<string, string>,
): DashboardSlip[] {
  return slips.map((slip) => ({
    ...slip,
    unitLabel:
      slip.residentUnitId && unitLabelById[slip.residentUnitId]
        ? unitLabelById[slip.residentUnitId]
        : slip.unitLabel,
  }));
}
