import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/modal';
import DatePicker from '../form/date-picker';
import { Hook } from 'flatpickr/dist/types/options';

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
  // The date is now optional
  onSave: (updatedReading: GasReading, readingDate?: Date) => void;
}

const AddGasConsumptionModal: React.FC<AddGasConsumptionModalProps> = ({ isOpen, onClose, gasReading, gasUnitPrice, onSave }) => {
  const [currentReadingInput, setCurrentReadingInput] = useState<string>('');
  // Only manage date state if it's an initial reading
  const [initialReadingDate, setInitialReadingDate] = useState<Date | null>(new Date());

  const isInitialReading = gasReading?.previousReading === null;

  useEffect(() => {
    if (isOpen && gasReading) {
      setCurrentReadingInput(gasReading.currentReading || '');
      if (isInitialReading) {
        setInitialReadingDate(new Date());
      }
    }
  }, [isOpen, gasReading, isInitialReading]);

  const handleDateChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) {
      setInitialReadingDate(selectedDates[0]);
    }
  }, []);

  const handleSave = () => {
    if (gasReading) {
      // For initial reading, pass the selected date. For normal, pass nothing.
      const dateToSave = isInitialReading ? initialReadingDate! : undefined;
      onSave({ ...gasReading, currentReading: currentReadingInput }, dateToSave);
      onClose();
    }
  };

  if (!gasReading) return null;

  const parseReadingInput = (value: string): number => {
    if (!value) return 0;
    const sanitized = value.replace(',', '.');
    if (sanitized.includes('.')) return parseFloat(sanitized) || 0;
    if (/^\d+$/.test(sanitized)) return (parseInt(sanitized, 10) || 0) / 1000;
    return 0;
  };

  const parsePtBrPrice = (value: string): number => {
    if (!value) return 0;
    const sanitized = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(sanitized) || 0;
  };

  const currentReadingNum = parseReadingInput(currentReadingInput);
  const previousReadingNum = gasReading.previousReading ?? 0;
  const totalConsumption = !isInitialReading && currentReadingNum > previousReadingNum ? currentReadingNum - previousReadingNum : 0;
  const unitPrice = parsePtBrPrice(gasUnitPrice);
  const totalValue = totalConsumption * unitPrice;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={isInitialReading ? `Registrar Leitura Inicial - Apto. ${gasReading.unit}` : `Consumo de Gás - Apto. ${gasReading.unit}`}
      widthClass="max-w-xl"
    >
      <div className="p-4 space-y-4">
        {isInitialReading && (
          <DatePicker
            id="initial-reading-date"
            label="Data da Leitura Inicial"
            onChange={handleDateChange}
            defaultDate={initialReadingDate || undefined}
            placeholder="Selecione a data"
          />
        )}

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-400">Anterior:</span>
          <span className="font-medium text-gray-800 dark:text-white/90">
            {isInitialReading ? 'N/A' : gasReading.previousReading?.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) + ' m³'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <label htmlFor="modal-current-reading" className="text-sm font-medium text-gray-700 dark:text-gray-400">
            {isInitialReading ? 'Leitura Inicial:' : 'Atual:'}
          </label>
          <input
            id="modal-current-reading"
            type="text"
            inputMode="decimal"
            value={currentReadingInput}
            onChange={(e) => setCurrentReadingInput(e.target.value)}
            className="h-9 w-32 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-right shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:border-gray-700 dark:bg-gray-900"
            placeholder="0,000"
            autoFocus
          />
        </div>

        {!isInitialReading && (
          <>
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
          </>
        )}
      </div>
      <div className="flex justify-end p-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleSave}
          disabled={!currentReadingNum || (!isInitialReading && currentReadingNum < previousReadingNum)}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-green-500 rounded-lg shadow-theme-xs text-white hover:bg-green-600 disabled:bg-gray-400"
        >
          Salvar Leitura
        </button>
      </div>
    </Modal>
  );
};

export default AddGasConsumptionModal;
