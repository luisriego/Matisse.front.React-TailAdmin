import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';

interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number;
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
      // Format the initial value for display if it exists
      setCurrentReadingInput(gasReading.currentReading || '');
    }
  }, [gasReading]);

  const handleCurrentReadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // We store the raw input, and parse it for calculation
    const value = e.target.value;
    setCurrentReadingInput(value);
  };

  const handleSave = () => {
    if (gasReading) {
      onSave({ ...gasReading, currentReading: currentReadingInput });
      onClose();
    }
  };

  if (!gasReading) return null;

  const parseReadingInput = (value: string): number => {
    if (!value) return 0;
    // Standardize to dot as decimal separator
    const sanitized = value.replace(',', '.');
    // If user provided a decimal separator, trust it.
    if (sanitized.includes('.')) {
      return parseFloat(sanitized) || 0;
    }
    // If it's just digits (e.g., "361240"), assume 3 decimal places
    if (/^\d+$/.test(sanitized)) {
      return (parseInt(sanitized, 10) || 0) / 1000;
    }
    return 0;
  };

  const parsePtBrPrice = (value: string): number => {
    if (!value) return 0;
    // Price is like "5,87" or "1.234,56". Remove dots, replace comma.
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  const previousReading = gasReading.previousReading;
  const currentReadingNum = parseReadingInput(currentReadingInput);
  const totalConsumption = currentReadingNum > previousReading ? currentReadingNum - previousReading : 0;

  const unitPrice = parsePtBrPrice(gasUnitPrice);
  const totalValue = totalConsumption * unitPrice;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Consumo de Gás - Apto. ${gasReading.unit}`} widthClass="max-w-xl">
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Anterior:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">{previousReading.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m³</span>
        </div>
        <div className="flex justify-between items-center">
          <label htmlFor="modal-current-reading" className="text-sm font-medium text-gray-700 dark:text-gray-400">Atual:</label>
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
          disabled={!currentReadingNum || currentReadingNum < previousReading}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-green-500 rounded-lg shadow-theme-xs text-white hover:bg-green-600 disabled:bg-gray-400"
        >
          Salvar Consumo
        </button>
      </div>
    </Modal>
  );
};

export default AddGasConsumptionModal;
