const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export type BillingPolicySnapshot = {
  targetMonth: string;
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  syndicShareTotalCents: number;
  syndicAllocationRule: "equal_parts" | "ideal_fraction";
  gasPricePerM3Cents: number | null;
  recordedAt: string;
};

export type ResolvedBillingPolicy = {
  targetMonth: string;
  sourceMonth: string | null;
  explicit: boolean;
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  syndicShareTotalCents: number;
  syndicAllocationRule: "equal_parts" | "ideal_fraction";
  gasPricePerM3Cents: number | null;
  recordedAt: string | null;
};

export function isValidTargetMonth(ym: string): boolean {
  return YM_RE.test(ym);
}

/**
 * Algoritmo que o backend deve implementar: snapshot explícito do mês alvo
 * ou herança do último mês anterior com registo.
 */
export function resolveBillingPolicyFromSnapshots(
  snapshots: Record<string, BillingPolicySnapshot>,
  targetMonth: string,
): ResolvedBillingPolicy {
  const empty: ResolvedBillingPolicy = {
    targetMonth,
    sourceMonth: null,
    explicit: false,
    extraFeePerUnitCents: 0,
    reserveFundPerUnitCents: 0,
    syndicShareTotalCents: 60000,
    syndicAllocationRule: "equal_parts",
    gasPricePerM3Cents: null,
    recordedAt: null,
  };

  if (!isValidTargetMonth(targetMonth)) return empty;

  const explicit = snapshots[targetMonth];
  if (explicit) {
    return {
      targetMonth,
      sourceMonth: targetMonth,
      explicit: true,
      extraFeePerUnitCents: explicit.extraFeePerUnitCents,
      reserveFundPerUnitCents: explicit.reserveFundPerUnitCents,
      syndicShareTotalCents: explicit.syndicShareTotalCents,
      syndicAllocationRule: explicit.syndicAllocationRule,
      gasPricePerM3Cents: explicit.gasPricePerM3Cents,
      recordedAt: explicit.recordedAt,
    };
  }

  const priorYm = Object.keys(snapshots)
    .filter((k) => isValidTargetMonth(k) && k < targetMonth)
    .sort()
    .at(-1);

  if (!priorYm) return empty;

  const inherited = snapshots[priorYm];
  return {
    targetMonth,
    sourceMonth: priorYm,
    explicit: false,
    extraFeePerUnitCents: inherited.extraFeePerUnitCents,
    reserveFundPerUnitCents: inherited.reserveFundPerUnitCents,
    syndicShareTotalCents: inherited.syndicShareTotalCents,
    syndicAllocationRule: inherited.syndicAllocationRule,
    gasPricePerM3Cents: inherited.gasPricePerM3Cents,
    recordedAt: inherited.recordedAt,
  };
}
