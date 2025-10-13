import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import { Account } from '../../types/accountApi';
import DatePicker from '../form/date-picker'; // Importar el DatePicker

interface SetInitialBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onInitialBalanceSet: () => void;
}

const SetInitialBalanceModal: React.FC<SetInitialBalanceModalProps> = ({ isOpen, onClose, account, onInitialBalanceSet }) => {
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAmount(0);
      // Asegurarse de que la fecha por defecto esté en el formato YYYY-MM-DD
      setDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    setIsLoading(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticação não encontrado.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/v1/accounts/${account.id}/initial-balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amount * 100, date })
      });

      if (response.ok) {
        onInitialBalanceSet();
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Ocorreu um erro ao definir o saldo inicial.');
        console.error('Error setting initial balance:', errorData);
      }
    } catch (error) {
      setError('Falha na comunicação com o servidor. Tente novamente.');
      console.error('Error setting initial balance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !account) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[500px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Definir Saldo Inicial</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Defina o saldo inicial para a conta: {account.name}</p>
        </div>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="custom-scrollbar h-[200px] overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <div className="grid grid-cols-1 gap-x-6 gap-y-5">
                <div className="col-span-1">
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Valor</label>
                  <input
                    className=" h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
                    type="number"
                    name="amount"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value))}
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <DatePicker
                    id="initial-balance-date"
                    label="Data"
                    defaultDate={date}
                    onChange={([selectedDate]) => {
                      if (selectedDate) {
                        setDate(selectedDate.toISOString().split('T')[0]);
                      }
                    }}
                    placeholder="Seleccionar fecha"
                  />
                </div>
              </div>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-4 px-2">{error}</p>}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
            <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-lg transition  px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">
              {isLoading ? 'Definindo...' : 'Definir Saldo'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default SetInitialBalanceModal;