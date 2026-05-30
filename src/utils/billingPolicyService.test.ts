import { beforeEach, describe, expect, it } from "vitest";
import {
  loadMonthBillingParams,
  saveMonthBillingParams,
} from "./billingPolicyService";
import {
  mswBillingPolicyStore,
  resetMswBillingPolicyStore,
} from "../tests/mocks/billingPolicyHandlers";

describe("billingPolicyService", () => {
  beforeEach(() => {
    localStorage.clear();
    resetMswBillingPolicyStore();
    localStorage.setItem("token", "test-token");
  });

  it("carrega parâmetros resolvidos da API", async () => {
    mswBillingPolicyStore["2026-01"] = {
      targetMonth: "2026-01",
      extraFeePerUnitCents: 25000,
      reserveFundPerUnitCents: 9370,
      syndicShareTotalCents: 60000,
      syndicAllocationRule: "equal_parts",
      gasPricePerM3Cents: 2600,
      recordedAt: "2026-01-01T00:00:00Z",
    };

    const params = await loadMonthBillingParams("2026-01");
    expect(params.source).toBe("api");
    expect(params.extraFee).toBe("250,00");
    expect(params.gasPricePerM3).toBe("26,00");
  });

  it("persiste via PUT e actualiza cache local", async () => {
    const { syncedToApi } = await saveMonthBillingParams("2026-04", {
      extraFee: "280,00",
      reserveFund: "93,70",
      syndicFee: "600,00",
      syndicDistribution: "EQUAL",
      gasPricePerM3: "27,00",
    });

    expect(syncedToApi).toBe(true);
    expect(mswBillingPolicyStore["2026-04"]?.extraFeePerUnitCents).toBe(28000);

    const loaded = await loadMonthBillingParams("2026-04");
    expect(loaded.extraFee).toBe("280,00");
    expect(loaded.explicit).toBe(true);
  });
});
