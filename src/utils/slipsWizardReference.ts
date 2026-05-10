import { isValidAccountingPeriod } from "./defaultAccountingMonth";

/** Mês de referência escolhido no assistente inicial (consumido ao abrir Boletos se não houver despesas). */
export const SLIPS_WIZARD_REFERENCE_YM_KEY = "slips.wizardReferenceYm";

export function setSlipsWizardReferenceYm(ym: string): void {
  if (isValidAccountingPeriod(ym)) {
    localStorage.setItem(SLIPS_WIZARD_REFERENCE_YM_KEY, ym);
  }
}

export function peekSlipsWizardReferenceYm(): string | null {
  const raw = localStorage.getItem(SLIPS_WIZARD_REFERENCE_YM_KEY);
  return raw && isValidAccountingPeriod(raw) ? raw : null;
}

export function clearSlipsWizardReferenceYm(): void {
  localStorage.removeItem(SLIPS_WIZARD_REFERENCE_YM_KEY);
}
