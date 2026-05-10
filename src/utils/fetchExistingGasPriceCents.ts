/** Resposta habitual de GET /api/v1/gas/price (pode vir envolta em data/content). */

function unwrapApiPayload(data: unknown): unknown {
  let cur: unknown = data;
  for (let i = 0; i < 3; i++) {
    if (
      cur &&
      typeof cur === "object" &&
      "data" in cur &&
      (cur as { data: unknown }).data !== undefined
    ) {
      cur = (cur as { data: unknown }).data;
      continue;
    }
    if (
      cur &&
      typeof cur === "object" &&
      "content" in cur &&
      (cur as { content: unknown }).content !== undefined
    ) {
      cur = (cur as { content: unknown }).content;
      continue;
    }
    break;
  }
  return cur;
}

/**
 * Precio efectivo gás já definido no servidor (evento tipo gas.price.was.defined → leitura agregada em R$/m³).
 * Devolve céntimos por m³ ou null se 404 / corpo inválido.
 */
export async function fetchExistingGasPriceCents(
  token: string,
): Promise<number | null> {
  try {
    const res = await fetch("/api/v1/gas/price", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const rawUnknown = await res.json().catch(() => null);
    const payload = unwrapApiPayload(rawUnknown) as Record<string, unknown>;
    const cents =
      typeof payload.price_per_m3_in_cents === "number"
        ? payload.price_per_m3_in_cents
        : typeof payload.pricePerM3InCents === "number"
          ? payload.pricePerM3InCents
          : null;
    return typeof cents === "number" &&
      Number.isFinite(cents) &&
      cents >= 0
      ? cents
      : null;
  } catch {
    return null;
  }
}
