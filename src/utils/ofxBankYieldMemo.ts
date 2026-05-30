/**
 * Memos típicos de rendimento / aplicação automática em extratos BR.
 * Usados só para agrupar linhas na pré-visualização OFX (UI), sem alterar o payload enviado ao servidor.
 */

function normalizeMemo(memo: string): string {
  return memo.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

/** Indica se a linha de crédito deve entrar no bloco agrupado «rendimentos / aplicação automática». */
export function isBankYieldBundleMemo(memo: string): boolean {
  const u = normalizeMemo(memo);
  if (u.includes("RENDIMENTO")) return true;
  if (u.includes("PAGO") && u.includes("APLIC") && u.includes("AUT") && u.includes("MAIS"))
    return true;
  if (/\bREND\b/.test(u)) return true;
  return false;
}

export function partitionCreditsForBundleView<T extends { memo: string }>(
  drafts: T[],
): { bundleIndices: number[]; singleIndices: number[] } {
  const bundleIndices: number[] = [];
  const singleIndices: number[] = [];
  drafts.forEach((d, i) => {
    if (isBankYieldBundleMemo(d.memo)) bundleIndices.push(i);
    else singleIndices.push(i);
  });
  return { bundleIndices, singleIndices };
}
