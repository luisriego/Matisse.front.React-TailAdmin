import type { SetupStatusPayload, SetupStepKey } from "../types/setupApi";
import type { SetupCatalogs } from "./setupGate";
import { needsSetup, prepareSetupStatusFromFetch } from "./setupGate";

export function isBasicCatalogsComplete(catalogs: SetupCatalogs): boolean {
  return !needsSetup(catalogs);
}

/** Passos obrigatórios no servidor (saldos, gás, leituras) — GET /api/v1/setup/status.complete */
export function needsCoreSetup(status: SetupStatusPayload): boolean {
  return status.complete !== true;
}

export function needsAnySetup(
  catalogs: SetupCatalogs,
  status: SetupStatusPayload,
): boolean {
  return needsSetup(catalogs) || needsCoreSetup(status);
}

export type CoreSetupStepInfo = {
  key: SetupStepKey;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

function stepIsComplete(steps: SetupStatusPayload["steps"], key: string): boolean {
  if (!steps || typeof steps !== "object" || Array.isArray(steps)) {
    return false;
  }
  const v = (steps as Record<string, unknown>)[key];
  return v === true || v === "complete";
}

const CORE_STEP_UI: Array<{
  key: SetupStepKey;
  label: string;
  hint: string;
  href: string;
}> = [
  {
    key: "initialBalances",
    label: "Saldos iniciais das contas",
    hint: "Confirme o saldo de cada conta (ícone $ na lista de contas). O total deve bater com o extrato bancário.",
    href: "/contas",
  },
  {
    key: "gasPrice",
    label: "Preço do gás (R$/m³)",
    hint: "Defina no assistente de configuração (ecrã de gás).",
    href: "/",
  },
  {
    key: "gasReadings",
    label: "Leituras iniciais do contador de gás",
    hint: "Registe a leitura de cada unidade no assistente de configuração.",
    href: "/",
  },
];

export function listCoreSetupSteps(
  status: SetupStatusPayload,
): CoreSetupStepInfo[] {
  return CORE_STEP_UI.map((row) => ({
    ...row,
    done: stepIsComplete(status.steps, row.key),
  }));
}

/** Única rota auxiliar durante setup core: saldos iniciais em Contas. Boletos fica bloqueado até concluir gás. */
export const CORE_SETUP_WORK_PATHS = ["/contas"] as const;

export function isCoreSetupWorkPath(pathname: string): boolean {
  return CORE_SETUP_WORK_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function pendingCoreStepKeys(status: SetupStatusPayload): SetupStepKey[] {
  return listCoreSetupSteps(status)
    .filter((s) => !s.done)
    .map((s) => s.key);
}

export function countPendingCoreSteps(status: SetupStatusPayload): number {
  return listCoreSetupSteps(status).filter((s) => !s.done).length;
}

/** Flags usadas por ProtectedRoute / useSetupGate (função pura para testes). */
export function resolveSetupGateFlags(
  catalogs: SetupCatalogs,
  apiStatus: SetupStatusPayload,
  storedSetup: SetupStatusPayload | null = null,
): {
  status: SetupStatusPayload;
  needsSetup: boolean;
  needsCoreSetup: boolean;
} {
  const status = prepareSetupStatusFromFetch(apiStatus, storedSetup);
  const basicRequired = needsSetup(catalogs);
  const coreRequired =
    isBasicCatalogsComplete(catalogs) && needsCoreSetup(status);
  return {
    status,
    needsSetup: basicRequired,
    needsCoreSetup: coreRequired,
  };
}
