import type { SetupStatusPayload } from "../types/setupApi";
import type { ResidentUnit } from "../types/residentUnit";
import { fetchActiveResidentUnits } from "./fetchActiveResidentUnits";
import { fetchExistingGasPriceCents } from "./fetchExistingGasPriceCents";
import { fetchTypeCatalogs } from "./fetchTypeCatalogs";

export interface SetupCatalogs {
  units: ResidentUnit[];
  accounts: Array<{ id: string; name: string }>;
  expenseTypes: unknown[];
  incomeTypes: unknown[];
  gasPriceCents: number | null;
  /** Diagnóstico quando income-types falha ou vem vazio */
  incomeTypesHint?: string | null;
}

export const SETUP_STEP_LABELS = [
  "Unidades residenciais",
  "Tipos de ingreso y gasto",
  "Cuentas contables",
] as const;

export type SetupBasicStep = 0 | 1 | 2;

export function needsSetup(catalogs: SetupCatalogs): boolean {
  if (catalogs.units.length === 0) return true;
  if (catalogs.expenseTypes.length === 0) return true;
  if (catalogs.incomeTypes.length === 0) return true;
  if (catalogs.accounts.length === 0) return true;
  return false;
}

export function resolveSetupStep(catalogs: SetupCatalogs): SetupBasicStep {
  if (catalogs.units.length === 0) return 0;
  if (catalogs.expenseTypes.length === 0 || catalogs.incomeTypes.length === 0) {
    return 1;
  }
  if (catalogs.accounts.length === 0) return 2;
  return 0;
}

export function missingSetupItems(catalogs: SetupCatalogs): string[] {
  const missing: string[] = [];
  if (catalogs.units.length === 0) missing.push("unidades residenciais");
  if (catalogs.expenseTypes.length === 0) missing.push("tipos de gasto");
  if (catalogs.incomeTypes.length === 0) missing.push("tipos de ingreso");
  if (catalogs.accounts.length === 0) missing.push("contas contábeis");
  return missing;
}

async function parseAccounts(res: Response): Promise<SetupCatalogs["accounts"]> {
  if (!res.ok) return [];
  const raw = await res.json().catch(() => ({}));
  const list = Array.isArray(raw)
    ? raw
    : ((raw as { accounts?: unknown[] }).accounts ?? []);
  return (list as Array<{ id?: string; name?: string }>)
    .filter((a) => a.id)
    .map((a) => ({ id: a.id!, name: a.name ?? "—" }));
}

export async function fetchSetupCatalogs(token: string): Promise<SetupCatalogs> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const units = await fetchActiveResidentUnits(token);

  const [accountsRes, typeCatalogs, gasPriceCents] = await Promise.all([
    fetch("/api/v1/accounts", { headers }),
    fetchTypeCatalogs(token),
    fetchExistingGasPriceCents(token),
  ]);

  const accounts = await parseAccounts(accountsRes);

  return {
    units,
    accounts,
    expenseTypes: typeCatalogs.expenseTypes,
    incomeTypes: typeCatalogs.incomeTypes,
    gasPriceCents,
    incomeTypesHint: typeCatalogs.incomeTypesHint,
  };
}

/** O estado do servidor prevalece; o envelope 403 em sessionStorage não pode repor passos «pending». */
export function mergeSetupStatusFromStorage(
  status: SetupStatusPayload,
  stored: SetupStatusPayload | null,
): SetupStatusPayload {
  if (!stored) return status;
  if (status.complete === true) return status;

  const apiSteps =
    typeof status.steps === "object" && status.steps !== null ? status.steps : {};
  const storedSteps =
    typeof stored.steps === "object" && stored.steps !== null ? stored.steps : {};

  return {
    ...stored,
    ...status,
    complete: status.complete,
    currentStep: status.currentStep ?? stored.currentStep,
    steps: { ...storedSteps, ...apiSteps },
    message: status.message ?? stored.message,
    openingReference: status.openingReference ?? stored.openingReference,
  };
}

/** Estado do servidor após GET /setup/status; ignora envelope 403 obsoleto se já estiver complete. */
export function prepareSetupStatusFromFetch(
  apiStatus: SetupStatusPayload,
  storedSetup: SetupStatusPayload | null,
): SetupStatusPayload {
  if (apiStatus.complete === true) return apiStatus;
  return mergeSetupStatusFromStorage(apiStatus, storedSetup);
}
