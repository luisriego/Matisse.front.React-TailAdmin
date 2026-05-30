import {
  resolveBillingPolicyFromSnapshots,
  type BillingPolicySnapshot,
} from "./billingPolicyResolve";
import { formatMoneyCentsToPtBrInput, parseMoneyToCentsLocalized } from "./moneyParsing";

const BY_MONTH_KEY = "condominium.convention.byMonth";
const LEGACY_KEY = "condominium.convention";

export type SyndicDistributionRule = "EQUAL" | "FRACTION";

export interface CondominiumConvention {
  extraFee: string;
  reserveFund: string;
  /** Total mensal do rateio síndico (ex.: 600,00 repartido entre unidades). */
  syndicFee: string;
  syndicDistribution: SyndicDistributionRule;
  /** Preço do m³ (R$) aplicado neste mês de boletos. */
  gasPricePerM3: string;
  updatedAt: string;
}

export type MonthConventionValues = Omit<CondominiumConvention, "updatedAt">;

const EMPTY: MonthConventionValues = {
  extraFee: "",
  reserveFund: "",
  syndicFee: "600,00",
  syndicDistribution: "EQUAL",
  gasPricePerM3: "",
};

type ByMonthStore = Record<string, CondominiumConvention>;

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function parseMoneyToCents(raw: string): number | null {
  if (!raw.trim()) return null;
  return parseMoneyToCentsLocalized(raw);
}

function formatCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return formatMoneyCentsToPtBrInput(cents);
}

function normalizeValues(
  parsed: Partial<MonthConventionValues>,
): MonthConventionValues {
  return {
    extraFee: parsed.extraFee ?? "",
    reserveFund: parsed.reserveFund ?? "",
    syndicFee: parsed.syndicFee?.trim() ? parsed.syndicFee : "600,00",
    syndicDistribution: "EQUAL" as const,
    gasPricePerM3: parsed.gasPricePerM3 ?? "",
  };
}

function readStore(): ByMonthStore {
  try {
    const raw = localStorage.getItem(BY_MONTH_KEY);
    if (!raw) return migrateLegacyStore();
    const parsed = JSON.parse(raw) as ByMonthStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ByMonthStore): void {
  localStorage.setItem(BY_MONTH_KEY, JSON.stringify(store));
}

/** Migra o blob global antigo para o mês corrente, se existir. */
function migrateLegacyStore(): ByMonthStore {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<CondominiumConvention>;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const values = normalizeValues(parsed);
    if (!values.extraFee && !values.reserveFund && !values.gasPricePerM3) {
      return {};
    }
    const store: ByMonthStore = {
      [ym]: {
        ...values,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      },
    };
    writeStore(store);
    localStorage.removeItem(LEGACY_KEY);
    return store;
  } catch {
    return {};
  }
}

/**
 * Resolve parâmetros vigentes para um mês: entrada explícita ou último mês anterior
 * com dados guardados (herança temporal até nova decisão).
 */
export function resolveConventionForMonth(ym: string): CondominiumConvention {
  if (!YM_RE.test(ym)) {
    return { ...EMPTY, updatedAt: "" };
  }

  const store = readStore();
  const snapshots: Record<string, BillingPolicySnapshot> = {};
  for (const [month, row] of Object.entries(store)) {
    snapshots[month] = {
      targetMonth: month,
      extraFeePerUnitCents: parseMoneyToCents(row.extraFee) ?? 0,
      reserveFundPerUnitCents: parseMoneyToCents(row.reserveFund) ?? 0,
      syndicShareTotalCents: parseMoneyToCents(row.syndicFee) ?? 60000,
    syndicAllocationRule: "equal_parts" as const,
      gasPricePerM3Cents: parseMoneyToCents(row.gasPricePerM3),
      recordedAt: row.updatedAt,
    };
  }

  const resolved = resolveBillingPolicyFromSnapshots(snapshots, ym);
  if (!resolved.sourceMonth) {
    return { ...EMPTY, updatedAt: "" };
  }

  const source = store[resolved.sourceMonth];
  if (source) return source;

  return {
    extraFee: formatCents(resolved.extraFeePerUnitCents),
    reserveFund: formatCents(resolved.reserveFundPerUnitCents),
    syndicFee: formatCents(resolved.syndicShareTotalCents) || "600,00",
    syndicDistribution: "EQUAL",
    gasPricePerM3: formatCents(resolved.gasPricePerM3Cents ?? 0),
    updatedAt: resolved.recordedAt ?? "",
  };
}

export function loadConventionForMonth(ym: string): CondominiumConvention {
  return resolveConventionForMonth(ym);
}

export function saveConventionForMonth(
  ym: string,
  values: MonthConventionValues,
): void {
  if (!YM_RE.test(ym)) return;
  const store = readStore();
  store[ym] = {
    ...normalizeValues(values),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

/** @deprecated Use loadConventionForMonth(ym). Mantido para compatibilidade pontual. */
export function loadConvention(): CondominiumConvention {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return loadConventionForMonth(ym);
}

/** @deprecated Use saveConventionForMonth(ym, values). */
export function saveConvention(values: MonthConventionValues): void {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  saveConventionForMonth(ym, values);
}

/** Remove histórico local de parâmetros por mês. */
export function clearConvention(): void {
  localStorage.removeItem(BY_MONTH_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export function hasConvention(): boolean {
  const store = readStore();
  return Object.values(store).some(
    (c) => !!(c.extraFee || c.reserveFund || c.syndicFee || c.gasPricePerM3),
  );
}

export function listConventionMonths(): string[] {
  return Object.keys(readStore())
    .filter((k) => YM_RE.test(k))
    .sort();
}
