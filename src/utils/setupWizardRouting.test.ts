import { describe, expect, it } from "vitest";
import { assignGuardWhenUnitsExist } from "./setupWizardRouting";
import type { SetupStatusPayload } from "../types/setupApi";

function status(
  partial: Partial<SetupStatusPayload>,
): SetupStatusPayload {
  return {
    complete: false,
    currentStep: 0,
    steps: {},
    ...partial,
  };
}

describe("assignGuardWhenUnitsExist", () => {
  it("permite atribuir quando complete é true", () => {
    const g = assignGuardWhenUnitsExist(status({ complete: true }));
    expect(g).toEqual({ canAssignNow: true, wizardStepWhenUnitsExist: 0 });
  });

  it("envia ao passo 3 quando initialBalances está false ou ausente", () => {
    expect(
      assignGuardWhenUnitsExist(
        status({ steps: { initialBalances: false, gasPrice: true } }),
      ).wizardStepWhenUnitsExist,
    ).toBe(3);
    expect(
      assignGuardWhenUnitsExist(status({ steps: { gasPrice: true } }))
        .wizardStepWhenUnitsExist,
    ).toBe(3);
  });

  it("envia ao passo 4 quando apenas gasPrice incompleto", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        steps: {
          initialBalances: true,
          gasPrice: false,
          gasReadings: true,
          initialExpenses: true,
        },
      }),
    );
    expect(g.canAssignNow).toBe(false);
    expect(g.wizardStepWhenUnitsExist).toBe(4);
  });

  it("mantém ecrã de atribuição com hint quando faltam leituras ou despesas", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: false,
          initialExpenses: true,
        },
        message: "Falta leitura.",
      }),
    );
    expect(g.canAssignNow).toBe(false);
    expect(g.wizardStepWhenUnitsExist).toBe(0);
    expect(g.hint).toContain("Falta leitura.");
  });

  it("permite atribuir quando todos os passos obrigatórios estão true (mesmo com complete:false)", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        complete: false,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: true,
          initialExpenses: true,
          openingReferenceMonth: true,
        },
      }),
    );
    expect(g.canAssignNow).toBe(true);
    expect(g.wizardStepWhenUnitsExist).toBe(0);
  });

  it("bloqueia atribuir até registar openingReferenceMonth no servidor", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        complete: false,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: true,
          initialExpenses: true,
        },
      }),
    );
    expect(g.canAssignNow).toBe(false);
    expect(g.wizardStepWhenUnitsExist).toBe(5);
    expect(g.hint).toBeDefined();
  });

  it("permite atribuir quando openingReference vem povoado ainda que openingReferenceMonth no steps seja false", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        complete: false,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: true,
          initialExpenses: true,
          openingReferenceMonth: false,
        },
        openingReference: {
          referenceMonth: "2026-05",
          syndicAllocationRule: "equal_parts",
          extraFeePerUnitCents: 25000,
          reserveFundPerUnitCents: 9370,
          recordedAt: "2026-05-10T12:12:12.000000Z",
        },
      }),
    );
    expect(g.canAssignNow).toBe(true);
    expect(g.wizardStepWhenUnitsExist).toBe(0);
  });

  it("reconhece openingReference só em snake_case (recorded_at / reference_month)", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        complete: false,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: true,
          initialExpenses: true,
          openingReferenceMonth: false,
        },
        openingReference: {
          reference_month: "2026-01",
          syndic_allocation_rule: "equal_parts",
          extra_fee_per_unit_cents: 25000,
          reserve_fund_per_unit_cents: 9370,
          recorded_at: "2026-05-10T13:01:10.000000Z",
        } as unknown as NonNullable<
          SetupStatusPayload["openingReference"]
        >,
      }),
    );
    expect(g.canAssignNow).toBe(true);
    expect(g.wizardStepWhenUnitsExist).toBe(0);
  });

  it("permite atribuir com leituras/despesa em false no steps se já existir snapshot openingReference", () => {
    const g = assignGuardWhenUnitsExist(
      status({
        complete: false,
        steps: {
          initialBalances: true,
          gasPrice: true,
          gasReadings: false,
          initialExpenses: false,
          openingReferenceMonth: true,
        },
        openingReference: {
          referenceMonth: "2026-01",
          syndicAllocationRule: "equal_parts",
          extraFeePerUnitCents: 25000,
          reserveFundPerUnitCents: 9370,
          recordedAt: "2026-05-10T13:01:10.000000Z",
        },
      }),
    );
    expect(g.canAssignNow).toBe(true);
    expect(g.wizardStepWhenUnitsExist).toBe(0);
  });
});
