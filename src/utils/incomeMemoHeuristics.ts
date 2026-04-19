/**
 * Heurística local: memo do extrato → tipo de ingresso do catálogo (só IDs existentes em `types`).
 * Complementa suggestedIncomeTypeId do preview quando vem vazio.
 */

function normalizeLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function guessIncomeTypeIdFromMemo(
  memo: string,
  types: Array<{ id: string; name: string }>
): string {
  if (!types.length || !memo.trim()) return "";
  const m = normalizeLabel(memo);

  const byName = (pred: (normName: string) => boolean): string => {
    const hit = types.find((t) => pred(normalizeLabel(t.name)));
    return hit?.id ?? "";
  };

  const rendimentoMemo =
    m.includes("rendimento") ||
    m.includes("rend pago") ||
    (m.includes("aplic") && m.includes("aut")) ||
    m.includes("poupanca") ||
    m.includes("resgate");

  if (rendimentoMemo) {
    const id = byName((n) => n.includes("rendimento") && n.includes("financeir"));
    if (id) return id;
    const idLoose = byName((n) => n.includes("rendimento"));
    if (idLoose) return idLoose;
  }

  const boletosRecebMemo = m.includes("boleto") && m.includes("receb");
  if (boletosRecebMemo) {
    const id = byName((n) => n.includes("encargo") && n.includes("condomin"));
    if (id) return id;
    const idTaxa = byName((n) => n.includes("taxa") && n.includes("condomin"));
    if (idTaxa) return idTaxa;
  }

  return "";
}
