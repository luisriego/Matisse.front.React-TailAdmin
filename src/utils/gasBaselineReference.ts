/** Período `YYYY-MM` do mês de referência em que se grava a leitura do contador (escolha do utilizador, partilhado entre Boletos e edição de unidade). */
export const GAS_BASELINE_REFERENCE_YM_KEY = "gas.baselineReferenceYm";

export function ymFromDateLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseYm(ym: string): { year: number; month: number } | null {
  const m = ym.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  if (!m) return null;
  return { year: Number(m[1]), month: Number(m[2]) };
}

export function getBaselineReferenceYmFromStorage(): string {
  const raw = localStorage.getItem(GAS_BASELINE_REFERENCE_YM_KEY);
  if (raw && parseYm(raw)) return raw;
  return ymFromDateLocal(new Date());
}
