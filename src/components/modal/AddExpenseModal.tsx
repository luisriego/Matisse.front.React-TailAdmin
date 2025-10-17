import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/modal';
import { v4 as uuidv4 } from 'uuid';
import SuccessAlert from '../common/alerts/SuccessAlert';
import ErrorAlert from '../common/alerts/ErrorAlert';
import DatePicker from '../form/date-picker'; // Import the custom date picker
import { Hook } from 'flatpickr/dist/types/options'; // Import Hook type

interface ExpenseType {
  id: string;
  name: string;
}

interface Account {
  id: string;
  name: string;
}

interface ResidentUnit {
  id: string;
  unit: string;
}

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  expenseTypes: ExpenseType[];
  residentUnits: ResidentUnit[];
  accounts: Account[];
  startAsRecurring?: boolean; // New optional prop
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
  expenseTypes,
  residentUnits,
  accounts,
  startAsRecurring = false, // Default to false
}) => {
  const [isRecurring, setIsRecurring] = useState(startAsRecurring);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState<Date | null>(new Date());
  const [expenseTypeId, setExpenseTypeId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [residentUnitId, setResidentUnitId] = useState('');
  const [dueDay, setDueDay] = useState<number | ''>('');
  const [monthsOfYear, setMonthsOfYear] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasPredefinedAmount, setHasPredefinedAmount] = useState(false);

  const currentMonth = new Date().getMonth() + 1;

  const availableMonths = Array.from({ length: 12 }, (_, i) => i + 1).filter(month => month >= currentMonth);
  const allAvailableSelected = availableMonths.length > 0 && availableMonths.every(m => monthsOfYear.includes(m));

  const handleSelectAllMonths = () => {
    if (allAvailableSelected) {
      setMonthsOfYear(prev => prev.filter(m => !availableMonths.includes(m)));
    } else {
      setMonthsOfYear(prev => [...new Set([...prev, ...availableMonths])]);
    }
  };

  // Limpa o formulário quando o modal é fechado o se abre con un nuevo estado inicial
  useEffect(() => {
    if (!isOpen) {
      setIsRecurring(startAsRecurring);
      setDescription('');
      setAmount('');
      setExpenseDate(new Date());
      setExpenseTypeId('');
      setAccountId('');
      setResidentUnitId('');
      setDueDay('');
      setMonthsOfYear([]);
      setIsActive(true);
      setLoading(false);
      setError(null);
      setSuccess(null);
      setHasPredefinedAmount(false);
    } else {
      // When modal opens, set initial isRecurring state based on prop
      setIsRecurring(startAsRecurring);
    }
  }, [isOpen, startAsRecurring]);

  const handleDateChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) {
      setExpenseDate(selectedDates[0]);
    } else {
      setExpenseDate(null);
    }
  }, []);

  const handleMonthChange = (month: number) => {
    setMonthsOfYear(prev =>
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

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

      let endpoint = '/api/v1/expenses';
      let method = 'POST';
      let payload: any;

      if (isRecurring) {
        endpoint = '/api/v1/recurring-expenses/create';
        method = 'PUT';
        const parsedAmount = parseFloat(amount);

        if (hasPredefinedAmount && (isNaN(parsedAmount) || parsedAmount <= 0)) {
            throw new Error("Debe ingresar un monto válido si 'Valor Predefinido?' está marcado.");
        }

        payload = {
          id: uuidv4(),
          amount: hasPredefinedAmount && !isNaN(parsedAmount) ? Math.round(parsedAmount * 100) : 0,
          type: expenseTypeId,
          accountId,
          dueDay: dueDay,
          monthsOfYear: monthsOfYear,
          description: description || null,
          hasPredefinedAmount: hasPredefinedAmount,
        };
      } else {
        if (!expenseDate) {
          throw new Error("Por favor, selecione a data da despesa.");
        }
        payload = {
          id: uuidv4(),
          description,
          amount: Math.round(parseFloat(amount) * 100),
          dueDate: expenseDate.toISOString().split('T')[0],
          type: expenseTypeId,
          accountId,
          isActive,
          residentUnitId: residentUnitId || null,
        };
      }

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
        throw new Error(errorData.message || 'Falha ao criar a despesa.');
      }

      setSuccess('Despesa criada com sucesso!');
      onExpenseAdded();
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
    <Modal isOpen={isOpen} onClose={onClose} className="w-3/4 max-w-[700px]">
      <div className="no-scrollbar relative overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
        <div className="px-2 pr-14">
          <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">Registrar Nova Despesa</h4>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">Preencha os dados para adicionar uma nova despesa.</p>
        </div>
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-gray-100 p-1.5 dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setIsRecurring(false)}
            className={`w-full rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
              !isRecurring ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Gasto Único
          </button>
          <button
            type="button"
            onClick={() => setIsRecurring(true)}
            className={`w-full rounded-md px-5 py-2.5 text-sm font-medium transition-colors ${
              isRecurring ? 'bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
            }`}
          >
            Gasto Recorrente
          </button>
        </div>
        <form className="flex flex-col" onSubmit={handleSubmit}>
          <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
            <div className="mt-7">
              <h5 className="mb-5 text-lg font-medium text-gray-800 dark:text-white/90 lg:mb-6">Detalhes da Despesa</h5>
              <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-4"> 

                <div className="sm:col-span-2"> 
                  <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Monto (R$)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required={!isRecurring} 
                      step="0.01"
                      className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                      placeholder="150.50"
                    />
                  </div>
                </div>

                {isRecurring && (
                  <div className="sm:col-span-1 flex items-end pb-1"> 
                    <input
                      type="checkbox"
                      id="hasPredefinedAmount"
                      checked={hasPredefinedAmount}
                      onChange={(e) => setHasPredefinedAmount(e.target.checked)}
                      disabled={!amount || parseFloat(amount) === 0} 
                      className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                    />
                    <label htmlFor="hasPredefinedAmount" className="ml-2 text-sm text-gray-700 dark:text-gray-400">Valor Predefinido?</label>
                  </div>
                )}

                {isRecurring ? (
                  <div className="sm:col-span-1"> 
                    <label htmlFor="dueDay" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Dia Vto.</label>
                    <input type="number" id="dueDay" value={dueDay} onChange={(e) => setDueDay(parseInt(e.target.value))} required min="1" max="31" className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" />
                  </div>
                ) : (
                  <div className="sm:col-span-2"> 
                    <DatePicker
                      id="expense-date"
                      label="Data da Despesa"
                      onChange={handleDateChange}
                      defaultDate={expenseDate || new Date()}
                      placeholder="Selecione a data"
                    />
                  </div>
                )}

                <div className="sm:col-span-2"> 
                  <label htmlFor="expenseType" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tipo de Despesa</label>
                  <select id="expenseType" value={expenseTypeId} onChange={(e) => setExpenseTypeId(e.target.value)} required className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800">
                    <option value="">Selecione um tipo</option>
                    {expenseTypes.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                  </select>
                </div>

                <div className="sm:col-span-2"> 
                  <label htmlFor="account" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Conta</label>
                  <select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} required className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800">
                    <option value="">Selecione uma conta</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                  </select>
                </div>

                {!isRecurring && (
                    <div className="sm:col-span-4 mt-5"> 
                      <label htmlFor="residentUnit" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Unidade Residencial (Opcional)</label>
                      <select id="residentUnit" value={residentUnitId} onChange={(e) => setResidentUnitId(e.target.value)} className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800">
                        <option value="">Nenhuma / Geral</option>
                        {residentUnits.map(unit => <option key={unit.id} value={unit.id}>{unit.unit}</option>)}
                      </select>
                    </div>
                )}

                {isRecurring && (
                  <div className="sm:col-span-4 mt-5"> 
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-400">Meses de Recorrência</label>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="selectAllMonths"
                          onChange={handleSelectAllMonths}
                          checked={allAvailableSelected}
                          className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
                        />
                        <label htmlFor="selectAllMonths" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Todos
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <div key={month} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`month-${month}`}
                            checked={monthsOfYear.includes(month)}
                            onChange={() => handleMonthChange(month)}
                            disabled={month < currentMonth}
                            className="w-4 h-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500 disabled:cursor-not-allowed"
                          />
                          <label
                            htmlFor={`month-${month}`}
                            className={`ml-2 text-sm ${
                              month < currentMonth
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {new Date(0, month - 1).toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="sm:col-span-4 mt-5">
                  <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Descrição {isRecurring && '(Opcional)'}</label>
                  <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} required={!isRecurring} className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800" />
                </div>
              </div>
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <button type="button" onClick={onClose} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-white rounded-lg text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300 ">Cancelar</button>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition rounded-lg bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 ">
              {loading ? 'Salvando...' : 'Salvar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddExpenseModal;