import { describe, expect, it } from "vitest";
import { resolveBillingPolicyFromSnapshots } from "./billingPolicyResolve";

describe("resolveBillingPolicyFromSnapshots", () => {
  it("devuelve explícito cuando existe snapshot del mes", () => {
    const resolved = resolveBillingPolicyFromSnapshots(
      {
        "2026-01": {
          targetMonth: "2026-01",
          extraFeePerUnitCents: 25000,
          reserveFundPerUnitCents: 9370,
          syndicShareTotalCents: 60000,
          syndicAllocationRule: "equal_parts",
          gasPricePerM3Cents: 2600,
          recordedAt: "2026-01-01T00:00:00Z",
        },
      },
      "2026-01",
    );
    expect(resolved.explicit).toBe(true);
    expect(resolved.sourceMonth).toBe("2026-01");
    expect(resolved.extraFeePerUnitCents).toBe(25000);
  });

  it("hereda del último mes anterior", () => {
    const resolved = resolveBillingPolicyFromSnapshots(
      {
        "2026-01": {
          targetMonth: "2026-01",
          extraFeePerUnitCents: 25000,
          reserveFundPerUnitCents: 9370,
          syndicShareTotalCents: 60000,
          syndicAllocationRule: "equal_parts",
          gasPricePerM3Cents: 2600,
          recordedAt: "2026-01-01T00:00:00Z",
        },
      },
      "2026-03",
    );
    expect(resolved.explicit).toBe(false);
    expect(resolved.sourceMonth).toBe("2026-01");
    expect(resolved.extraFeePerUnitCents).toBe(25000);
  });

  it("vacío si no hay snapshots previos", () => {
    const resolved = resolveBillingPolicyFromSnapshots({}, "2026-05");
    expect(resolved.sourceMonth).toBeNull();
    expect(resolved.syndicShareTotalCents).toBe(60000);
    expect(resolved.extraFeePerUnitCents).toBe(0);
  });
});
