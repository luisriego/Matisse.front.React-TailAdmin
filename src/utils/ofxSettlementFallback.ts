import { loadMonthBillingParams } from "./billingPolicyService";
import type { CreditDraftLine } from "./ofxPreviewDrafts";
import { parseMoneyToCentsLocalized } from "./moneyParsing";

export type SettlementFallbackCents = {
  extraFeePerUnitCents: number | null;
  reserveFundPerUnitCents: number | null;
  sourceMonth: string;
};

/** Mês de competência da liquidação (YYYY-MM) a partir dos créditos do preview. */
export function pickSettlementMonthFromCredits(
  credits: Array<{ settlementMonth?: string }>,
): string {
  const raw = credits.find((c) => c.settlementMonth?.trim())?.settlementMonth?.trim() ?? "";
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  return "";
}

export function creditNeedsSettlementSplit(c: CreditDraftLine): boolean {
  return c.creditKind !== "other";
}

/** Taxa extra / fundo de reserva por unidade para o mês de despesa da liquidação. */
export async function resolveSettlementFallbackCents(
  settlementMonth: string,
): Promise<SettlementFallbackCents> {
  const params = await loadMonthBillingParams(settlementMonth);
  return {
    extraFeePerUnitCents: parseMoneyToCentsLocalized(params.extraFee),
    reserveFundPerUnitCents: parseMoneyToCentsLocalized(params.reserveFund),
    sourceMonth: settlementMonth,
  };
}

export function mergeSettlementFallbackIntoConfirmBody(
  body: Record<string, unknown>,
  fallback: SettlementFallbackCents,
): void {
  if (
    fallback.extraFeePerUnitCents !== null &&
    body.settlementExtraFeePerUnitCents === undefined
  ) {
    body.settlementExtraFeePerUnitCents = fallback.extraFeePerUnitCents;
  }
  if (
    fallback.reserveFundPerUnitCents !== null &&
    body.settlementReserveFundPerUnitCents === undefined
  ) {
    body.settlementReserveFundPerUnitCents = fallback.reserveFundPerUnitCents;
  }
}

export function mergeSettlementFallbackIntoCreditLine(
  line: Record<string, unknown>,
  fallback: SettlementFallbackCents,
): void {
  if (
    line.creditKind === "boleto_settlement" &&
    !Number.isFinite(line.settlementExtraFeePerUnitCents as number) &&
    fallback.extraFeePerUnitCents !== null
  ) {
    line.settlementExtraFeePerUnitCents = fallback.extraFeePerUnitCents;
  }
  if (
    line.creditKind === "boleto_settlement" &&
    !Number.isFinite(line.settlementReserveFundPerUnitCents as number) &&
    fallback.reserveFundPerUnitCents !== null
  ) {
    line.settlementReserveFundPerUnitCents = fallback.reserveFundPerUnitCents;
  }
}

export function formatMissingSettlementParamsMessage(monthYm: string): string {
  return (
    `Faltam taxa extra e fundo de reserva para ${monthYm}. ` +
    "Defina-os em Boletos (parâmetros do mês) ou guarde a política de cobrança antes de confirmar o extrato."
  );
}

export function settlementFallbackIsComplete(
  fallback: SettlementFallbackCents,
): boolean {
  return (
    fallback.extraFeePerUnitCents !== null &&
    fallback.reserveFundPerUnitCents !== null &&
    fallback.extraFeePerUnitCents >= 0 &&
    fallback.reserveFundPerUnitCents >= 0
  );
}
