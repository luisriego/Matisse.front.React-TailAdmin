const STORAGE_KEY = "condominium.convention";

export interface CondominiumConvention {
  extraFee: string;
  reserveFund: string;
  syndicFee: string;
  updatedAt: string;
}

const EMPTY: CondominiumConvention = {
  extraFee: "",
  reserveFund: "",
  syndicFee: "",
  updatedAt: "",
};

export function loadConvention(): CondominiumConvention {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<CondominiumConvention>;
    return {
      extraFee: parsed.extraFee ?? "",
      reserveFund: parsed.reserveFund ?? "",
      syndicFee: parsed.syndicFee ?? "",
      updatedAt: parsed.updatedAt ?? "",
    };
  } catch {
    return EMPTY;
  }
}

export function saveConvention(values: Omit<CondominiumConvention, "updatedAt">): void {
  const convention: CondominiumConvention = {
    ...values,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convention));
}

/** Remove rascunhos da convenção no browser (novo assistente = formulários vazios). */
export function clearConvention(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasConvention(): boolean {
  const c = loadConvention();
  return !!(c.extraFee || c.reserveFund || c.syndicFee);
}
