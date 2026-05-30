import { describe, it, expect, beforeEach } from "vitest";
import {
  clearInitialForecastExpectations,
  loadInitialForecastExpectations,
  saveInitialForecastExpectations,
} from "./initialForecastExpectations";

describe("initialForecastExpectations", () => {
  beforeEach(() => {
    clearInitialForecastExpectations();
  });

  it("round-trips save and load", () => {
    saveInitialForecastExpectations({
      targetYm: "2026-01",
      expectedTotal: "5.967,66",
      expectedBase: "3.484,61",
      expectedSyndic: "600,00",
      expectedGas: "164,55",
      syndicDistribution: "EQUAL",
    });
    const row = loadInitialForecastExpectations();
    expect(row?.targetYm).toBe("2026-01");
    expect(row?.expectedTotal).toBe("5.967,66");
    expect(row?.syndicDistribution).toBe("EQUAL");
  });

  it("rejects invalid targetYm on save", () => {
    saveInitialForecastExpectations({
      targetYm: "2026-13",
      expectedTotal: "1,00",
      expectedBase: "1,00",
      expectedSyndic: "1,00",
      expectedGas: "",
      syndicDistribution: "EQUAL",
    });
    expect(loadInitialForecastExpectations()).toBeNull();
  });
});
