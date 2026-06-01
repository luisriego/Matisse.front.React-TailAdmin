import type { ResidentUnit } from "../types/residentUnit";
import { mapResidentUnitFromRecord, mapResidentUnitsFromRaw } from "./normalizeResidentUnitsResponse";

export type ActiveResidentUnit = ResidentUnit;

/**
 * GET /api/v1/resident-unit/actives — lista de unidades activas (API_DOC.md).
 */
export async function fetchActiveResidentUnits(
  token: string,
): Promise<ActiveResidentUnit[]> {
  const res = await fetch("/api/v1/resident-unit/actives", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      if (errBody && typeof errBody === "object" && "message" in errBody) {
        detail = String((errBody as { message: unknown }).message);
      }
    } catch {
      detail = await res.text().catch(() => "");
    }
    throw new Error(
      detail.trim() ||
        `GET /api/v1/resident-unit/actives respondeu HTTP ${res.status}`,
    );
  }

  const raw: unknown = await res.json().catch(() => null);

  if (Array.isArray(raw)) {
    const out: ActiveResidentUnit[] = [];
    for (const item of raw) {
      const mapped = mapResidentUnitFromRecord(item);
      if (mapped) out.push(mapped);
    }
    return out;
  }

  return mapResidentUnitsFromRaw(raw);
}
