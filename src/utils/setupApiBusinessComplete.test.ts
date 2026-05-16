import { describe, it, expect, beforeEach } from "vitest";
import {
  LOCAL_BUSINESS_SETUP_COMPLETE_KEY,
  applyBusinessSetupCompleteFromStatus,
  shouldMarkBusinessSetupComplete,
} from "./setupApi";

describe("regla negocio: marca local de alta completada", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shouldMarkBusinessSetupComplete con complete=true", () => {
    expect(
      shouldMarkBusinessSetupComplete({
        complete: true,
        currentStep: 0,
        steps: {},
      }),
    ).toBe(true);
  });

  it("shouldMarkBusinessSetupComplete con openingReference.recordedAt", () => {
    expect(
      shouldMarkBusinessSetupComplete({
        complete: false,
        currentStep: 0,
        steps: {},
        openingReference: {
          referenceMonth: "2026-01",
          syndicAllocationRule: "equal_parts",
          extraFeePerUnitCents: 0,
          reserveFundPerUnitCents: 0,
          recordedAt: "2026-01-15T00:00:00Z",
        },
      }),
    ).toBe(true);
  });

  it("applyBusinessSetupCompleteFromStatus escribe localStorage", () => {
    applyBusinessSetupCompleteFromStatus({
      complete: true,
      currentStep: 0,
      steps: {},
    });
    expect(localStorage.getItem(LOCAL_BUSINESS_SETUP_COMPLETE_KEY)).toBe(
      "1",
    );
  });
});
