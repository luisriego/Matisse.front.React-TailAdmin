import { useCallback, useEffect, useState } from "react";
import AddAccountModal from "../modal/AddAccountModal";
import ResidentUnitsBulkForm from "../resident-units/ResidentUnitsBulkForm";
import { fetchActiveResidentUnits } from "../../utils/fetchActiveResidentUnits";
import { createResidentUnitsBatch } from "../../utils/createResidentUnitsBatch";
import { prefetchCatalogTypes } from "../../utils/catalogCache";
import type { ParsedResidentUnitDraft } from "../../utils/parseBulkResidentUnitLines";
import type { SetupStatusPayload } from "../../types/setupApi";
import {
  missingSetupItems,
  SETUP_STEP_LABELS,
  type SetupBasicStep,
  type SetupCatalogs,
} from "../../utils/setupGate";

interface SetupWizardProps {
  initialStep: SetupBasicStep;
  catalogs: SetupCatalogs;
  bannerMessage?: string;
  refreshing?: boolean;
  onRefresh: () => Promise<SetupStatusPayload | null>;
}

function StepIndicator({ current }: { current: SetupBasicStep }) {
  return (
    <ol className="flex flex-wrap gap-2 justify-center mb-8">
      {SETUP_STEP_LABELS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              active
                ? "bg-brand-500 text-white"
                : done
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {index + 1}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function UnitsStep({
  existingUnits,
  onSuccess,
}: {
  existingUnits: SetupCatalogs["units"];
  onSuccess: (createdCount: number) => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (drafts: ParsedResidentUnitDraft[]) => {
    setIsSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token não encontrado.");

      const { created, skipped } = await createResidentUnitsBatch(token, drafts);

      if (skipped.length > 0) {
        setInfo(
          `${skipped.length} unidade(s) já existiam e foram ignoradas: ${skipped.join(", ")}.`,
        );
      }

      const actives = await fetchActiveResidentUnits(token);
      if (actives.length === 0) {
        if (created === 0 && skipped.length === drafts.length) {
          throw new Error(
            "As unidades já existem no servidor, mas GET /api/v1/resident-unit/actives devolveu lista vazia. Verifique frações ideiais (> 0) no servidor.",
          );
        }
        throw new Error(
          "Unidades gravadas, mas GET /api/v1/resident-unit/actives devolveu lista vazia. Verifique no servidor.",
        );
      }

      onSuccess(actives.length);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao criar as unidades.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (existingUnits.length > 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
          Passo 1 — Unidades residenciais
        </h2>
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          {existingUnits.length} unidade(s) registada(s) no condomínio.
        </div>
        <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left dark:border-gray-700 dark:bg-gray-800/50">
                <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Unidade</th>
                <th className="px-4 py-2 font-medium text-gray-600 dark:text-gray-400">Fração ideal</th>
              </tr>
            </thead>
            <tbody>
              {existingUnits.map((u) => (
                <tr key={u.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                  <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{u.unit}</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    {u.idealFraction.toLocaleString("pt-BR", {
                      minimumFractionDigits: 4,
                      maximumFractionDigits: 6,
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => onSuccess(existingUnits.length)}
          className="w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600"
        >
          Continuar para tipos de receita e despesa
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
        Passo 1 — Unidades residenciais
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Registe cada unidade com a respetiva fração ideal. A soma de todas as
        frações deve ser 1,0000.
      </p>

      {info && (
        <div className="mb-4 p-3 text-sm text-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300">
          {info}
        </div>
      )}

      <ResidentUnitsBulkForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Registar todas as unidades"
        externalError={error}
      />
    </div>
  );
}

function TypesStep({
  catalogs,
  onRefresh,
  onContinue,
  refreshing,
}: {
  catalogs: SetupCatalogs;
  onRefresh: () => Promise<SetupStatusPayload | null>;
  onContinue: () => void;
  refreshing: boolean;
}) {
  const expenseOk = catalogs.expenseTypes.length > 0;
  const incomeOk = catalogs.incomeTypes.length > 0;
  const allOk = expenseOk && incomeOk;

  const handleAction = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await prefetchCatalogTypes(token);
    }
    await onRefresh();
  };

  useEffect(() => {
    if (allOk) {
      onContinue();
    }
  }, [allOk, onContinue]);

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
        Passo 2 — Tipos de ingreso y gasto
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        O servidor deve disponibilizar catálogos de tipos (seed/migrations Symfony).
        Sem tipos, não é possível registar movimentos no condomínio.
      </p>

      <ul className="mb-6 space-y-3">
        <li
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            expenseOk
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
          }`}
        >
          <span>Tipos de gasto</span>
          <span className="font-medium">
            {expenseOk
              ? `${catalogs.expenseTypes.length} tipo(s)`
              : "Pendente"}
          </span>
        </li>
        <li
          className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
            incomeOk
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
              : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
          }`}
        >
          <span>Tipos de ingreso</span>
          <span className="font-medium">
            {incomeOk
              ? `${catalogs.incomeTypes.length} tipo(s)`
              : "Pendente"}
          </span>
        </li>
      </ul>

      {!incomeOk && catalogs.incomeTypesHint && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">
          {catalogs.incomeTypesHint}
        </p>
      )}

      {!allOk && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Se acabou de inicializar a base de dados, execute o seed do backend e
          clique em «Verificar novamente».
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleAction()}
        disabled={refreshing}
        className="w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50"
      >
        {refreshing
          ? "A verificar…"
          : allOk
            ? "Continuar para contas"
            : "Verificar novamente"}
      </button>
    </div>
  );
}

function AccountsStep({
  catalogs,
  onRefresh,
}: {
  catalogs: SetupCatalogs;
  onRefresh: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(catalogs.accounts.length === 0);

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
        Passo 3 — Contas contábeis
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Cadastre pelo menos uma conta (caixa, banco, etc.) com saldo inicial.
      </p>

      {catalogs.accounts.length > 0 ? (
        <ul className="mb-6 space-y-2">
          {catalogs.accounts.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
            >
              {a.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
          Nenhuma conta registada ainda.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full px-4 py-3 text-sm font-medium text-white rounded-lg bg-brand-500 hover:bg-brand-600"
        >
          {catalogs.accounts.length === 0
            ? "Registrar primeira conta"
            : "Adicionar outra conta"}
        </button>
        {catalogs.accounts.length > 0 && (
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Concluir configuração inicial
          </button>
        )}
      </div>

      <AddAccountModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAccountAdded={() => {
          void onRefresh();
          setModalOpen(false);
        }}
        closeOnBackdropClick={false}
        closeOnEscape={false}
        showCloseButton={catalogs.accounts.length > 0}
      />
    </div>
  );
}

export default function SetupWizard({
  initialStep,
  catalogs,
  bannerMessage,
  refreshing = false,
  onRefresh,
}: SetupWizardProps) {
  const [step, setStep] = useState<SetupBasicStep>(initialStep);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  const handleRefresh = useCallback(async (): Promise<SetupStatusPayload | null> => {
    return await onRefresh();
  }, [onRefresh]);

  const handleTypesContinue = useCallback(() => {
    setStep(2);
  }, []);

  const handleUnitsSuccess = useCallback(
    (createdCount: number) => {
      if (createdCount > 0) {
        setStep((prev) => (prev < 1 ? 1 : prev));
      }
      void handleRefresh();
    },
    [handleRefresh],
  );

  const missing = missingSetupItems(catalogs);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-wizard-title"
    >
      {refreshing && (
        <div className="absolute inset-x-0 top-0 z-10 h-1 overflow-hidden bg-brand-100 dark:bg-brand-900/30">
          <div className="h-full w-1/3 animate-pulse bg-brand-500" />
        </div>
      )}
      <header className="border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
        <h1
          id="setup-wizard-title"
          className="text-center text-2xl font-bold text-gray-800 dark:text-white/90"
        >
          Configuração inicial do condomínio
        </h1>
        <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
          Complete os passos obrigatórios. Não é possível usar a aplicação até
          registar unidades, tipos, contas e demais dados básicos.
        </p>
        {bannerMessage && (
          <p className="mt-3 text-center text-sm text-brand-600 dark:text-brand-400">
            {bannerMessage}
          </p>
        )}
        {missing.length > 0 && (
          <p className="mt-2 text-center text-xs text-amber-700 dark:text-amber-300">
            Pendente: {missing.join(", ")}
          </p>
        )}
      </header>

      <main className="flex-1 px-4 py-8 md:px-8">
        <StepIndicator current={step} />

        {step === 0 && (
          <UnitsStep
            existingUnits={catalogs.units}
            onSuccess={handleUnitsSuccess}
          />
        )}
        {step === 1 && (
          <TypesStep
            catalogs={catalogs}
            onRefresh={handleRefresh}
            onContinue={handleTypesContinue}
            refreshing={refreshing}
          />
        )}
        {step === 2 && (
          <AccountsStep catalogs={catalogs} onRefresh={handleRefresh} />
        )}
      </main>
    </div>
  );
}
