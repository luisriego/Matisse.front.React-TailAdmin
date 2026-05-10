/** Converte respostas comuns (Symfony, paginação, Hydra…) em lista antes de mapear `{ id, unit }`. */
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
