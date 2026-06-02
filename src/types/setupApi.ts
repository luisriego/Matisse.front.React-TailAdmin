/** Criterios de completitud tal como los espone GET /api/v1/setup/status. */
export type SetupStepKey =
  | "initialBalances"
  | "gasPrice"
  | "gasReadings"
  | "initialExpenses"
  /** Passo 5 — POST /api/v1/setup/opening-reference-month (`setup.opening_reference_month.was.recorded`). */
  | "openingReferenceMonth";

export type SetupStepsState = Partial<Record<SetupStepKey, SetupStepStatus>>;

/** Lê um passo do blob `steps` (Symfony usa strings; o cliente também aceita boolean). */
export function getSetupStepStatus(
  steps: SetupStatusPayload["steps"] | undefined,
  key: SetupStepKey,
): SetupStepStatus | undefined {
  if (!steps || typeof steps !== "object" || Array.isArray(steps)) {
    return undefined;
  }
  return (steps as Record<string, SetupStepStatus>)[key];
}

/** Regra de rateio síndico no POST de abertura (igual aos valores snake do backend). */
export type SyndicAllocationRuleApi =
  | "equal_parts"
  | "ideal_fraction";

export interface OpeningReferenceMonthRequest {
  referenceMonth: string;
  syndicAllocationRule: SyndicAllocationRuleApi;
  extraFeePerUnitCents: number;
  reserveFundPerUnitCents: number;
  expectedCommonExpensesCents?: number;
  expectedSyndicShareTotalCents?: number;
  expectedBoletoTotalCents?: number;
  optionalGasTotalCents?: number;
}

/** Último registo persistido (`GET /setup/status` → openingReference). */
export type OpeningReferenceStatus = OpeningReferenceMonthRequest & {
  recordedAt?: string;
  recorded_at?: string;
  reference_month?: string;
};

export type SetupStepStatus = boolean | "complete" | "pending" | string;

export interface SetupStatusPayload {
  complete: boolean;
  currentStep: number | string;
  steps: SetupStepsState | Record<string, SetupStepStatus> | string[];
  message?: string;
  /** Ditado pelo backend; ausente ou null até ao primeiro POST. */
  openingReference?: OpeningReferenceStatus | null;
}

/** Cuerpo 403 cuando el guard global bloquea /api/v1/* por setup incompleto. */
export interface ApiSetupForbiddenBody {
  error: "SETUP_REQUIRED";
  message: string;
  setup: SetupStatusPayload;
}

export interface SetupBalanceInput {
  accountId: string;
  amountCents: number;
}

export interface SetupInitialBalancesRequest {
  cutoffDate: string;
  confirmedBankBalanceCents: number;
  balances: SetupBalanceInput[];
  adjustmentPriority: string[];
}

export interface SetupBalancesPreviewResponse {
  sum?: number;
  discrepancyCents?: number;
  adjustedBalances?: SetupBalanceInput[];
  [key: string]: unknown;
}
