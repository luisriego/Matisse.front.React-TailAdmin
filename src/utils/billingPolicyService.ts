import type { ResolvedBillingPolicyResponse } from "../types/billingPolicyApi";
import {
  fetchResolvedBillingPolicy,
  isBillingPolicyApiUnavailableError,
  putBillingPolicyMonth,
} from "./billingPolicyApi";
import type { MonthConventionValues } from "./condominiumConvention";
import {
  loadConventionForMonth,
  saveConventionForMonth,
} from "./condominiumConvention";
import {
  formatMoneyCentsToPtBrInput,
  parseMoneyToCentsLocalized,
} from "./moneyParsing";

export function resolvedPolicyToUiValues(
  resolved: ResolvedBillingPolicyResponse,
): MonthConventionValues {
  return {
    extraFee:
      resolved.extraFeePerUnitCents > 0
        ? formatMoneyCentsToPtBrInput(resolved.extraFeePerUnitCents)
        : "",
    reserveFund:
      resolved.reserveFundPerUnitCents > 0
        ? formatMoneyCentsToPtBrInput(resolved.reserveFundPerUnitCents)
        : "",
    syndicFee:
      resolved.syndicShareTotalCents > 0
        ? formatMoneyCentsToPtBrInput(resolved.syndicShareTotalCents)
        : "600,00",
    syndicDistribution: "EQUAL",
    gasPricePerM3:
      resolved.gasPricePerM3Cents !== null &&
      resolved.gasPricePerM3Cents !== undefined &&
      resolved.gasPricePerM3Cents > 0
        ? formatMoneyCentsToPtBrInput(resolved.gasPricePerM3Cents)
        : "",
  };
}

export function uiValuesToPutRequest(values: MonthConventionValues) {
  const extra = parseMoneyToCentsLocalized(values.extraFee);
  const reserve = parseMoneyToCentsLocalized(values.reserveFund);
  const syndic = parseMoneyToCentsLocalized(values.syndicFee);
  const gas = values.gasPricePerM3.trim()
    ? parseMoneyToCentsLocalized(values.gasPricePerM3)
    : null;

  if (extra === null || reserve === null || syndic === null) {
    throw new Error("Valores monetários inválidos.");
  }
  if (values.gasPricePerM3.trim() && gas === null) {
    throw new Error("Preço do gás inválido.");
  }

  return {
    extraFeePerUnitCents: extra,
    reserveFundPerUnitCents: reserve,
    syndicShareTotalCents: syndic,
    syndicAllocationRule: "equal_parts" as const,
    gasPricePerM3Cents: gas,
  };
}

export type LoadMonthBillingParamsResult = MonthConventionValues & {
  source: "api" | "local";
  sourceMonth: string | null;
  explicit: boolean;
};

/** Resolve parâmetros: API autoritativa; fallback local se endpoint indisponível. */
export async function loadMonthBillingParams(
  targetMonth: string,
): Promise<LoadMonthBillingParamsResult> {
  const local = loadConventionForMonth(targetMonth);
  const token = localStorage.getItem("token");

  if (!token) {
    return {
      ...local,
      source: "local",
      sourceMonth: null,
      explicit: false,
    };
  }

  try {
    const resolved = await fetchResolvedBillingPolicy(token, targetMonth);
    const ui = resolvedPolicyToUiValues(resolved);
    saveConventionForMonth(targetMonth, ui);
    return {
      ...ui,
      source: "api",
      sourceMonth: resolved.sourceMonth,
      explicit: resolved.explicit,
    };
  } catch (err) {
    if (!isBillingPolicyApiUnavailableError(err)) {
      console.warn("[billingPolicy] resolve falhou, a usar cache local:", err);
    }
    return {
      ...local,
      source: "local",
      sourceMonth: null,
      explicit: false,
    };
  }
}

/** Persiste snapshot do mês: PUT na API + cache local. */
export async function saveMonthBillingParams(
  targetMonth: string,
  values: MonthConventionValues,
): Promise<{ syncedToApi: boolean }> {
  saveConventionForMonth(targetMonth, values);

  const token = localStorage.getItem("token");
  if (!token) return { syncedToApi: false };

  try {
    const body = uiValuesToPutRequest(values);
    await putBillingPolicyMonth(token, targetMonth, body);
    return { syncedToApi: true };
  } catch (err) {
    if (!isBillingPolicyApiUnavailableError(err)) {
      console.warn("[billingPolicy] PUT falhou, só cache local:", err);
    }
    return { syncedToApi: false };
  }
}
