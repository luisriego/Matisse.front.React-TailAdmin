/**
 * Heurística local: memos de tarifas bancárias (prefixo TAR…) → tipo de despesa do catálogo.
 * Só devolve IDs existentes em `types` (ex.: "Despesas bancárias").
 */

function normalizeLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function tokenBase(t: string): string {
  return t.replace(/[_-].*$/, "");
}

/** Memos tipo TAR CONTA, … TAR PIX …, TAR_COBRANCA, TARIF… (evita "tartaruga"). */
export function isTarBankFeeMemo(memo: string): boolean {
  const m = normalizeLabel(memo);
  if (!m) return false;
  const tokens = m.split(/[\s/]+/).filter(Boolean);
  if (tokens.some((t) => tokenBase(t) === "tar")) return true;
  if (/^tar(?:[_\-.]|[/])/.test(m)) return true;
  if (/^tar\b/.test(m)) return true;
  if (m.startsWith("tarif")) return true;
  if (/\btar\b/.test(m)) return true;
  return false;
}

export function guessExpenseTypeIdForTarMemo(
  memo: string,
  types: Array<{ id: string; name: string }>
): string {
  if (!types.length || !isTarBankFeeMemo(memo)) return "";

  const byName = (pred: (normName: string) => boolean): string => {
    const hit = types.find((t) => pred(normalizeLabel(t.name)));
    return hit?.id ?? "";
  };

  const bankName = (n: string) =>
    n.includes("despesa") &&
    (n.includes("bancar") || n.includes("bancaria") || n.includes("banca") || n.includes("banco"));
  const id = byName(bankName);
  if (id) return id;
  const id2 = byName((n) => n.includes("tarifa") && (n.includes("bancar") || n.includes("banca") || n.includes("banco")));
  if (id2) return id2;
  const id3 = byName((n) => n.includes("despesa") && n.includes("banc"));
  return id3;
}
