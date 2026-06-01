import { describe, expect, it } from "vitest";
import type { ResidentUnit } from "../types/residentUnit";
import {
  needsSetup,
  resolveSetupStep,
  missingSetupItems,
  type SetupCatalogs,
} from "./setupGate";

const sampleUnit: ResidentUnit = {
  id: "u1",
  unit: "101",
  idealFraction: 0.2,
  isActive: true,
  createdAt: "2024-01-01 00:00:00",
  updatedAt: null,
  notificationRecipients: [],
};

const emptyCatalogs: SetupCatalogs = {
  units: [],
  accounts: [],
  expenseTypes: [],
  incomeTypes: [],
  gasPriceCents: null,
};

const completeCatalogs: SetupCatalogs = {
  units: [sampleUnit],
  accounts: [{ id: "a1", name: "Caixa" }],
  expenseTypes: ["services"],
  incomeTypes: [{ id: "i1" }],
  gasPriceCents: 2600,
};

describe("setupGate", () => {
  it("needsSetup exige unidades, tipos e contas", () => {
    expect(needsSetup(emptyCatalogs)).toBe(true);
    expect(needsSetup(completeCatalogs)).toBe(false);
    expect(
      needsSetup({ ...completeCatalogs, units: [] }),
    ).toBe(true);
    expect(
      needsSetup({ ...completeCatalogs, expenseTypes: [] }),
    ).toBe(true);
    expect(
      needsSetup({ ...completeCatalogs, incomeTypes: [] }),
    ).toBe(true);
    expect(
      needsSetup({ ...completeCatalogs, accounts: [] }),
    ).toBe(true);
  });

  it("resolveSetupStep prioriza unidades, depois tipos, depois contas", () => {
    expect(resolveSetupStep(emptyCatalogs)).toBe(0);
    expect(
      resolveSetupStep({
        ...emptyCatalogs,
        units: [sampleUnit],
      }),
    ).toBe(1);
    expect(
      resolveSetupStep({
        ...completeCatalogs,
        accounts: [],
      }),
    ).toBe(2);
    expect(resolveSetupStep(completeCatalogs)).toBe(0);
  });

  it("missingSetupItems lista pendências", () => {
    expect(missingSetupItems(emptyCatalogs)).toEqual([
      "unidades residenciais",
      "tipos de gasto",
      "tipos de ingreso",
      "contas contábeis",
    ]);
    expect(missingSetupItems(completeCatalogs)).toEqual([]);
  });
});
