import type { SyndicAllocationRuleApi } from "./setupApi";

/** Parâmetros explícitos gravados para um mês de boletos (`YYYY-MM`). */
export interface BillingPolicyMonthRecord {
  targetMonth: string;
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  syndicShareTotalCents: number;
  syndicAllocationRule: SyndicAllocationRuleApi;
  gasPricePerM3Cents: number | null;
  recordedAt: string;
  recordedByUserId?: string | null;
}

/** Corpo de `PUT /billing-policy/months/{targetMonth}`. */
export interface PutBillingPolicyMonthRequest {
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  syndicShareTotalCents: number;
  syndicAllocationRule: SyndicAllocationRuleApi;
  gasPricePerM3Cents?: number | null;
}

/** Resposta de `GET /billing-policy/resolve?targetMonth=`. */
export interface ResolvedBillingPolicyResponse {
  targetMonth: string;
  /** Mês de onde vieram os valores (pode ser igual a `targetMonth`). */
  sourceMonth: string | null;
  /** `true` se existe snapshot explícito para `targetMonth`. */
  explicit: boolean;
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  syndicShareTotalCents: number;
  syndicAllocationRule: SyndicAllocationRuleApi;
  gasPricePerM3Cents: number | null;
  recordedAt: string | null;
}

/** Evento append-only exposto para auditoria (`GET /billing-policy/events`). */
export interface BillingPolicyEventDto {
  id: string;
  type: "monthly_billing_parameters_recorded";
  targetMonth: string;
  payload: PutBillingPolicyMonthRequest;
  recordedAt: string;
  recordedByUserId?: string | null;
}
