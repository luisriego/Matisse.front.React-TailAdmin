import { useMemo, useRef, useState } from "react";
import { PlusIcon, TrashBinIcon } from "../../icons";
import type { ParsedResidentUnitDraft } from "../../utils/parseBulkResidentUnitLines";
import {
  applyEqualFractionsToRows,
  createDefaultDraftRows,
  draftsFromTextLines,
  newDraftRow,
  rowsToParsedDrafts,
  sumFractionInputs,
  validateDraftRows,
  type ResidentUnitDraftRow,
} from "../../utils/residentUnitDraftForm";

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";

interface ResidentUnitsBulkFormProps {
  onSubmit: (drafts: ParsedResidentUnitDraft[]) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  externalError?: string | null;
}

export default function ResidentUnitsBulkForm({
  onSubmit,
  isSubmitting = false,
  submitLabel = "Registar unidades",
  externalError = null,
}: ResidentUnitsBulkFormProps) {
  const [rows, setRows] = useState<ResidentUnitDraftRow[]>(() =>
    createDefaultDraftRows(3),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<
    Record<string, { unit?: string; idealFraction?: string }>
  >({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fractionSum = useMemo(() => sumFractionInputs(rows), [rows]);
  const sumOk = Math.abs(fractionSum - 1) <= 0.001;
  const filledCount = rows.filter((r) => r.unit.trim()).length;

  const updateRow = (
    key: string,
    patch: Partial<Pick<ResidentUnitDraftRow, "unit" | "idealFraction">>,
  ) => {
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r)),
    );
    setRowErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, newDraftRow()]);
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.key !== key);
    });
  };

  const handleEqualSplit = () => {
    setRows((prev) => applyEqualFractionsToRows(prev));
    setFormError(null);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result?.toString() ?? "";
        const imported = draftsFromTextLines(text);
        if (imported.length === 0) {
          setFormError("O ficheiro não contém unidades válidas.");
          return;
        }
        setRows(imported);
        setFormError(null);
        setRowErrors({});
      } catch (err: unknown) {
        setFormError(
          err instanceof Error ? err.message : "Erro ao importar ficheiro.",
        );
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateDraftRows(rows);
    setRowErrors(validation.rowErrors);
    if (validation.formError) {
      setFormError(validation.formError);
      return;
    }
    if (Object.keys(validation.rowErrors).length > 0) return;

    try {
      const drafts = rowsToParsedDrafts(rows);
      await onSubmit(drafts);
      setFormError(null);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "Erro ao validar unidades.",
      );
    }
  };

  const displayError = externalError ?? formError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {displayError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
          {displayError}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          <PlusIcon className="size-4" />
          Adicionar unidade
        </button>
        <button
          type="button"
          onClick={handleEqualSplit}
          disabled={isSubmitting || filledCount === 0}
          className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
        >
          Repartir frações igualmente
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          Importar .txt
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv"
          className="hidden"
          onChange={handleFileImport}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-800/50">
              <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-[45%]">
                Unidade
              </th>
              <th className="px-3 py-2.5 font-medium text-gray-600 dark:text-gray-400 w-[40%]">
                Fração ideal
              </th>
              <th className="px-3 py-2.5 w-12" aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const errs = rowErrors[row.key];
              return (
                <tr
                  key={row.key}
                  className="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={row.unit}
                      onChange={(e) =>
                        updateRow(row.key, { unit: e.target.value })
                      }
                      placeholder={`Ex.: Apto ${101 + index}`}
                      maxLength={10}
                      disabled={isSubmitting}
                      aria-invalid={!!errs?.unit}
                      className={`${inputClass} ${errs?.unit ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                    />
                    {errs?.unit ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errs.unit}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">
                        Máx. 10 caracteres
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.idealFraction}
                      onChange={(e) =>
                        updateRow(row.key, { idealFraction: e.target.value })
                      }
                      placeholder="0,2576"
                      disabled={isSubmitting}
                      aria-invalid={!!errs?.idealFraction}
                      className={`${inputClass} ${errs?.idealFraction ? "border-red-400 focus:border-red-400 focus:ring-red-500/20" : ""}`}
                    />
                    {errs?.idealFraction ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errs.idealFraction}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 align-top">
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={isSubmitting || rows.length <= 1}
                      className="mt-1 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-30 dark:hover:bg-gray-800"
                      title="Remover linha"
                    >
                      <TrashBinIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm ${
          sumOk
            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
            : "bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
        }`}
      >
        <span>
          Soma das frações:{" "}
          <strong>{fractionSum.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}</strong>
          {" / "}
          <strong>1,0000</strong>
        </span>
        <span>{sumOk ? "✓ OK" : "Deve totalizar 1,0000"}</span>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || filledCount === 0}
        className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? "A registar…" : submitLabel}
      </button>
    </form>
  );
}
