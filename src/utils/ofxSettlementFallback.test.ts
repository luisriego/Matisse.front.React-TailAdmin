import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  pickSettlementMonthFromCredits,
  mergeSettlementFallbackIntoConfirmBody,
  mergeSettlementFallbackIntoCreditLine,
  settlementFallbackIsComplete,
  formatMissingSettlementParamsMessage,
} from "./ofxSettlementFallback";
import * as billingPolicyService from "./billingPolicyService";

describe("ofxSettlementFallback", () => {
  it("pickSettlementMonthFromCredits lê YYYY-MM", () => {
    expect(
      pickSettlementMonthFromCredits([
        { settlementMonth: "2026-03" },
        { settlementMonth: "2026-04" },
      ]),
    ).toBe("2026-03");
  });

  it("mergeSettlementFallbackIntoConfirmBody preenche campos em falta", () => {
    const body: Record<string, unknown> = { bankAccountId: "b1", lines: [] };
    mergeSettlementFallbackIntoConfirmBody(body, {
      extraFeePerUnitCents: 25000,
      reserveFundPerUnitCents: 9370,
      sourceMonth: "2026-03",
    });
    expect(body.settlementExtraFeePerUnitCents).toBe(25000);
    expect(body.settlementReserveFundPerUnitCents).toBe(9370);
  });

  it("mergeSettlementFallbackIntoCreditLine não sobrescreve valores do ingest", () => {
    const line: Record<string, unknown> = {
      creditKind: "boleto_settlement",
      settlementExtraFeePerUnitCents: 99,
    };
    mergeSettlementFallbackIntoCreditLine(line, {
      extraFeePerUnitCents: 25000,
      reserveFundPerUnitCents: 9370,
      sourceMonth: "2026-03",
    });
    expect(line.settlementExtraFeePerUnitCents).toBe(99);
    expect(line.settlementReserveFundPerUnitCents).toBe(9370);
  });

  it("settlementFallbackIsComplete exige ambos os valores", () => {
    expect(
      settlementFallbackIsComplete({
        extraFeePerUnitCents: 1,
        reserveFundPerUnitCents: 2,
        sourceMonth: "2026-03",
      }),
    ).toBe(true);
    expect(
      settlementFallbackIsComplete({
        extraFeePerUnitCents: null,
        reserveFundPerUnitCents: 2,
        sourceMonth: "2026-03",
      }),
    ).toBe(false);
  });

  it("formatMissingSettlementParamsMessage menciona Boletos", () => {
    expect(formatMissingSettlementParamsMessage("2026-03")).toMatch(/Boletos/i);
  });
});

describe("resolveSettlementFallbackCents (integração leve)", () => {
  const loadSpy = vi.spyOn(billingPolicyService, "loadMonthBillingParams");

  beforeEach(() => {
    loadSpy.mockResolvedValue({
      extraFee: "250,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "26,00",
      source: "local",
      sourceMonth: null,
      explicit: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("converte parâmetros do mês para céntimos", async () => {
    const { resolveSettlementFallbackCents } = await import("./ofxSettlementFallback");
    const out = await resolveSettlementFallbackCents("2026-03");
    expect(out.extraFeePerUnitCents).toBe(25000);
    expect(out.reserveFundPerUnitCents).toBe(9370);
    expect(settlementFallbackIsComplete(out)).toBe(true);
  });
});
