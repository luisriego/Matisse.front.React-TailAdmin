import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';

interface DefineGasPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (billAmountInCents: number, bufferPercentage: number) => Promise<void>;
  isLoading: boolean;
}

const DefineGasPriceModal: React.FC<DefineGasPriceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'calculate' | 'direct' | 'reference'>('calculate');
  const [billAmount, setBillAmount] = useState('');
  const [bufferPercentage, setBufferPercentage] = useState('5'); // Default 5% buffer
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('calculate');
      setBillAmount('');
      setBufferPercentage('5');
      setError(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setError(null);
    
    if (activeTab !== 'calculate') {
        setError("Esta funcionalidade ainda não está disponível.");
        return;
    }

    const parsedAmount = parseFloat(billAmount.replace(',', '.'));
    const amountInCents = Math.round(parsedAmount * 100);
    const parsedBuffer = parseInt(bufferPercentage, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('O valor da fatura deve ser um número positivo.');
      return;
    }
    if (isNaN(parsedBuffer) || parsedBuffer < 0 || parsedBuffer > 100) {
      setError('A margem de segurança deve ser um número entre 0 e 100.');
      return;
    }

    try {
      await onSave(amountInCents, parsedBuffer);
    } catch (e: any) {
      setError(e.message || 'Falha ao salvar o preço do gás.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Definir Preço do Gás" widthClass="max-w-xl">
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-gray-100 p-1.5 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setActiveTab('calculate')}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'calculate' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Calcular com Fatura
          </button>
          <button
            type="button"
            disabled
            onClick={() => setActiveTab('direct')}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTab === 'direct' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Valor Direto
          </button>
          <button
            type="button"
            disabled
            onClick={() => setActiveTab('reference')}
            className={`w-full rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              activeTab === 'reference' ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Referência
          </button>
        </div>

        <div className="p-2">
            {activeTab === 'calculate' && (
                 <div className="space-y-4">
                 <div>
                   <label htmlFor="billAmount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                     Valor Total da Fatura de Gás (R$)
                   </label>
                   <input
                     type="number"
                     id="billAmount"
                     name="billAmount"
                     step="0.01"
                     className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                     placeholder="1234,56"
                     value={billAmount}
                     onChange={(e) => setBillAmount(e.target.value)}
                     autoFocus
                   />
                 </div>
                 <div>
                   <label htmlFor="bufferPercentage" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                     Margem de Segurança (%)
                   </label>
                   <input
                     type="number"
                     id="bufferPercentage"
                     name="bufferPercentage"
                     min="0"
                     max="100"
                     className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                     value={bufferPercentage}
                     onChange={(e) => setBufferPercentage(e.target.value)}
                     placeholder="5"
                   />
                   <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                     Uma margem para cobrir possíveis vazamentos ou perdas. Recomendado: 5%.
                   </p>
                 </div>
               </div>
            )}
            {activeTab !== 'calculate' && (
                <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">
                    Funcionalidade em desenvolvimento.
                </p>
            )}
        </div>

        {error && <p className="mt-2 px-2 text-sm text-red-600">{error}</p>}

        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-white rounded-lg text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
            <button 
                type="button" 
                onClick={handleSave} 
                disabled={isLoading || activeTab !== 'calculate'} 
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition rounded-lg bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Salvando...' : 'Salvar Preço'}
            </button>
        </div>
    </Modal>
  );
};

export default DefineGasPriceModal;
