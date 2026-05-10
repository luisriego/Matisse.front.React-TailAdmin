import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import { loadConvention, saveConvention } from "../utils/condominiumConvention";
import {
  loadInitialForecastExpectations,
  saveInitialForecastExpectations,
  SyndicDistributionRule,
} from "../utils/initialForecastExpectations";
import { isValidAccountingPeriod } from "../utils/defaultAccountingMonth";

function parseMoney(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = parseFloat(t.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
}

function fmtPtBr(cents: number | null): string {
  if (cents === null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Settings() {
  const [numUnits, setNumUnits] = useState(0);
  const unitsFetchedRef = useRef(false);

  // ── Convenção (por unidade) ─────────────────────────────────────────────
  const conv = loadConvention();
  const [extraFee, setExtraFee] = useState(conv.extraFee);
  const [reserveFund, setReserveFund] = useState(conv.reserveFund);
  const [convSaved, setConvSaved] = useState(false);

  // ── Previsão de despesas ────────────────────────────────────────────────
  const stored = loadInitialForecastExpectations();
  const [forecastYm, setForecastYm] = useState(stored?.targetYm ?? "");
  const [expectedBase, setExpectedBase] = useState(stored?.expectedBase ?? "");
  const [expectedSyndic, setExpectedSyndic] = useState(stored?.expectedSyndic ?? "");
  const [expectedGas, setExpectedGas] = useState(stored?.expectedGas ?? "");
  const [expectedTotal, setExpectedTotal] = useState(stored?.expectedTotal ?? "");
  const [syndicRule, setSyndicRule] = useState<SyndicDistributionRule>(
    stored?.syndicDistribution ?? "EQUAL",
  );
  const [forecastSaved, setForecastSaved] = useState(!!stored);
  const [forecastError, setForecastError] = useState<string | null>(null);

  // buscar número de unidades do servidor
  const fetchUnits = useCallback(async () => {
    if (unitsFetchedRef.current) return;
    unitsFetchedRef.current = true;
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch("/api/v1/resident-unit/actives", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      let data = await res.json();
      if (data?.data) data = data.data;
      if (data?.content) data = data.content;
      if (Array.isArray(data)) setNumUnits(data.length);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => { void fetchUnits(); }, [fetchUnits]);

  // ── Derivados previsão ──────────────────────────────────────────────────
  const extraCents  = parseMoney(extraFee);
  const fundoCents  = parseMoney(reserveFund);
  const baseCents   = parseMoney(expectedBase);
  const syndicCents = parseMoney(expectedSyndic);
  const gasCents    = parseMoney(expectedGas);
  const totalInput  = parseMoney(expectedTotal);

  const extraTotal = extraCents !== null ? extraCents * numUnits : null;
  const fundoTotal = fundoCents !== null ? fundoCents * numUnits : null;

  const sumComponents = useMemo(
    () =>
      (baseCents ?? 0) +
      (syndicCents ?? 0) +
      (extraTotal ?? 0) +
      (fundoTotal ?? 0) +
      (gasCents ?? 0),
    [baseCents, syndicCents, extraTotal, fundoTotal, gasCents],
  );

  const diffCents = totalInput !== null ? totalInput - sumComponents : null;
  const diffOk    = diffCents !== null && Math.abs(diffCents) <= 2;

  const fmtPer = (total: string): string => {
    const c = parseMoney(total);
    if (c === null || numUnits === 0) return "—";
    return fmtPtBr(Math.round(c / numUnits));
  };

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSaveConvention = () => {
    saveConvention({ extraFee: extraFee.trim(), reserveFund: reserveFund.trim(), syndicFee: "" });
    setConvSaved(true);
    setTimeout(() => setConvSaved(false), 2500);
  };

  const handleSaveForecast = () => {
    setForecastError(null);
    if (!isValidAccountingPeriod(forecastYm)) {
      setForecastError("Selecione o mês de referência.");
      return;
    }
    if (!parseMoney(expectedBase) || (parseMoney(expectedBase) ?? 0) <= 0) {
      setForecastError("Informe o total de despesas previstas.");
      return;
    }
    if (!parseMoney(expectedSyndic) || (parseMoney(expectedSyndic) ?? 0) <= 0) {
      setForecastError("Informe o total do rateio síndico.");
      return;
    }
    if (!parseMoney(expectedTotal) || (parseMoney(expectedTotal) ?? 0) <= 0) {
      setForecastError("Informe o total previsto dos boletos.");
      return;
    }
    saveInitialForecastExpectations({
      targetYm: forecastYm,
      expectedTotal: expectedTotal.trim(),
      expectedBase: expectedBase.trim(),
      expectedSyndic: expectedSyndic.trim(),
      expectedGas: expectedGas.trim(),
      syndicDistribution: syndicRule,
    });
    setForecastSaved(true);
    setForecastError(null);
    setTimeout(() => setForecastSaved(false), 2500);
  };

  const inputCls =
    "h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
  const inputRightCls =
    "h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-right text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90";
  const tdR = "px-3 py-2 text-right text-sm tabular-nums text-gray-700 dark:text-gray-200";
  const tdL = "px-3 py-2 text-sm text-gray-700 dark:text-gray-200";

  return (
    <>
      <PageMeta title="Configurações | Matisse" description="Configurações da convenção e previsão de despesas" />
      <PageBreadcrumb pageTitle="Configurações" />

      <div className="space-y-6 max-w-2xl">

        {/* ── Bloco 1: Convenção ─────────────────────────────────── */}
        <ComponentCard title="Convenção do condomínio">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Valores fixos por unidade cobrados mensalmente. Usados na geração de boletos.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Taxa extra (R$ por unidade)
                </label>
                <input
                  type="text"
                  value={extraFee}
                  onChange={(e) => setExtraFee(e.target.value)}
                  placeholder="250,00"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Fundo de reserva (R$ por unidade)
                </label>
                <input
                  type="text"
                  value={reserveFund}
                  onChange={(e) => setReserveFund(e.target.value)}
                  placeholder="93,70"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveConvention}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
              >
                Salvar convenção
              </button>
              {convSaved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Guardado</span>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* ── Bloco 2: Previsão de despesas ──────────────────────── */}
        <ComponentCard title="Previsão de despesas">
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Copie os <strong className="text-gray-700 dark:text-gray-200">totais da linha de rodapé</strong> do
              demonstrativo de despesas (PDF ou planilha). O sistema usa estes valores no quadro
              «Validar cálculo» em Boletos para conferir se o cálculo bate com o esperado.
            </p>

            {/* mês + regra síndico */}
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mês de referência
                </label>
                <input
                  type="month"
                  value={forecastYm}
                  onChange={(e) => setForecastYm(e.target.value)}
                  className="h-9 w-44 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Rateio síndico
                </label>
                <select
                  value={syndicRule}
                  onChange={(e) => setSyndicRule(e.target.value as SyndicDistributionRule)}
                  className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="EQUAL">Partes iguais</option>
                  <option value="FRACTION">Por fração ideal</option>
                </select>
              </div>
            </div>

            {/* tabla */}
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Componente</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total do mês (R$)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Por unidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  <tr>
                    <td className={tdL}>Despesas previstas</td>
                    <td className="px-3 py-1.5 w-44">
                      <input className={inputRightCls} type="text" value={expectedBase}
                        onChange={(e) => setExpectedBase(e.target.value)} placeholder="3.484,61" />
                    </td>
                    <td className={tdR}>{fmtPer(expectedBase)}</td>
                  </tr>
                  <tr>
                    <td className={tdL}>Rateio síndico</td>
                    <td className="px-3 py-1.5 w-44">
                      <input className={inputRightCls} type="text" value={expectedSyndic}
                        onChange={(e) => setExpectedSyndic(e.target.value)} placeholder="600,00" />
                    </td>
                    <td className={tdR}>{fmtPer(expectedSyndic)}</td>
                  </tr>
                  <tr>
                    <td className={tdL}>
                      Taxa extra <span className="text-xs text-gray-400">(convenção × {numUnits} unid)</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-sm text-gray-500">
                      {extraTotal !== null ? fmtPtBr(extraTotal) : "—"}
                    </td>
                    <td className={tdR + " text-gray-500"}>{extraFee || "—"}</td>
                  </tr>
                  <tr>
                    <td className={tdL}>
                      Fundo de reserva <span className="text-xs text-gray-400">(convenção × {numUnits} unid)</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-sm text-gray-500">
                      {fundoTotal !== null ? fmtPtBr(fundoTotal) : "—"}
                    </td>
                    <td className={tdR + " text-gray-500"}>{reserveFund || "—"}</td>
                  </tr>
                  <tr>
                    <td className={tdL}>Gás <span className="text-xs text-gray-400">(opcional)</span></td>
                    <td className="px-3 py-1.5 w-44">
                      <input className={inputRightCls} type="text" value={expectedGas}
                        onChange={(e) => setExpectedGas(e.target.value)} placeholder="164,55" />
                    </td>
                    <td className={tdR + " text-xs text-gray-400"}>variável</td>
                  </tr>
                  <tr className="bg-gray-50 dark:bg-gray-800/40">
                    <td className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">∑ Componentes</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-sm text-gray-700 dark:text-gray-200">
                      {fmtPtBr(sumComponents)}
                    </td>
                    <td />
                  </tr>
                  <tr className="border-t-2 border-gray-300 dark:border-gray-600">
                    <td className="px-3 py-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                      Total boletos (crédito)
                    </td>
                    <td className="px-3 py-1.5 w-44">
                      <input className={inputRightCls + " font-semibold"} type="text" value={expectedTotal}
                        onChange={(e) => setExpectedTotal(e.target.value)} placeholder="5.967,66" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {diffCents !== null && (
                        <span className={`text-sm font-medium tabular-nums ${diffOk ? "text-emerald-600" : "text-amber-600"}`}>
                          {diffOk ? "✓ OK" : `Δ ${fmtPtBr(diffCents)}`}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {numUnits > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {numUnits} unidade{numUnits !== 1 ? "s" : ""} activas.
                Taxa extra e fundo calculados a partir dos valores da convenção acima.
              </p>
            )}

            {forecastError && (
              <p className="text-sm text-error-600 dark:text-error-400">{forecastError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveForecast}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600"
              >
                Salvar previsão
              </button>
              {forecastSaved && (
                <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Guardado</span>
              )}
            </div>
          </div>
        </ComponentCard>

      </div>
    </>
  );
}
