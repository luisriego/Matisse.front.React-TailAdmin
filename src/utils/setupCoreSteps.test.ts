import { describe, expect, it } from "vitest";
import {
  needsAnySetup,
  needsCoreSetup,
  listCoreSetupSteps,
} from "./setupCoreSteps";
import type { SetupCatalogs } from "./setupGate";
import { needsSetup } from "./setupGate";

const completeCatalogs: SetupCatalogs = {
  units: [
    {
      id: "u1",
      unit: "101",
      idealFraction: 1,
      isActive: true,
      createdAt: "",
      updatedAt: null,
      notificationRecipients: [],
    },
  ],
  accounts: [{ id: "a1", name: "Principal" }],
  expenseTypes: ["x"],
  incomeTypes: [{ id: "i1" }],
  gasPriceCents: null,
};

describe("setupCoreSteps", () => {
  it("needsCoreSetup quando complete é false", () => {
    expect(needsCoreSetup({ complete: false, currentStep: 1, steps: {} })).toBe(
      true,
    );
    expect(needsCoreSetup({ complete: true, currentStep: 5, steps: {} })).toBe(
      false,
    );
  });

  it("needsAnySetup combina catálogos e core", () => {
    expect(
      needsAnySetup(completeCatalogs, { complete: false, currentStep: 1, steps: {} }),
    ).toBe(true);
    expect(
      needsAnySetup(completeCatalogs, { complete: true, currentStep: 5, steps: {} }),
    ).toBe(false);
    expect(needsSetup({ ...completeCatalogs, units: [] })).toBe(true);
  });

  it("reconhece step complete como string do Symfony", () => {
    const steps = listCoreSetupSteps({
      complete: false,
      currentStep: 1,
      steps: {
        initialBalances: "complete",
        gasPrice: "pending",
        gasReadings: "pending",
      },
    });
    expect(steps.find((s) => s.key === "initialBalances")?.done).toBe(true);
    expect(steps.find((s) => s.key === "gasPrice")?.done).toBe(false);
  });
});
