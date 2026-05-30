import { describe, expect, it } from "vitest";
import {
  buildOpeningReferenceRequestFromOpeningReferenceObject,
  openingReferenceRequestsEqual,
  openingReferenceSnapshotMatchesRequest,
} from "./openingReferenceSnapshot";
import type {
  OpeningReferenceMonthRequest,
  SetupStatusPayload,
} from "../types/setupApi";

describe("openingReferenceSnapshotMatchesRequest", () => {
  const body: OpeningReferenceMonthRequest = {
    referenceMonth: "2026-01",
    syndicAllocationRule: "equal_parts",
    extraFeePerUnitCents: 25000,
    reserveFundPerUnitCents: 9370,
    expectedCommonExpensesCents: 348461,
    expectedSyndicShareTotalCents: 60000,
    expectedBoletoTotalCents: 596766,
    optionalGasTotalCents: 16455,
  };

  it("devolve verdade quando o servidor devolve camelCase igual", () => {
    const status: SetupStatusPayload = {
      complete: false,
      currentStep: 0,
      steps: {},
      openingReference: {
        ...body,
        recordedAt: "2026-05-10T13:01:10.000000Z",
      },
    };
    expect(openingReferenceSnapshotMatchesRequest(status, body)).toBe(true);
  });

  it("devolve verdade quando o servidor só expõe snake_case", () => {
    const status: SetupStatusPayload = {
      complete: false,
      currentStep: 0,
      steps: {},
      openingReference: {
        reference_month: "2026-01",
        syndic_allocation_rule: "equal_parts",
        extra_fee_per_unit_cents: 25000,
        reserve_fund_per_unit_cents: 9370,
        expected_common_expenses_cents: 348461,
        expected_syndic_share_total_cents: 60000,
        expected_boleto_total_cents: 596766,
        optional_gas_total_cents: 16455,
        recorded_at: "2026-05-10T13:01:10.000000Z",
      } as unknown as NonNullable<
        SetupStatusPayload["openingReference"]
      >,
    };
    expect(openingReferenceSnapshotMatchesRequest(status, body)).toBe(true);
  });

  it("devolve falsidade quando falta campo em cêntimos", () => {
    const status: SetupStatusPayload = {
      complete: false,
      currentStep: 0,
      steps: {},
      openingReference: {
        referenceMonth: "2026-01",
        syndicAllocationRule: "equal_parts",
        extraFeePerUnitCents: 25000,
        reserveFundPerUnitCents: 9370,
        recordedAt: "2026-05-10T13:01:10.000000Z",
      } as OpeningReferenceMonthRequest & {
        recordedAt: string;
      },
    };
    expect(openingReferenceSnapshotMatchesRequest(status, body)).toBe(false);
  });

  it("aceita importes em string no JSON do servidor", () => {
    const status: SetupStatusPayload = {
      complete: false,
      currentStep: 0,
      steps: {},
      openingReference: {
        referenceMonth: "2026-01",
        syndicAllocationRule: "equal_parts",
        extraFeePerUnitCents: "25000",
        reserveFundPerUnitCents: "9370",
        expectedCommonExpensesCents: "348461",
        expectedSyndicShareTotalCents: "60000",
        expectedBoletoTotalCents: "596766",
        optionalGasTotalCents: "16455",
        recordedAt: "2026-05-10T13:01:10.000000Z",
      } as unknown as NonNullable<SetupStatusPayload["openingReference"]>,
    };
    expect(openingReferenceSnapshotMatchesRequest(status, body)).toBe(true);
  });
});

describe("buildOpeningReferenceRequestFromOpeningReferenceObject", () => {
  it("monta o pedido a partir de snake_case", () => {
    const raw = {
      reference_month: "2026-01",
      syndic_allocation_rule: "equal_parts",
      extra_fee_per_unit_cents: 25000,
      reserve_fund_per_unit_cents: 9370,
      expected_common_expenses_cents: 348461,
      expected_syndic_share_total_cents: 60000,
      expected_boleto_total_cents: 596766,
    };
    const built = buildOpeningReferenceRequestFromOpeningReferenceObject(raw);
    expect(built).not.toBeNull();
    expect(built!.referenceMonth).toBe("2026-01");
    expect(openingReferenceRequestsEqual(built!, built!)).toBe(true);
  });
});
