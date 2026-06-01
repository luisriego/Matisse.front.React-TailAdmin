import { Link } from "react-router-dom";

import type { SetupStatusPayload } from "../../types/setupApi";

import {

  listCoreSetupSteps,

  pendingCoreStepKeys,

} from "../../utils/setupCoreSteps";

import CoreSetupGasForm from "./CoreSetupGasForm";



interface CoreSetupPanelProps {

  status: SetupStatusPayload;

  onRefresh: () => Promise<SetupStatusPayload | null>;

  refreshing?: boolean;

}



export default function CoreSetupPanel({

  status,

  onRefresh,

  refreshing = false,

}: CoreSetupPanelProps) {

  const steps = listCoreSetupSteps(status);

  const pendingKeys = pendingCoreStepKeys(status);

  const needsGasPrice = pendingKeys.includes("gasPrice");

  const needsGasReadings = pendingKeys.includes("gasReadings");

  const gasPending = needsGasPrice || needsGasReadings;

  const nonGasPending = steps.filter(

    (s) => !s.done && s.key !== "gasPrice" && s.key !== "gasReadings",

  );



  return (

    <div className="fixed inset-0 z-[99999] flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950">

      <header className="border-b border-gray-200 bg-white px-6 py-6 dark:border-gray-800 dark:bg-gray-900">

        <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-white/90">

          {gasPending ? "Preço e leituras iniciais de gás" : "Configuração operacional"}

        </h1>

        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-gray-500 dark:text-gray-400">

          {gasPending

            ? "Preencha abaixo e guarde. Só depois poderá aceder a Boletos e ao resto da aplicação."

            : "Conclua os passos pendentes abaixo."}

        </p>

      </header>



      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">

        {gasPending && (

          <CoreSetupGasForm

            needsPrice={needsGasPrice}

            needsReadings={needsGasReadings}

            onSaved={onRefresh}

          />

        )}



        {nonGasPending.length > 0 && (

          <ul className="mb-8 space-y-4">

            {nonGasPending.map((step) => (

              <li

                key={step.key}

                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-800 dark:bg-amber-900/20"

              >

                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">

                    <p className="font-medium text-gray-800 dark:text-white/90">

                      {step.label}

                    </p>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">

                      {step.hint}

                    </p>

                  </div>

                  <span className="shrink-0 text-xs font-semibold text-amber-800 dark:text-amber-200">

                    Pendente

                  </span>

                </div>

                {step.key === "initialBalances" && (

                  <Link

                    to="/contas"

                    className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"

                  >

                    Abrir Contas →

                  </Link>

                )}

              </li>

            ))}

          </ul>

        )}



        {steps.every((s) => s.done) === false && (

          <button

            type="button"

            onClick={() => void onRefresh()}

            disabled={refreshing}

            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"

          >

            {refreshing ? "A verificar…" : "Verificar novamente"}

          </button>

        )}

      </main>

    </div>

  );

}

