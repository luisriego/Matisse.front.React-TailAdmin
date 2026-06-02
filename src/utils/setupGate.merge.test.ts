import { describe, expect, it } from "vitest";
import { getSetupStepStatus } from "../types/setupApi";
import {
  mergeSetupStatusFromStorage,
  prepareSetupStatusFromFetch,
} from "./setupGate";

describe("mergeSetupStatusFromStorage", () => {
  it("não repõe complete=false de sessionStorage quando a API diz complete", () => {
    const api = {
      complete: true,
      currentStep: 5,
      steps: {
        initialBalances: "complete",
        gasPrice: "complete",
        gasReadings: "complete",
      },
    };
    const stored = {
      complete: false,
      currentStep: 2,
      steps: {
        gasPrice: "pending",
        gasReadings: "pending",
      },
    };
    const merged = mergeSetupStatusFromStorage(api, stored);
    expect(merged.complete).toBe(true);
    expect(getSetupStepStatus(merged.steps, "gasPrice")).toBe("complete");
  });

  it("prepareSetupStatusFromFetch devolve API intacta quando complete", () => {
    const api = {
      complete: true,
      currentStep: 5,
      steps: { gasPrice: "complete", gasReadings: "complete" },
    };
    const stored = {
      complete: false,
      currentStep: 1,
      steps: { gasPrice: "pending" },
    };
    expect(prepareSetupStatusFromFetch(api, stored).complete).toBe(true);
  });

  it("usa passos da API sobre os armazenados quando ainda incompleto", () => {
    const api = {
      complete: false,
      currentStep: 3,
      steps: { gasPrice: "complete", gasReadings: "pending" },
    };
    const stored = {
      complete: false,
      currentStep: 2,
      steps: { gasPrice: "pending", gasReadings: "pending" },
    };
    const merged = mergeSetupStatusFromStorage(api, stored);
    expect(getSetupStepStatus(merged.steps, "gasPrice")).toBe("complete");
    expect(getSetupStepStatus(merged.steps, "gasReadings")).toBe("pending");
  });
});
