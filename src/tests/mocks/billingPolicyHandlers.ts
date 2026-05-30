import { http, HttpResponse } from "msw";
import {
  resolveBillingPolicyFromSnapshots,
  type BillingPolicySnapshot,
} from "../../utils/billingPolicyResolve";

/** Store in-memory para testes MSW — espelha o event store materializado por mês. */
export const mswBillingPolicyStore: Record<string, BillingPolicySnapshot> = {};

export function resetMswBillingPolicyStore(): void {
  for (const key of Object.keys(mswBillingPolicyStore)) {
    delete mswBillingPolicyStore[key];
  }
}

function readBodyCents(body: Record<string, unknown>, camel: string, snake: string): number {
  const a = body[camel];
  if (typeof a === "number" && Number.isFinite(a)) return Math.trunc(a);
  const b = body[snake];
  if (typeof b === "number" && Number.isFinite(b)) return Math.trunc(b);
  return 0;
}

function readNullableCents(
  body: Record<string, unknown>,
  camel: string,
  snake: string,
): number | null {
  const a = body[camel];
  if (a === null) return null;
  const b = body[snake];
  if (b === null) return null;
  const v = readBodyCents(body, camel, snake);
  return v > 0 ? v : null;
}

function normRule(): "equal_parts" {
  return "equal_parts";
}

export const billingPolicyHandlers = [
  http.get("/api/v1/billing-policy/resolve", ({ request }) => {
    const url = new URL(request.url);
    const targetMonth =
      url.searchParams.get("targetMonth") ??
      url.searchParams.get("target_month") ??
      "";
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      return HttpResponse.json({ message: "targetMonth inválido." }, { status: 400 });
    }
    const resolved = resolveBillingPolicyFromSnapshots(mswBillingPolicyStore, targetMonth);
    return HttpResponse.json({ data: resolved });
  }),

  http.put("/api/v1/billing-policy/months/:ym", async ({ params, request }) => {
    const ym = String(params.ym ?? "");
    if (!/^\d{4}-\d{2}$/.test(ym)) {
      return HttpResponse.json({ message: "Mês inválido." }, { status: 400 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    mswBillingPolicyStore[ym] = {
      targetMonth: ym,
      extraFeePerUnitCents: readBodyCents(body, "extraFeePerUnitCents", "extra_fee_per_unit_cents"),
      reserveFundPerUnitCents: readBodyCents(
        body,
        "reserveFundPerUnitCents",
        "reserve_fund_per_unit_cents",
      ),
      syndicShareTotalCents: readBodyCents(
        body,
        "syndicShareTotalCents",
        "syndic_share_total_cents",
      ),
      syndicAllocationRule: normRule(),
      gasPricePerM3Cents: readNullableCents(
        body,
        "gasPricePerM3Cents",
        "gas_price_per_m3_cents",
      ),
      recordedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ recorded: true }, { status: 201 });
  }),
];
