import { useCallback, useEffect, useState } from "react";
import type { SetupStatusPayload } from "../../types/setupApi";
import { fetchActiveResidentUnits } from "../../utils/fetchActiveResidentUnits";
import { fetchExistingGasPriceCents } from "../../utils/fetchExistingGasPriceCents";
import { describePendingSetupSteps } from "../../utils/describePendingSetupSteps";
import { clearStoredSetupRequired } from "../../utils/setupApi";
import {
  defaultBaselineYm,
  parsePtBrM3,
  parseYm,
  saveGasPriceDirect,
  saveGasReading,
  setBaselineYm,
} from "../../utils/gasBaselineSetup";

interface CoreSetupGasFormProps {
  needsPrice: boolean;
  needsReadings: boolean;
  onSaved: () => Promise<SetupStatusPayload | null>;
}

export default function CoreSetupGasForm({
  needsPrice,
  needsReadings,
  onSaved,
}: CoreSetupGasFormProps) {
  const [gasPriceInput, setGasPriceInput] = useState("");
  const [baselineYm, setBaselineYmState] = useState(defaultBaselineYm);
  const [readings, setReadings] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Array<{ id: string; unit: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sessão expirada.");

      const cents = await fetchExistingGasPriceCents(token);
      if (cents !== null && cents > 0) {
        setGasPriceInput((cents / 100).toFixed(2).replace(".", ","));
      }

      if (needsReadings) {
        const actives = await fetchActiveResidentUnits(token);
        setUnits(actives.map((u) => ({ id: u.id, unit: u.unit })));
        if (actives.length === 0) {
          setError(
            "Não há unidades residenciais. Cadastre-as primeiro no assistente inicial.",
          );
          return;
        }
        setReadings((prev) => {
          const next = { ...prev };
          for (const u of actives) {
            if (next[u.id] === undefined) next[u.id] = "";
          }
          return next;
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar dados de gás.");
    } finally {
      setLoading(false);
    }
  }, [needsReadings]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleYmChange = (ym: string) => {
    setBaselineYmState(ym);
    setBaselineYm(ym);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Sessão expirada.");

      if (needsPrice) {
        const normalized = gasPriceInput.trim().replace(/\./g, "").replace(",", ".");
        const parsed = Number(normalized);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          throw new Error("Indique o preço do gás por m³ (ex.: 26,40).");
        }
        await saveGasPriceDirect(token, Math.round(parsed * 100));
      }

      if (needsReadings) {
        const p = parseYm(baselineYm);
        if (!p) throw new Error("Mês de referência inválido (use AAAA-MM).");
        if (units.length === 0) {
          throw new Error("Não há unidades para registar leituras.");
        }
        for (const u of units) {
          const value = parsePtBrM3(readings[u.id] ?? "");
          if (value === null || value === "invalid") {
            throw new Error(
              `Indique a leitura inicial de ${u.unit} (m³ ≥ 0, ex.: 1234,567).`,
            );
          }
          await saveGasReading(token, u.id, p.year, p.month, value);
        }
      }

      clearStoredSetupRequired();
      const status = await onSaved();

      if (status?.complete === true) {
        setSuccess("Configuração concluída. A redireccionar…");
        return;
      }

      setError(describePendingSetupSteps(status ?? { complete: false, currentStep: 1, steps: {} }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (!needsPrice && !needsReadings) return null;

  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {loading ? (
        <p className="text-sm text-gray-500">A carregar unidades e preço…</p>
      ) : (
        <div className="space-y-6">
          {needsPrice && (
            <div>
              <label
                htmlFor="core-setup-gas-price"
                className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white/90"
              >
                1. Preço do gás (R$/m³)
              </label>
              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Valor cobrado por metro cúbico consumido (ex.: 26,40).
              </p>
              <input
                id="core-setup-gas-price"
                type="text"
                inputMode="decimal"
                value={gasPriceInput}
                onChange={(e) => setGasPriceInput(e.target.value)}
                placeholder="26,40"
                className="h-12 w-full max-w-sm rounded-lg border border-gray-300 px-4 text-base dark:border-gray-600 dark:bg-gray-800"
              />
            </div>
          )}

          {needsReadings && units.length > 0 && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="core-setup-gas-month"
                  className="mb-2 block text-sm font-semibold text-gray-800 dark:text-white/90"
                >
                  2. Leitura inicial do contador (por unidade)
                </label>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  Mês em que regista a leitura do contador pela primeira vez.
                  Preencha todas as unidades listadas.
                </p>
                <input
                  id="core-setup-gas-month"
                  type="month"
                  value={baselineYm}
                  onChange={(e) => handleYmChange(e.target.value)}
                  className="h-12 rounded-lg border border-gray-300 px-4 text-sm dark:border-gray-600 dark:bg-gray-800"
                />
              </div>
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-[minmax(6rem,1fr)_1fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800/50">
                  <span>Unidade</span>
                  <span>Leitura (m³)</span>
                </div>
                <ul>
                  {units.map((u) => (
                    <li
                      key={u.id}
                      className="grid grid-cols-[minmax(6rem,1fr)_1fr] items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {u.unit}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Leitura ${u.unit}`}
                        value={readings[u.id] ?? ""}
                        onChange={(e) =>
                          setReadings((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                        placeholder="ex.: 1234,567"
                        className="h-11 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-600 dark:bg-gray-800"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950/40 dark:text-green-300">
              {success}
            </p>
          )}

          <button
            type="button"
            disabled={saving || loading}
            onClick={() => void handleSave()}
            className="w-full rounded-lg bg-brand-500 px-4 py-3.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? "A guardar…" : "Guardar e continuar"}
          </button>
        </div>
      )}
    </section>
  );
}
