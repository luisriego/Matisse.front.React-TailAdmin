import type {
  OpeningReferenceMonthRequest,
  SyndicAllocationRuleApi,
  SetupStatusPayload,
} from "../types/setupApi";

const YM_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function readNumericCents(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): number | undefined {
  const a = o[camel];
  if (typeof a === "number" && Number.isFinite(a))
    return Math.trunc(Number(a));
  const b = o[snake];
  if (typeof b === "number" && Number.isFinite(b))
    return Math.trunc(Number(b));
  if (typeof a === "string" && /^-?\d+$/.test(a.trim()))
    return Math.trunc(Number(a.trim()));
  if (typeof b === "string" && /^-?\d+$/.test(b.trim()))
    return Math.trunc(Number(b.trim()));
  return undefined;
}

function normSyndicRule(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/-/g, "_").toLowerCase();
}

function apiSyndicFromUnknown(value: unknown): SyndicAllocationRuleApi | null {
  const n = normSyndicRule(value);
  if (n === "ideal_fraction") return "ideal_fraction";
  if (n === "equal_parts") return "equal_parts";
  return null;
}

/** Corpo canonico igual ao PUT/POST esperado pela API — a partir do blob `openingReference`. */
export function buildOpeningReferenceRequestFromOpeningReferenceObject(
  o: Record<string, unknown>,
): OpeningReferenceMonthRequest | null {
  const refM =
    typeof o.referenceMonth === "string"
      ? o.referenceMonth.trim()
      : typeof o.reference_month === "string"
        ? (o.reference_month as string).trim()
        : "";
  if (!YM_RE.test(refM)) return null;

  const syndicAllocationRule = apiSyndicFromUnknown(
    o.syndicAllocationRule ?? o.syndic_allocation_rule,
  );
  if (!syndicAllocationRule) return null;

  const extraFeePerUnitCents = readNumericCents(
    o,
    "extraFeePerUnitCents",
    "extra_fee_per_unit_cents",
  );
  const reserveFundPerUnitCents = readNumericCents(
    o,
    "reserveFundPerUnitCents",
    "reserve_fund_per_unit_cents",
  );
  const expectedCommonExpensesCents = readNumericCents(
    o,
    "expectedCommonExpensesCents",
    "expected_common_expenses_cents",
  );
  const expectedSyndicShareTotalCents = readNumericCents(
    o,
    "expectedSyndicShareTotalCents",
    "expected_syndic_share_total_cents",
  );
  const expectedBoletoTotalCents = readNumericCents(
    o,
    "expectedBoletoTotalCents",
    "expected_boleto_total_cents",
  );

  if (
    extraFeePerUnitCents === undefined ||
    reserveFundPerUnitCents === undefined ||
    expectedCommonExpensesCents === undefined ||
    expectedSyndicShareTotalCents === undefined ||
    expectedBoletoTotalCents === undefined
  ) {
    return null;
  }

  const gas = readNumericCents(
    o,
    "optionalGasTotalCents",
    "optional_gas_total_cents",
  );

  const req: OpeningReferenceMonthRequest = {
    referenceMonth: refM,
    syndicAllocationRule,
    extraFeePerUnitCents,
    reserveFundPerUnitCents,
    expectedCommonExpensesCents,
    expectedSyndicShareTotalCents,
    expectedBoletoTotalCents,
  };
  if (gas !== undefined) req.optionalGasTotalCents = gas;
  return req;
}

export function openingReferenceRequestsEqual(
  a: OpeningReferenceMonthRequest,
  b: OpeningReferenceMonthRequest,
): boolean {
  if (a.referenceMonth.trim() !== b.referenceMonth.trim()) return false;
  if (
    normSyndicRule(a.syndicAllocationRule) !==
    normSyndicRule(b.syndicAllocationRule)
  )
    return false;
  const keys = [
    "extraFeePerUnitCents",
    "reserveFundPerUnitCents",
    "expectedCommonExpensesCents",
    "expectedSyndicShareTotalCents",
    "expectedBoletoTotalCents",
  ] as const satisfies readonly (keyof OpeningReferenceMonthRequest)[];
  for (const k of keys) if (a[k] !== b[k]) return false;
  const ga = a.optionalGasTotalCents;
  const gb = b.optionalGasTotalCents;
  if ((ga === undefined || ga === null) && (gb === undefined || gb === null))
    return true;
  return ga === gb;
}

/**
 * Evita repetir POST /opening-reference-month quando o snapshot devolvido
 * por GET /setup/status coincide com os montantes que pretendemos gravar.
 */
export function openingReferenceSnapshotMatchesRequest(
  status: SetupStatusPayload,
  body: OpeningReferenceMonthRequest,
): boolean {
  const raw = status.openingReference;
  if (raw === null || raw === undefined || typeof raw !== "object")
    return false;

  const fromServer = buildOpeningReferenceRequestFromOpeningReferenceObject(
    raw as Record<string, unknown>,
  );
  return fromServer !== null && openingReferenceRequestsEqual(fromServer, body);
}
