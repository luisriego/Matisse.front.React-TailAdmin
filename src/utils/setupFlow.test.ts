import { describe, expect, it } from "vitest";
import type { ResidentUnit } from "../types/residentUnit";
import { getSetupStepStatus, type SetupStatusPayload } from "../types/setupApi";
import {
  prepareSetupStatusFromFetch,
  mergeSetupStatusFromStorage,
  type SetupCatalogs,
} from "./setupGate";
import {
  resolveSetupGateFlags,
  needsCoreSetup,
  listCoreSetupSteps,
} from "./setupCoreSteps";

const sampleUnit: ResidentUnit = {
  id: "u1",
  unit: "101",
  idealFraction: 0.2,
  isActive: true,
  createdAt: "2024-01-01",
  updatedAt: null,
  notificationRecipients: [],
};

const completeCatalogs: SetupCatalogs = {
  units: [sampleUnit],
  accounts: [{ id: "a1", name: "Caixa" }],
  expenseTypes: ["services"],
  incomeTypes: [{ id: "i1" }],
  gasPriceCents: 2600,
};

const gasCompleteStatus: SetupStatusPayload = {
  complete: true,
  currentStep: 5,
  steps: {
    initialBalances: "complete",
    gasPrice: "complete",
    gasReadings: "complete",
  },
};

const gasPendingStatus: SetupStatusPayload = {
  complete: false,
  currentStep: 2,
  steps: {
    initialBalances: "complete",
    gasPrice: "pending",
    gasReadings: "pending",
  },
  message: "Falta configurar el precio del gas.",
};

const stale403Setup: SetupStatusPayload = {
  complete: false,
  currentStep: 2,
  steps: {
    initialBalances: "complete",
    gasPrice: "pending",
    gasReadings: "pending",
  },
  message: "Envelope antigo",
};

describe("setupFlow — gás guardado no servidor", () => {
  it("prepareSetupStatusFromFetch ignora sessionStorage quando API diz complete", () => {
    const prepared = prepareSetupStatusFromFetch(gasCompleteStatus, stale403Setup);
    expect(prepared.complete).toBe(true);
    expect(getSetupStepStatus(prepared.steps, "gasPrice")).toBe("complete");
    expect(getSetupStepStatus(prepared.steps, "gasReadings")).toBe("complete");
  });

  it("resolveSetupGateFlags liberta a app após gás (catálogos OK + API complete)", () => {
    const gate = resolveSetupGateFlags(completeCatalogs, gasCompleteStatus, stale403Setup);
    expect(gate.needsSetup).toBe(false);
    expect(gate.needsCoreSetup).toBe(false);
    expect(gate.status.complete).toBe(true);
  });

  it("resolveSetupGateFlags bloqueia painel de gás enquanto API pendente", () => {
    const gate = resolveSetupGateFlags(completeCatalogs, gasPendingStatus, null);
    expect(gate.needsSetup).toBe(false);
    expect(gate.needsCoreSetup).toBe(true);
    expect(listCoreSetupSteps(gate.status).filter((s) => !s.done).map((s) => s.key)).toEqual([
      "gasPrice",
      "gasReadings",
    ]);
  });

  it("merge não rebaixa gasPrice quando API já marcou complete no passo", () => {
    const api: SetupStatusPayload = {
      complete: false,
      currentStep: 3,
      steps: {
        initialBalances: "complete",
        gasPrice: "complete",
        gasReadings: "pending",
      },
    };
    const merged = mergeSetupStatusFromStorage(api, stale403Setup);
    expect(getSetupStepStatus(merged.steps, "gasPrice")).toBe("complete");
    expect(getSetupStepStatus(merged.steps, "gasReadings")).toBe("pending");
    expect(needsCoreSetup(merged)).toBe(true);
  });

  it("fluxo simulado: antes do gás → depois do gás", () => {
    const before = resolveSetupGateFlags(completeCatalogs, gasPendingStatus);
    expect(before.needsCoreSetup).toBe(true);

    const after = resolveSetupGateFlags(completeCatalogs, gasCompleteStatus, stale403Setup);
    expect(after.needsCoreSetup).toBe(false);
    expect(after.status.complete).toBe(true);
  });
});
