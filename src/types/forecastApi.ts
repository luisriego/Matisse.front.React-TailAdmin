import type { ResolvedBillingPolicyResponse } from "./billingPolicyApi";

export interface ForecastUnitLine {
  unit: string;
  totalCents: number;
  gasCents?: number;
  baseCents?: number;
  extraCents?: number;
  reserveCents?: number;
  syndicCents?: number;
}

export interface ForecastGasBlock {
  consumptionCalendarMonth: string;
  totalCents: number;
  readings?: Array<Record<string, unknown>>;
}

export interface ForecastExpectedExpenseLine {
  displayName?: string;
  amountCents?: number;
  expenseTypeCode?: string;
  [key: string]: unknown;
}

export interface ForecastTotals {
  boletoGrandTotalCents?: number;
  [key: string]: unknown;
}

export interface ForecastPayload {
  targetMonth: string;
  reconciliationMonth: string;
  documentKind: string;
  isProjectionOnly: boolean;
  dueDate?: string;
  billingPolicy?: ResolvedBillingPolicyResponse | Record<string, unknown>;
  units: ForecastUnitLine[];
  gas?: ForecastGasBlock;
  expectedExpenseLines?: ForecastExpectedExpenseLine[];
  totals?: ForecastTotals;
}
