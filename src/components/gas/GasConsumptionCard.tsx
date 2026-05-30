import React from 'react';
import ComponentCard from '../common/ComponentCard';
import { parseGasReadingFromUi } from '../../utils/gasReadingParser';

interface ResidentUnit {
  id: string;
  unit: string;
}

interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number | null;
  currentReading: string;
}

interface GasConsumptionCardProps {
  residentUnits: ResidentUnit[];
  gasReadings: GasReading[];
  gasUnitPrice: string;
  onOpenGasModal: (reading: GasReading) => void;
  /** MM/AAAA do mês cuja leitura de fecho é usada como "Anterior" no cálculo. */
  previousPeriodLabel?: string;
  /** MM/AAAA do mês da leitura "Atual" (mês do boleto). */
  currentPeriodLabel?: string;
  className?: string;
}

const GasConsumptionCard: React.FC<GasConsumptionCardProps> = ({
  residentUnits,
  gasReadings,
  gasUnitPrice,
  onOpenGasModal,
  previousPeriodLabel = "",
  currentPeriodLabel = "",
  className = "",
}) => {

  const parseReadingInput = (value: string): number => {
    const parsed = parseGasReadingFromUi(value);
    return typeof parsed === 'number' ? parsed : 0;
  };

  const parsePtBrPrice = (value: string): number => {
    if (!value) return 0;
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  const unitPrice = parsePtBrPrice(gasUnitPrice);

  return (
    <ComponentCard title="Consumo de gás por unidade" className={className}>
      {residentUnits.length === 0 ? (
        <p className="text-center text-gray-500 p-4">
          Não há unidades residenciais cadastradas.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-full">
            {(previousPeriodLabel || currentPeriodLabel) && (
              <p className="px-4 pb-2 text-xs text-gray-500 dark:text-gray-400">
                Consumo = leitura atual ({currentPeriodLabel || "—"}) − leitura anterior (
                {previousPeriodLabel || "—"}). Sem leitura anterior, o consumo não é calculado.
              </p>
            )}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 dark:text-gray-400">
              <div className="col-span-3">Unidade</div>
              <div className="col-span-2 text-right leading-tight">
                <div>Anterior</div>
                {previousPeriodLabel ? (
                  <div className="mt-0.5 text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500">
                    {previousPeriodLabel}
                  </div>
                ) : null}
              </div>
              <div className="col-span-2 text-right leading-tight">
                <div>Atual</div>
                {currentPeriodLabel ? (
                  <div className="mt-0.5 text-[10px] font-normal normal-case text-gray-400 dark:text-gray-500">
                    {currentPeriodLabel}
                  </div>
                ) : null}
              </div>
              <div className="col-span-2 text-right">Consumo</div>
              <div className="col-span-3 text-right">Valor</div>
            </div>
            <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
              {gasReadings.map((reading) => {
                const currentReadingNum = parseReadingInput(reading.currentReading);
                const prev = reading.previousReading;
                const totalConsumption =
                  prev !== null && currentReadingNum > prev ? currentReadingNum - prev : 0;
                const totalValue = totalConsumption * unitPrice;
                const missingPrev = prev === null;

                return (
                  <li
                    key={reading.residentUnitId}
                    onClick={() => onOpenGasModal(reading)}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                  >
                    <div className="col-span-3 font-medium text-gray-800 dark:text-gray-200">{`Apto. ${reading.unit}`}</div>
                    <div
                      className={`col-span-2 text-right text-sm ${
                        missingPrev ? "font-medium text-amber-700 dark:text-amber-300" : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {missingPrev
                        ? "Sem leitura"
                        : prev.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                    </div>
                    <div className="col-span-2 text-right font-medium text-gray-800 dark:text-gray-200">
                      {reading.currentReading.trim()
                        ? currentReadingNum.toLocaleString("pt-BR", { minimumFractionDigits: 3 })
                        : "—"}
                    </div>
                    <div className="col-span-2 text-right font-semibold text-blue-600">
                      {missingPrev ? "—" : `${totalConsumption.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} m³`}
                    </div>
                    <div className="col-span-3 text-right font-bold text-green-600">
                      {missingPrev || unitPrice <= 0
                        ? "—"
                        : totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </ComponentCard>
  );
};

export default GasConsumptionCard;
