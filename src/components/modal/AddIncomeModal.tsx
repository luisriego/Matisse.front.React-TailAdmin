import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/modal';
import { v4 as uuidv4 } from 'uuid';
import SuccessAlert from '../common/alerts/SuccessAlert';
import ErrorAlert from '../common/alerts/ErrorAlert';
import DatePicker from '../form/date-picker';
import { Hook } from 'flatpickr/dist/types/options';

interface ResidentUnit {
  id: string;
  unit: string;
}

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncomeAdded: () => void;
  residentUnits: ResidentUnit[];
}

const AddIncomeModal: React.FC<AddIncomeModalProps> = ({
  isOpen,
  onClose,
  onIncomeAdded,
  residentUnits,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [type, setType] = useState('');
  const [residentUnitId, setResidentUnitId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setDescription('');
      setAmount('');
      setDueDate(new Date());
      setType('');
      setResidentUnitId('');
      setLoading(false);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleDateChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) {
      setDueDate(selectedDates[0]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      if (!residentUnitId || !amount || !type || !dueDate || !description) {
        throw new Error("Por favor, preencha todos os campos obrigatórios.");
      }

      const endpoint = '/api/v1/incomes/enter';
      const method = 'PUT';

      const payload = {
        id: uuidv4(),
        residentUnitId,
        amount: Math.round(parseFloat(amount) * 100),
        type,
        dueDate: dueDate.toISOString().split('T')[0],
        description,
      };

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao criar o ingresso.');
      }

      setSuccess('Ingresso criado com sucesso!');
      onIncomeAdded();
      setTimeout(() => {
        onClose();
      }, 1000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[800px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Registrar Novo Ingresso</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Preencha os dados para adicionar um novo ingresso.</p>
        </div>
        
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="custom-scrollbar h-auto overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Detalhes do Ingresso</h5>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-4">

                <div className="sm:col-span-2">
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Monto (R$)</label>
                  <input
                    type="number"
                    id="amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    step="0.01"
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    placeholder="500.00"
                  />
                </div>

                <div className="sm:col-span-2">
                  <DatePicker
                    id="income-due-date"
                    label="Data de Vencimento"
                    onChange={handleDateChange}
                    defaultDate={dueDate || new Date()}
                    placeholder="Selecione a data"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="residentUnit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Unidade Residencial</label>
                  <select id="residentUnit" value={residentUnitId} onChange={(e) => setResidentUnitId(e.target.value)} required className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800">
                    <option value="">Selecione uma unidade</option>
                    {residentUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.unit}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="type" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tipo de Ingresso</label>
                  <input type="text" id="type" value={type} onChange={(e) => setType(e.target.value)} required className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" placeholder='Aluguel, Taxa, etc.' />
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descrição</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={2}
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>
              </div>
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-white rounded-lg text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition rounded-lg bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">
              {loading ? 'Salvando...' : 'Salvar Ingresso'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddIncomeModal;