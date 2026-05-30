/** Período dominante guardado tras confirmar un extracto OFX (mismo valor que Despesas). */
export const LAST_IMPORTED_STATEMENT_PERIOD_KEY = "bank.lastImportedStatementPeriod";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidAccountingPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

/** `YYYY-MM` del último extracto confirmado, o el mes calendario anterior (flujo contable habitual). */
export function getDefaultAccountingMonthPeriod(): string {
  const importedPeriod = localStorage.getItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY) ?? "";
  if (isValidAccountingPeriod(importedPeriod)) return importedPeriod;
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

/** Primer día del mes (hora local), para month pickers tipo Flatpickr. */
export function getDefaultAccountingMonthDate(): Date {
  const period = getDefaultAccountingMonthPeriod();
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1);
}

/**
 * Desde el mes actual hacia atrás, el mes más reciente con despesas activas o recurrentes pendientes.
 * Devuelve null si no hay filas en los últimos `maxMonthsBack` meses.
 */
export async function findLatestMonthWithExpenseActivity(
  token: string,
  maxMonthsBack = 36,
): Promise<Date | null> {
  const headers = { Authorization: `Bearer ${token}` };
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < maxMonthsBack; i += 1) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth() + 1;
    const [recRes, actRes] = await Promise.all([
      fetch(`/api/v1/recurring-expenses/pending-monthly/${m}/${y}`, { headers }),
      fetch(`/api/v1/expenses/date-range/${y}/${m}`, { headers }),
    ]);
    let recurring: unknown[] = [];
    let active: unknown[] = [];
    try {
      recurring = recRes.ok ? await recRes.json() : [];
    } catch {
      recurring = [];
    }
    try {
      active = actRes.ok ? await actRes.json() : [];
    } catch {
      active = [];
    }
    if (
      (Array.isArray(active) && active.length > 0) ||
      (Array.isArray(recurring) && recurring.length > 0)
    ) {
      return new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    }
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return null;
}
