import type { ResidentUnit } from "../types/residentUnit";

/** Converte respostas comuns (Symfony, paginação, Hydra…) em lista antes de mapear unidades. */
export function coerceResidentUnitsArray(rawUnknown: unknown): unknown[] {
  let cur: unknown = rawUnknown;
  for (let depth = 0; depth < 10; depth += 1) {
    if (Array.isArray(cur)) return cur;
    if (cur && typeof cur === "object") {
      const o = cur as Record<string, unknown>;
      const nestedKeys = [
        "data",
        "content",
        "items",
        "results",
        "residentUnits",
        "resident_units",
        "units",
        "hydra:member",
        "_embedded",
      ] as const;
      let stepped = false;
      for (const k of nestedKeys) {
        const v = o[k];
        if (Array.isArray(v)) {
          cur = v;
          stepped = true;
          break;
        }
        /** Spring `_embedded`: { residentUnits: [...] } */
        if (k === "_embedded" && v && typeof v === "object") {
          const emb = v as Record<string, unknown>;
          const firstArray = Object.values(emb).find((x) =>
            Array.isArray(x),
          ) as unknown[] | undefined;
          if (firstArray) {
            cur = firstArray;
            stepped = true;
            break;
          }
        }
      }
      if (stepped) continue;
    }
    break;
  }
  return [];
}

export function residentUnitApiId(unit: Record<string, unknown>): string | null {
  const v =
    unit.id ??
    unit.uuid ??
    unit.residentUnitId ??
    unit.resident_unit_id;
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  if (typeof v === "number" && Number.isFinite(v))
    return String(Math.trunc(v));

  const atId = unit["@id"];
  if (typeof atId === "string" && atId.trim() !== "") {
    const s = atId.trim();
    const uuidRe =
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const u = uuidRe.exec(s);
    if (u) return u[1]!.toLowerCase();
    const last = s.split("/").filter(Boolean).pop();
    if (last && last !== s) return decodeURIComponent(last);
    return s;
  }

  return null;
}

export function residentUnitLabel(unit: Record<string, unknown>): string | null {
  for (const key of ["unit", "name", "label", "unitName", "unit_name"] as const) {
    const v = unit[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

function parseIdealFraction(rec: Record<string, unknown>): number {
  const raw = rec.idealFraction ?? rec.ideal_fraction;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function parseRecipients(rec: Record<string, unknown>): Array<{ name: string; email: string }> {
  const raw =
    rec.notificationRecipients ?? rec.notification_recipients ?? [];
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "",
      email: typeof item.email === "string" ? item.email : "",
    }))
    .filter((r) => r.name.trim() || r.email.trim());
}

function parseDateField(rec: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = rec[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return null;
}

/** Mapeia um registo bruto da API para `ResidentUnit`. */
export function mapResidentUnitFromRecord(
  item: unknown,
): ResidentUnit | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  const id = residentUnitApiId(rec);
  const unit = residentUnitLabel(rec);
  if (!id || !unit) return null;

  const isActiveRaw = rec.isActive ?? rec.is_active;
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
      : isActiveRaw === 0 || isActiveRaw === "0" || isActiveRaw === "false"
        ? false
        : true;

  return {
    id,
    unit,
    idealFraction: parseIdealFraction(rec),
    isActive,
    createdAt:
      parseDateField(rec, "createdAt", "created_at") ?? "",
    updatedAt: parseDateField(rec, "updatedAt", "updated_at"),
    notificationRecipients: parseRecipients(rec),
  };
}

/** Lista normalizada a partir de JSON bruto da API. */
export function mapResidentUnitsFromRaw(
  rawUnknown: unknown,
): ResidentUnit[] {
  const list = coerceResidentUnitsArray(rawUnknown);
  const out: ResidentUnit[] = [];
  for (const item of list) {
    const mapped = mapResidentUnitFromRecord(item);
    if (mapped) out.push(mapped);
  }
  return out;
}
