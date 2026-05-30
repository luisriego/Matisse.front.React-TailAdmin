export type GasReadingParsed = number | null | "invalid";

/**
 * Parser tolerante para lecturas de gas introducidas en UI:
 * - pt-BR: "1.281,343" -> 1281.343
 * - simple: "1281,343" -> 1281.343
 * - atajo sin separadores: "1281343" -> 1281.343
 */
export function parseGasReadingFromUi(raw: string): GasReadingParsed {
  const t = raw.trim();
  if (t === "") return null;
  if (/^\d+$/.test(t)) {
    const n = Number(t) / 1000;
    return Number.isFinite(n) && n >= 0 ? n : "invalid";
  }
  if (!/^[\d.,]+$/.test(t)) return "invalid";
  const lastComma = t.lastIndexOf(",");
  const lastDot = t.lastIndexOf(".");
  const decimalIdx = Math.max(lastComma, lastDot);
  const intPart = decimalIdx >= 0 ? t.slice(0, decimalIdx) : t;
  const fracPart = decimalIdx >= 0 ? t.slice(decimalIdx + 1) : "";
  const intDigits = intPart.replace(/[.,]/g, "");
  const fracDigits = fracPart.replace(/[.,]/g, "");
  const normalized = fracDigits.length > 0 ? `${intDigits}.${fracDigits}` : intDigits;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return n;
}
