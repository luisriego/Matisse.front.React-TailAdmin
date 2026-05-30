import type {
  BillingPolicyEventDto,
  PutBillingPolicyMonthRequest,
  ResolvedBillingPolicyResponse,
} from "../types/billingPolicyApi";
import type { SyndicAllocationRuleApi } from "../types/setupApi";
import { parseJsonResponseBody } from "./safeJsonResponse";

function unwrapEnvelope<T extends object>(raw: unknown): T {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (o.data && typeof o.data === "object") return o.data as T;
    if (o.content && typeof o.content === "object") return o.content as T;
  }
  return (raw ?? {}) as T;
}

function readInt(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): number | undefined {
  const a = o[camel];
  if (typeof a === "number" && Number.isFinite(a)) return Math.trunc(a);
  const b = o[snake];
  if (typeof b === "number" && Number.isFinite(b)) return Math.trunc(b);
  return undefined;
}

function readNullableInt(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): number | null | undefined {
  const a = o[camel];
  if (a === null) return null;
  const b = o[snake];
  if (b === null) return null;
  return readInt(o, camel, snake);
}

function normSyndicRule(value: unknown): SyndicAllocationRuleApi {
  if (typeof value !== "string") return "equal_parts";
  const n = value.trim().replace(/-/g, "_").toLowerCase();
  return n === "ideal_fraction" ? "ideal_fraction" : "equal_parts";
}

function parseResolved(raw: unknown): ResolvedBillingPolicyResponse {
  const o = unwrapEnvelope<Record<string, unknown>>(raw);
  const targetMonth =
    typeof o.targetMonth === "string"
      ? o.targetMonth
      : typeof o.target_month === "string"
        ? (o.target_month as string)
        : "";
  const sourceMonthRaw =
    typeof o.sourceMonth === "string"
      ? o.sourceMonth
      : typeof o.source_month === "string"
        ? (o.source_month as string)
        : null;

  return {
    targetMonth,
    sourceMonth: sourceMonthRaw,
    explicit: o.explicit === true,
    extraFeePerUnitCents:
      readInt(o, "extraFeePerUnitCents", "extra_fee_per_unit_cents") ?? 0,
    reserveFundPerUnitCents:
      readInt(o, "reserveFundPerUnitCents", "reserve_fund_per_unit_cents") ?? 0,
    syndicShareTotalCents:
      readInt(o, "syndicShareTotalCents", "syndic_share_total_cents") ?? 60000,
    syndicAllocationRule: normSyndicRule(
      o.syndicAllocationRule ?? o.syndic_allocation_rule,
    ),
    gasPricePerM3Cents:
      readNullableInt(o, "gasPricePerM3Cents", "gas_price_per_m3_cents") ??
      null,
    recordedAt:
      typeof o.recordedAt === "string"
        ? o.recordedAt
        : typeof o.recorded_at === "string"
          ? (o.recorded_at as string)
          : null,
  };
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export class BillingPolicyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BillingPolicyApiError";
  }
}

/** `true` se o endpoint ainda não existe (404/501) — usar fallback local. */
export function isBillingPolicyApiUnavailableError(err: unknown): boolean {
  return (
    err instanceof BillingPolicyApiError &&
    (err.status === 404 || err.status === 501)
  );
}

export async function fetchResolvedBillingPolicy(
  token: string,
  targetMonth: string,
): Promise<ResolvedBillingPolicyResponse> {
  const query = new URLSearchParams({
    targetMonth,
    target_month: targetMonth,
  });
  const res = await fetch(`/api/v1/billing-policy/resolve?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });

  if (!res.ok) {
    const errData = await parseJsonResponseBody<{ message?: string }>(res);
    throw new BillingPolicyApiError(
      errData?.message || `Falha ao resolver política (${res.status}).`,
      res.status,
    );
  }

  const raw = await res.json();
  return parseResolved(raw);
}

export async function putBillingPolicyMonth(
  token: string,
  targetMonth: string,
  body: PutBillingPolicyMonthRequest,
): Promise<void> {
  const payload = {
    extraFeePerUnitCents: body.extraFeePerUnitCents,
    extra_fee_per_unit_cents: body.extraFeePerUnitCents,
    reserveFundPerUnitCents: body.reserveFundPerUnitCents,
    reserve_fund_per_unit_cents: body.reserveFundPerUnitCents,
    syndicShareTotalCents: body.syndicShareTotalCents,
    syndic_share_total_cents: body.syndicShareTotalCents,
    syndicAllocationRule: body.syndicAllocationRule,
    syndic_allocation_rule: body.syndicAllocationRule,
    gasPricePerM3Cents: body.gasPricePerM3Cents ?? null,
    gas_price_per_m3_cents: body.gasPricePerM3Cents ?? null,
  };

  const res = await fetch(`/api/v1/billing-policy/months/${targetMonth}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await parseJsonResponseBody<{ message?: string }>(res);
    throw new BillingPolicyApiError(
      errData?.message || `Falha ao gravar parâmetros (${res.status}).`,
      res.status,
    );
  }
}

export async function fetchBillingPolicyEvents(
  token: string,
  limit = 50,
): Promise<BillingPolicyEventDto[]> {
  const res = await fetch(`/api/v1/billing-policy/events?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const errData = await parseJsonResponseBody<{ message?: string }>(res);
    throw new BillingPolicyApiError(
      errData?.message || `Falha ao listar eventos (${res.status}).`,
      res.status,
    );
  }
  const raw = unwrapEnvelope<{ events?: unknown[] }>(await res.json());
  const list = Array.isArray(raw.events) ? raw.events : [];
  return list.filter((e): e is BillingPolicyEventDto => !!e && typeof e === "object") as BillingPolicyEventDto[];
}
