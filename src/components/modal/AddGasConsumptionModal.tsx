import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { parseGasReadingFromUi } from '../../utils/gasReadingParser';

interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number | null;
  currentReading: string;
}

interface AddGasConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gasReading: GasReading | null;
  gasUnitPrice: string;
  onSave: (updatedReading: GasReading) => void;
}

const AddGasConsumptionModal: React.FC<AddGasConsumptionModalProps> = ({ isOpen, onClose, gasReading, gasUnitPrice, onSave }) => {
  const [currentReadingInput, setCurrentReadingInput] = useState<string>('');

  useEffect(() => {
    if (gasReading) {
      
      setCurrentReadingInput(gasReading.currentReading || '');
    }
  }, [gasReading]);

  const handleCurrentReadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const safe = raw.replace(/[^0-9.,]/g, "");
    setCurrentReadingInput(safe);
  };

  const handleSave = () => {
    if (gasReading) {
      onSave({ ...gasReading, currentReading: currentReadingInput });
      onClose();
    }
  };

  if (!gasReading) return null;

  const parseReadingInput = (value: string): number => {
    const parsed = parseGasReadingFromUi(value);
    return typeof parsed === "number" ? parsed : 0;
  };

  const parsePtBrPrice = (value: string): number => {
    if (!value) return 0;
    
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  const previousReading = gasReading.previousReading;
  const currentReadingNum = parseReadingInput(currentReadingInput);
  const totalConsumption =
    previousReading !== null && currentReadingNum > previousReading
      ? currentReadingNum - previousReading
      : 0;

  const unitPrice = parsePtBrPrice(gasUnitPrice);
  const totalValue = totalConsumption * unitPrice;
  const missingPrev = previousReading === null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Consumo de Gás - Apto. ${gasReading.unit}`} widthClass="max-w-xl">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Anterior:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">
            {missingPrev ? (
              <span className="text-amber-700 dark:text-amber-300">Sem leitura no mês anterior</span>
            ) : (
              <>
                {previousReading.toLocaleString("pt-BR", {
                  minimumFractionDigits: 3,
                  maximumFractionDigits: 3,
                })}{" "}
                m³
              </>
            )}
          </span>
        </div>
        {missingPrev ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
            É necessário ter leitura registada no mês anterior ao boleto. Sem isso, o consumo não é calculado.
          </p>
        ) : null}
        <div className="flex justify-between items-center">
          <label htmlFor="modal-current-reading" className="text-sm font-medium text-gray-700 dark:text-gray-400">Atual:</label>
          <div className="flex flex-col items-end">
            <input
              id="modal-current-reading"
              type="text"
              inputMode="decimal"
              value={currentReadingInput}
              onChange={handleCurrentReadingChange}
              className="h-9 w-32 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-right shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:border-gray-700 dark:bg-gray-900"
              placeholder="0,000"
              autoFocus
            />
            <span className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Use vírgula como decimal
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Total:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">{totalConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³</span>
        </div>
        <div className="flex justify-between items-center border-t border-gray-200 pt-4 dark:border-gray-700">
          <span className="text-base font-semibold text-gray-700 dark:text-gray-400">Valor a Pagar:</span>
          {unitPrice > 0 ? (
            <span className="text-lg font-bold text-green-600">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
          ) : (
            <span className="text-sm font-medium text-yellow-600">Preço do gás não definido</span>
          )}
        </div>
      </div>
      <div className="flex justify-end p-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={
            missingPrev || !currentReadingNum || (previousReading !== null && currentReadingNum < previousReading)
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-green-500 rounded-lg shadow-theme-xs text-white hover:bg-green-600 disabled:bg-gray-400"
        >
          Salvar Consumo
        </button>
      </div>
    </Modal>
  );
};

export default AddGasConsumptionModal;
