import { clearConvention } from "./condominiumConvention";
import { GAS_BASELINE_REFERENCE_YM_KEY } from "./gasBaselineReference";
import { clearInitialForecastExpectations } from "./initialForecastExpectations";
import { clearSlipsWizardReferenceYm } from "./slipsWizardReference";

/**
 * Limpa apenas dados de onboarding guardados no browser que podem ficar de uma tentativa falhada.
 * O que já está correto no servidor continua lá; Boletos e o modal de gás alinham o período via API.
 */
export function clearClientOnboardingDrafts(): void {
  clearConvention();
  clearInitialForecastExpectations();
  clearSlipsWizardReferenceYm();
  localStorage.removeItem(GAS_BASELINE_REFERENCE_YM_KEY);
}
