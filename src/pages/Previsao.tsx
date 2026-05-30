import { useCallback, useEffect, useMemo, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import {
  fetchExpectedExpenses,
  fetchForecast,
  formatCentsPtBr,
  monthLabelYm,
} from "../utils/forecastApi";
import { frequencyOptionLabel } from "../utils/expectedExpenseDraft";
import type { ExpectedExpenseRecord } from "../types/expectedExpenseApi";
import type { ForecastPayload } from "../types/forecastApi";
import { LAST_IMPORTED_STATEMENT_PERIOD_KEY } from "../utils/defaultAccountingMonth";

type Tab = "memoria" | "previsao";

function nextMonthYm(ym: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultReconciliationMonth(): string {
  const stored = localStorage.getItem(LAST_IMPORTED_STATEMENT_PERIOD_KEY);
  if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function Previsao() {
  const [tab, setTab] = useState<Tab>("previsao");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [memoria, setMemoria] = useState<ExpectedExpenseRecord[]>([]);
  const [memoriaLoading, setMemoriaLoading] = useState(false);
  const [memoriaError, setMemoriaError] = useState<string | null>(null);

  const [targetMonth, setTargetMonth] = useState(() => nextMonthYm(defaultReconciliationMonth()));
  const [reconciliationMonth, setReconciliationMonth] = useState(defaultReconciliationMonth);
  const [forecast, setForecast] = useState<ForecastPayload | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState<string | null>(null);

  const loadMemoria = useCallback(async () => {
    setMemoriaLoading(true);
    setMemoriaError(null);
    try {
      const rows = await fetchExpectedExpenses(year, true);
      setMemoria(rows);
    } catch (err) {
      setMemoriaError(err instanceof Error ? err.message : "Falha ao carregar memória.");
    } finally {
      setMemoriaLoading(false);
    }
  }, [year]);

  const loadForecast = useCallback(async () => {
    if (!/^\d{4}-\d{2}$/.test(targetMonth) || !/^\d{4}-\d{2}$/.test(reconciliationMonth)) {
      setForecastError("Meses inválidos (use YYYY-MM).");
      return;
    }
    setForecastLoading(true);
    setForecastError(null);
    try {
      const data = await fetchForecast(targetMonth, reconciliationMonth);
      setForecast(data);
    } catch (err) {
      setForecast(null);
      setForecastError(err instanceof Error ? err.message : "Falha ao carregar previsão.");
    } finally {
      setForecastLoading(false);
    }
  }, [targetMonth, reconciliationMonth]);

  useEffect(() => {
    if (tab === "memoria") void loadMemoria();
  }, [tab, loadMemoria]);

  useEffect(() => {
    if (tab === "previsao") void loadForecast();
  }, [tab, loadForecast]);

  const forecastTotal = useMemo(() => {
    if (!forecast?.totals?.boletoGrandTotalCents) return null;
    return forecast.totals.boletoGrandTotalCents;
  }, [forecast]);

  const inputCls =
    "h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";

  return (
    <>
      <PageMeta title="Previsão | Matisse" description="Memória de gastos e previsão mensal" />
      <PageBreadcrumb pageTitle="Previsão" />

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("previsao")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "previsao"
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          }`}
        >
          Previsão do mês
        </button>
        <button
          type="button"
          onClick={() => setTab("memoria")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "memoria"
              ? "bg-brand-500 text-white"
              : "border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300"
          }`}
        >
          Memória de gastos esperados
        </button>
      </div>

      {tab === "memoria" && (
        <ComponentCard title="Memória de gastos esperados">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Actualizada pela conciliação OFX (gastos marcados como esperados). Só leitura — a edição
            continua nos gastos recurrentes ou na próxima conciliação.
          </p>
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="rounded border px-2 py-1 text-sm dark:border-gray-700"
            >
              ‹
            </button>
            <span className="font-semibold">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              className="rounded border px-2 py-1 text-sm dark:border-gray-700"
            >
              ›
            </button>
          </div>
          {memoriaLoading && <p className="text-sm text-gray-500">A carregar…</p>}
          {memoriaError && (
            <p className="text-sm text-red-600 dark:text-red-400">{memoriaError}</p>
          )}
          {!memoriaLoading && !memoriaError && memoria.length === 0 && (
            <p className="text-sm text-gray-500">Nenhuma memória activa para {year}.</p>
          )}
          {memoria.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500 dark:border-gray-700">
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">Tipo</th>
                    <th className="px-2 py-2">Freq.</th>
                    <th className="px-2 py-2">Fixo/Var.</th>
                    <th className="px-2 py-2 text-right">Último valor</th>
                    <th className="px-2 py-2">Último mês conc.</th>
                  </tr>
                </thead>
                <tbody>
                  {memoria.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="px-2 py-2">{row.displayName}</td>
                      <td className="px-2 py-2 font-mono text-xs">{row.expenseTypeCode}</td>
                      <td className="px-2 py-2">{frequencyOptionLabel(row.frequency)}</td>
                      <td className="px-2 py-2">{row.amountKind}</td>
                      <td className="px-2 py-2 text-right">{formatCentsPtBr(row.lastAmountCents)}</td>
                      <td className="px-2 py-2">{row.lastReconciledMonth ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>
      )}

      {tab === "previsao" && (
        <ComponentCard title="Previsão do mês seguinte">
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Projeção do que se espera cobrar — não contabiliza como gasto ou ingresso real.
          </p>

          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Mês objetivo (previsão)</label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Mês de conciliação de referência</label>
              <input
                type="month"
                value={reconciliationMonth}
                onChange={(e) => setReconciliationMonth(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadForecast()}
            disabled={forecastLoading}
            className="mb-4 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {forecastLoading ? "A carregar…" : "Actualizar previsão"}
          </button>

          {forecastError && (
            <p className="mb-4 text-sm text-red-600 dark:text-red-400">{forecastError}</p>
          )}

          {forecast && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                  Projeção — não contabiliza
                </span>
                {forecast.isProjectionOnly && (
                  <span className="text-xs text-gray-500">isProjectionOnly: true</span>
                )}
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                Previsão para <strong>{monthLabelYm(forecast.targetMonth)}</strong>, com base na
                conciliação de <strong>{monthLabelYm(forecast.reconciliationMonth)}</strong>.
                {forecast.dueDate ? ` Vencimento: ${forecast.dueDate}.` : null}
              </p>

              {forecastTotal !== null && (
                <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Total boletos (projectado): {formatCentsPtBr(forecastTotal)}
                </p>
              )}

              {forecast.units.length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase dark:bg-gray-800">
                      <tr>
                        <th className="px-3 py-2 text-left">Unidade</th>
                        <th className="px-3 py-2 text-right">Gás</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.units.map((u) => (
                        <tr key={u.unit} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2">{u.unit}</td>
                          <td className="px-3 py-2 text-right">{formatCentsPtBr(u.gasCents)}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatCentsPtBr(u.totalCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {forecast.expectedExpenseLines && forecast.expectedExpenseLines.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Despesas esperadas (condomínio)</h4>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {forecast.expectedExpenseLines.map((line, idx) => (
                      <li key={idx} className="flex justify-between gap-4">
                        <span>{line.displayName ?? "—"}</span>
                        <span>{formatCentsPtBr(line.amountCents as number | undefined)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {forecast.gas && (
                <p className="text-xs text-gray-500">
                  Gás: consumo {forecast.gas.consumptionCalendarMonth} · total{" "}
                  {formatCentsPtBr(forecast.gas.totalCents)}
                </p>
              )}
            </div>
          )}
        </ComponentCard>
      )}
    </>
  );
}
