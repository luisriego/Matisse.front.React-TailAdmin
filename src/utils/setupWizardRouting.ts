import type { SetupStatusPayload } from "../types/setupApi";

export type AssignGuard = {
  canAssignNow: boolean;
  wizardStepWhenUnitsExist: number;
  hint?: string;
};

function recordSteps(steps: SetupStatusPayload["steps"]): Record<string, unknown> {
  if (steps && typeof steps === "object" && !Array.isArray(steps)) {
    return steps as Record<string, unknown>;
  }
  return {};
}

function flagTrue(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true;
}

/** Backend pode atrasar `steps.openingReferenceMonth` — `openingReference` já reflete o último POST. */
function hasOpeningReferenceOnStatus(status: SetupStatusPayload): boolean {
  const o = status.openingReference;
  if (o === null || o === undefined || typeof o !== "object") return false;
  const recAt =
    typeof (o as { recordedAt?: unknown }).recordedAt === "string"
      ? (o as { recordedAt: string }).recordedAt
      : typeof (o as { recorded_at?: unknown }).recorded_at === "string"
        ? (o as { recorded_at: string }).recorded_at
        : "";
  if (recAt.trim() !== "") return true;
  const rm =
    typeof (o as { referenceMonth?: unknown }).referenceMonth === "string"
      ? (o as { referenceMonth: string }).referenceMonth
      : typeof (o as { reference_month?: unknown }).reference_month ===
          "string"
        ? (o as { reference_month: string }).reference_month
        : "";
  return typeof rm === "string" && /^\d{4}-\d{2}$/.test(rm.trim());
}

/**
 * Com apartamentos já vindos de `GET .../actives`: onde abrir o wizard em relação a `/setup/status`,
 * para não mostrar só «atribuir unidade» antes de contas / gás / leituras quando o backend ainda recusa o PUT.
 */
export function assignGuardWhenUnitsExist(status: SetupStatusPayload): AssignGuard {
  if (status.complete === true) {
    return { canAssignNow: true, wizardStepWhenUnitsExist: 0 };
  }

  const rec = recordSteps(status.steps);
  const initialBalancesOk = flagTrue(rec, "initialBalances");
  const gasPriceOk = flagTrue(rec, "gasPrice");
  const gasReadingsOk = flagTrue(rec, "gasReadings");
  const initialExpensesOk = flagTrue(rec, "initialExpenses");
  const openingRefMonthOk = flagTrue(rec, "openingReferenceMonth");
  const openingRefSatisfied =
    openingRefMonthOk || hasOpeningReferenceOnStatus(status);

  if (!initialBalancesOk) {
    return { canAssignNow: false, wizardStepWhenUnitsExist: 3 };
  }
  if (!gasPriceOk) {
    return { canAssignNow: false, wizardStepWhenUnitsExist: 4 };
  }

  /*
   * `steps.gasReadings` / `steps.initialExpenses` podem ficar falsos quando a projeção
   * atrasada falha atrás dos factos já persistidos — em especial depois do POST do mês de abertura.
   * Se já existir snapshot em `openingReference`, não impedir «Atribuir unidade»: o PUT indica erro se recusarem.
   */
  if ((!gasReadingsOk || !initialExpensesOk) && !openingRefSatisfied) {
    const msg =
      typeof status.message === "string" && status.message.trim() !== ""
        ? status.message.trim()
        : "Antes de atribuir, conclua as leituras de gás (todas as unidades activas) e registe pelo menos uma despesa no servidor.";
    return {
      canAssignNow: false,
      wizardStepWhenUnitsExist: 0,
      hint: msg,
    };
  }

  if (!openingRefSatisfied) {
    return {
      canAssignNow: false,
      wizardStepWhenUnitsExist: 5,
      hint:
        "Antes de atribuir a sua unidade, conclua o passo 5 (mês de referência e totais previstos) e grave no servidor.",
    };
  }

  /** Pré-requisitos do `/setup/status` cumpridos: o admin pode concluir com o PUT de atribuição (mesmo que `complete` ainda não tenha sido actualizado pelo backend). */
  return { canAssignNow: true, wizardStepWhenUnitsExist: 0 };
}
