import React from 'react';
import ComponentCard from '../common/ComponentCard';
import { PencilIcon } from '../../icons';

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
  className?: string;
}

const GasConsumptionCard: React.FC<GasConsumptionCardProps> = ({
  residentUnits,
  gasReadings,
  gasUnitPrice,
  onOpenGasModal,
  className = "",
}) => {

  // This function now correctly handles pt-BR formatted numbers with thousand separators.
  const parsePtBrNumber = (value: string): number => {
    if (!value) return 0;
    const sanitized = value
      .replace(/\./g, '')  // Remove thousand separators: "1.276,267" -> "1276,267"
      .replace(',', '.'); // Replace decimal comma with dot: "1276.267"
    return parseFloat(sanitized) || 0;
  };

  const unitPrice = parsePtBrNumber(gasUnitPrice);

  const formatReading = (value: number | null) => {
    if (value === null || isNaN(value)) {
      return 'N/A';
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 3 });
  };

  return (
    <ComponentCard title="Consumo de gás por unidade" className={className}>
      {residentUnits.length === 0 ? (
        <p className="text-center text-gray-500 p-4">
          Não há unidades residenciais cadastradas.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <div className="min-w-full">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200 dark:border-gray-800 dark:text-gray-400">
              <div className="col-span-3">Unidade</div>
              <div className="col-span-2 text-right">Anterior</div>
              <div className="col-span-2 text-right">Atual</div>
              <div className="col-span-2 text-right">Consumo</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-1 text-center">Ações</div>
            </div>
            {/* Body */}
            <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
              {gasReadings.map((reading) => {
                const currentReadingNum = parsePtBrNumber(reading.currentReading);
                const prevReadingNum = reading.previousReading;

                const totalConsumption = prevReadingNum !== null && currentReadingNum > prevReadingNum
                  ? currentReadingNum - prevReadingNum
                  : 0;
                const totalValue = totalConsumption * unitPrice;

                return (
                  <li
                    key={reading.residentUnitId}
                    className="grid grid-cols-12 gap-4 items-center px-4 py-2.5 text-sm"
                  >
                    <div className="col-span-3 font-medium text-gray-800 dark:text-gray-200">{`Apto. ${reading.unit}`}</div>
                    <div className="col-span-2 text-right text-gray-500 dark:text-gray-400">{formatReading(prevReadingNum)}</div>
                    <div className="col-span-2 text-right font-medium text-gray-800 dark:text-gray-200">{reading.currentReading ? formatReading(currentReadingNum) : 'N/A'}</div>
                    <div className="col-span-2 text-right font-semibold text-blue-600">{totalConsumption > 0 ? `${formatReading(totalConsumption)} m³` : 'N/A'}</div>
                    <div className="col-span-2 text-right font-bold text-green-600">
                      {unitPrice > 0 && totalConsumption > 0 ? totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button onClick={() => onOpenGasModal(reading)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500">
                        <PencilIcon className="w-5 h-5" />
                      </button>
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
