import { isValidAccountingPeriod } from "./defaultAccountingMonth";

const STORAGE_KEY = "condominium.initialForecastExpectations";

export type SyndicDistributionRule = "EQUAL" | "FRACTION";

export interface InitialForecastExpectations {
  /** YYYY-MM alinhado ao passo «Mês de referência dos boletos». */
  targetYm: string;
  /** Soma prevista dos boletos / a receber (coluna total do demonstrativo). */
  expectedTotal: string;
  /** Total «despesas previstas» rateadas (base do condomínio). */
  expectedBase: string;
  /** Total «rateio síndico». */
  expectedSyndic: string;
  /** Total gás em R$ na previsão (opcional). */
  expectedGas: string;
  syndicDistribution: SyndicDistributionRule;
  updatedAt: string;
}

export function saveInitialForecastExpectations(
  values: Omit<InitialForecastExpectations, "updatedAt">,
): void {
  if (!isValidAccountingPeriod(values.targetYm)) return;
  const row: InitialForecastExpectations = {
    ...values,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(row));
}

export function loadInitialForecastExpectations(): InitialForecastExpectations | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<InitialForecastExpectations>;
    if (!p.targetYm || !isValidAccountingPeriod(p.targetYm)) return null;
    const syndicDistribution: SyndicDistributionRule =
      p.syndicDistribution === "FRACTION" ? "FRACTION" : "EQUAL";
    return {
      targetYm: p.targetYm,
      expectedTotal: p.expectedTotal ?? "",
      expectedBase: p.expectedBase ?? "",
      expectedSyndic: p.expectedSyndic ?? "",
      expectedGas: p.expectedGas ?? "",
      syndicDistribution,
      updatedAt: p.updatedAt ?? "",
    };
  } catch {
    return null;
  }
}

export function clearInitialForecastExpectations(): void {
  localStorage.removeItem(STORAGE_KEY);
}
