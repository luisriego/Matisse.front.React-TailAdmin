/** ISO `YYYY-MM-DD` según el calendario local (evita que `.toISOString()` cambie el día por el huso UTC). */
export function formatDateYYYYMMDDLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalización común: miles con punto, decimales con coma (o punto si no hay coma).
 * Devuelve `null` si la cadena está vacía o es ilegible.
 */
function parseLocalizedDecimal(raw: string): number | null {
  if (raw === undefined || raw === null) return null;
  let t = String(raw)
    .normalize("NFKC")
    .replace(/[\u00A0\u202F\u2009\u2007]/g, "")
    .trim()
    .replace(/\s+/g, "");

  if (t.startsWith("+")) t = t.slice(1).trim();
  t = t.replace(/[\u066B\u066C،٫､，]/gu, ",");

  if ((t.match(/,/g) ?? []).length > 1) return null;
  if (!t) return null;

  let normalized: string;
  if (t.includes(",")) {
    normalized = t.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (t.match(/\./g) ?? []).length;
    normalized = dotCount > 1 ? t.replace(/\./g, "") : t;
  }
  const n = parseFloat(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Cantidades monetarias: misma lógica que `parseLocalizedDecimal` pero en céntimos. */
export function parseMoneyToCentsLocalized(raw: string): number | null {
  const n = parseLocalizedDecimal(raw);
  if (n === null) return null;
  return Math.round(n * 100);
}

/** Número decimal no monetario (ej. m³ de gas, fração ideal): acepta `1.281,343`. */
export function parseLocalizedDecimalNumber(raw: string): number | null {
  return parseLocalizedDecimal(raw);
}

/** Para preencher inputs R$ pt-BR a partir de valores em cêntimos (API / openingReference). */
export function formatMoneyCentsToPtBrInput(cents: number): string {
  if (!Number.isFinite(cents) || cents < 0) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
