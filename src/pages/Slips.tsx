import React, { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DatePicker from '../components/form/date-picker';
import SuccessAlert from '../components/common/alerts/SuccessAlert';
import ErrorAlert from '../components/common/alerts/ErrorAlert';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import { Hook } from 'flatpickr/dist/types/options';
import AddExpenseModal from '../components/modal/AddExpenseModal';
import AddGasConsumptionModal from "../components/modal/AddGasConsumptionModal";

// --- INTERFACES ---
interface ExpenseType {
  id: string;
  name: string;
}

interface ResidentUnit {
  id: string;
  unit: string;
}

interface Account {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
  hasPredefinedAmount: boolean;
  accountId: string | null;
}

interface ApiActiveExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: { date: string };
  paidAt: { date: string } | null;
  createdAt: { date: string };
  residentUnitId: string | null;
  type: ExpenseType;
  accountId: string | null;
}

interface ApiPendingRecurringExpense {
  id: string;
  accountId: string | null;
  amount: number;
  type: string; // UUID
  dueDay: number;
  monthsOfYear: number[];
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
  hasPredefinedAmount: boolean;
}

interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number; // C/P
  currentReading: string;  // C/A
}

// Provisional constant for gas unit price
const GAS_UNIT_PRICE = '5.00'; // Example value: 5 BRL per m³

const Slips: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [targetMonth, setTargetMonth] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
  const [activeExpenses, setActiveExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editableAmounts, setEditableAmounts] = useState<Record<string, string>>({});

  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedGasReading, setSelectedGasReading] = useState<GasReading | null>(null);

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [startModalAsRecurring] = useState(false);

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");
        const headers = { Authorization: `Bearer ${token}` };

        const [typesRes, unitsRes, accountsRes] = await Promise.all([
          fetch('/api/v1/expense-types', { headers }),
          fetch('/api/v1/resident-unit/actives', { headers }),
          fetch('/api/v1/accounts', { headers }),
        ]);

        if (!typesRes.ok) throw new Error('Falha ao carregar tipos de despesa.');
        if (!unitsRes.ok) throw new Error('Falha ao carregar unidades residenciais.');
        if (!accountsRes.ok) throw new Error('Falha ao carregar contas.');

        const expenseTypesData: ExpenseType[] = await typesRes.json();
        const unitsData: ResidentUnit[] = await unitsRes.json();
        const accountsData = await accountsRes.json();

        setExpenseTypes(expenseTypesData);
        setResidentUnits(unitsData);
        setAccounts(accountsData.accounts || []);

        const initialGasReadings: GasReading[] = unitsData.map(unit => ({
          residentUnitId: unit.id,
          unit: unit.unit,
          previousReading: 0, // Placeholder as requested
          currentReading: '',
        }));
        setGasReadings(initialGasReadings);

      } catch (err: unknown) {
        console.error("Erro ao carregar dados iniciais:", err);
        setExpensesError("Falha ao carregar dados de configuração. Tente recarregar a página.");
      }
    };
    fetchInitialData();
  }, []);

  const fetchExpensesForMonth = useCallback(async (year: number, month: number) => {
    setLoadingExpenses(true);
    setExpensesError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");
      const headers = { Authorization: `Bearer ${token}` };

      const [recurringRes, activeRes] = await Promise.all([
        fetch(`/api/v1/recurring-expenses/pending-monthly/${month}/${year}`, { headers }),
        fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
      ]);

      const recurringData: ApiPendingRecurringExpense[] = recurringRes.ok ? await recurringRes.json() : [];
      const initialEditableAmounts: Record<string, string> = {};
      const formattedRecurring: Expense[] = recurringData.map(exp => {
        if (!exp.hasPredefinedAmount) {
          initialEditableAmounts[exp.id] = exp.amount === 0 ? '' : (exp.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
        return {
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          dueDate: `${year}-${month.toString().padStart(2, '0')}-${exp.dueDay.toString().padStart(2, '0')}`,
          paidAt: null,
          createdAt: new Date().toISOString(),
          residentUnitId: null,
          expenseType: expenseTypes.find(type => type.id === exp.type) || { id: exp.type, name: 'Tipo Desconhecido' },
          hasPredefinedAmount: exp.hasPredefinedAmount,
          accountId: exp.accountId,
        };
      });
      setRecurringExpenses(formattedRecurring);
      setEditableAmounts(initialEditableAmounts);

      const activeData: ApiActiveExpense[] = activeRes.ok ? await activeRes.json() : [];
      const formattedActive: Expense[] = activeData.map(exp => ({
        id: exp.id,
        description: exp.description,
        amount: exp.amount,
        dueDate: exp.dueDate.date,
        paidAt: exp.paidAt ? exp.paidAt.date : null,
        createdAt: exp.createdAt.date,
        residentUnitId: exp.residentUnitId,
        expenseType: exp.type,
        hasPredefinedAmount: true,
        accountId: exp.accountId,
      }));
      setActiveExpenses(formattedActive);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setExpensesError(err.message);
      } else {
        setExpensesError('Falha ao carregar os gastos.');
      }
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [expenseTypes]);

  useEffect(() => {
    if (targetMonth) {
      fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
    }
  }, [targetMonth, fetchExpensesForMonth]);

  const allExpenses = useMemo(() => {
    const combined = [...recurringExpenses, ...activeExpenses];
    return combined.sort((a, b) => a.description.localeCompare(b.description));
  }, [recurringExpenses, activeExpenses]);

  // --- HANDLERS ---
  const openAddExpenseModal = () => {
    setIsAddExpenseModalOpen(true);
  };

  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const handleGenerateSlips = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!targetMonth) {
      setError("Por favor, selecione um mês y año para generar los boletos.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth() + 1; // getMonth() is 0-indexed
      const formattedMonth = `${year}-${month.toString().padStart(2, '0')}`;

      const response = await fetch('/api/v1/slips/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetMonth: formattedMonth,
          force: false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar os boletos.');
      }

      setSuccess(`Boletos para ${formattedMonth} gerados com sucesso!`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido ao gerar os boletos.');
      }
    } finally {
      setLoading(false);
    }
  };
    const handleEditableAmountChange = (expenseId: string, value: string) => {
    setEditableAmounts(prev => ({ ...prev, [expenseId]: value }));
  };

  const handleRecurringAccountChange = (expenseId: string, newAccountId: string) => {
    setRecurringExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, accountId: newAccountId } : exp));
  };

  const handleSaveRecurringExpense = async (expenseId: string) => {
    setSavingExpenseId(expenseId);
    setError(null);
    setSuccess(null);

    const expenseToSave = recurringExpenses.find(exp => exp.id === expenseId);
    const editableAmountStr = editableAmounts[expenseId];

    if (!expenseToSave || !expenseToSave.accountId) {
      setError("Selecione uma conta para o gasto antes de salvar.");
      setSavingExpenseId(null);
      return;
    }

    const sanitizedAmount = editableAmountStr.replace(/\./g, '').replace(',', '.');
    const amountInCents = Math.round(parseFloat(sanitizedAmount) * 100);

    if (isNaN(amountInCents) || amountInCents <= 0) {
      setError("O monto deve ser um número maior que zero.");
      setSavingExpenseId(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const payload = {
        id: uuidv4(),
        recurringExpenseId: expenseToSave.id,
        accountId: expenseToSave.accountId,
        amount: amountInCents,
        date: expenseToSave.dueDate,
      };

      const response = await fetch('/api/v1/recurring-expenses/enter-monthly', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar o gasto.');
      }

      setSuccess(`Gasto "${expenseToSave.description}" salvo com sucesso!`);
      if (targetMonth) {
        fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
      }

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido ao salvar o gasto.');
      }
    } finally {
      setSavingExpenseId(null);
    }
  };

  const handleOpenGasModal = (reading: GasReading) => {
    setSelectedGasReading(reading);
    setIsGasModalOpen(true);
  };

  const handleCloseGasModal = () => {
    setIsGasModalOpen(false);
    setSelectedGasReading(null);
  };

  const handleSaveGasConsumption = (updatedReading: GasReading) => {
    setGasReadings(prevReadings =>
      prevReadings.map(r =>
        r.residentUnitId === updatedReading.residentUnitId ? updatedReading : r
      )
    );
    setSuccess('Consumo de gás salvo com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };


  // --- COLUMN DEFINITIONS ---
  const expenseColumns: ColumnDef<Expense>[] = [
    { key: 'expenseType', header: 'Tipo', className: 'w-1/5', cell: (expense) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span> },
    { key: 'description', header: 'Descrição', className: 'w-2/5', cell: (expense) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{expense.description}</span> },
    {
        key: 'status',
        header: 'Status',
        className: 'w-1/5',
        cell: (expense) => (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${!expense.hasPredefinedAmount
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                }`}>
                {!expense.hasPredefinedAmount ? 'Previsto' : 'Confirmado'}
            </span>
        )
    },
    {
      key: 'accountId',
      header: 'Conta',
      className: 'w-1/5',
      cell: (expense) => {
        if (expense.hasPredefinedAmount) {
            return <span className="text-gray-500 text-theme-sm dark:text-gray-400">{accounts.find(acc => acc.id === expense.accountId)?.name || 'N/A'}</span>;
        }
        if (expense.accountId) {
          return <span className="text-gray-500 text-theme-sm dark:text-gray-400">{accounts.find(acc => acc.id === expense.accountId)?.name || 'Conta Inválida'}</span>;
        }
        return (
          <select
            value={expense.accountId || ''}
            onChange={(e) => handleRecurringAccountChange(expense.id, e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">Selecione...</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        );
      },
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'w-1/5 text-right',
      cell: (expense) => {
        if (expense.hasPredefinedAmount) {
          return <span className="text-gray-800 text-theme-sm dark:text-white/90">{(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={editableAmounts[expense.id] || ''}
              onChange={(e) => handleEditableAmountChange(expense.id, e.target.value)}
              className="h-9 w-28 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-right shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
              placeholder="0,00"
            />
            <button
              onClick={() => handleSaveRecurringExpense(expense.id)}
              disabled={savingExpenseId === expense.id || !expense.accountId || !editableAmounts[expense.id]}
              className="inline-flex items-center justify-center px-3 py-2 text-sm transition bg-green-500 rounded-lg shadow-sm text-white hover:bg-green-600 disabled:bg-gray-400"
            >
              {savingExpenseId === expense.id ? '...' : 'Salvar'}
            </button>
          </div>
        );
      },
    },
  ];

  // --- RENDER ---
  return (
    <>
      <PageMeta title="Boletos | Matisse" description="Página para geração e gestão de boletos" />
      <PageBreadcrumb pageTitle="Boletos" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ComponentCard title="Gerar Boletos Mensais" className="h-full">
              <div className="flex flex-col h-full p-6">
                <div className="flex-grow">
                  <DatePicker
                    id="slip-generation-month"
                    label="Mes y Año"
                    onChange={handleMonthChange}
                    defaultDate={targetMonth || new Date()}
                    mode="month"
                    placeholder="Selecione o mês"
                  />
                </div>
                <div>
                  <div className="mb-4">
                    {error && <ErrorAlert message={error} />}
                    {success && <SuccessAlert message={success} />}
                  </div>
                  <button
                    onClick={handleGenerateSlips}
                    disabled={loading || !targetMonth}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300 w-full"
                  >
                    {loading ? 'Gerando...' : 'Gerar Boletos'}
                  </button>
                </div>
              </div>
            </ComponentCard>
          </div>
          <div className="lg:col-span-3">
            <ComponentCard
              title="Consumo de Gás por Unidade"
              headerContent={
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Valor Unitário:
                  </span>
                  <span className="ml-2 text-sm font-semibold text-gray-800 dark:text-white/90">
                    {(parseFloat(GAS_UNIT_PRICE.replace(',', '.')) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              }
            >
              {residentUnits.length === 0 ? (
                <p className="text-center text-gray-500">Não há unidades residenciais cadastradas.</p>
              ) : (
                <div className="flex gap-6">
                  <div className="w-full">
                    <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
                      <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                        {gasReadings.map((reading) => {
                            const currentReadingNum = parseFloat(reading.currentReading.replace(',', '.')) || 0;
                            const totalConsumption = currentReadingNum > reading.previousReading ? currentReadingNum - reading.previousReading : 0;
                            const unitPrice = parseFloat(GAS_UNIT_PRICE.replace(',', '.')) || 0;
                            const totalValue = totalConsumption * unitPrice;

                            return (
                                <li key={reading.residentUnitId} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                                    <div className="flex items-center gap-3 font-medium text-gray-500 dark:text-gray-400">
                                        <span><svg className="fill-current" width="20" height="20" viewBox="0 0 20 20"
                                                   fill="none" xmlns="http://www.w3.org/2000/svg"><path
                                            fill-rule="evenodd" clip-rule="evenodd"
                                            d="M12.2989 1.12891C11.4706 1.12891 10.799 1.80033 10.7989 2.62867L10.7988 3.1264V3.12659L10.799 4.87507H6.14518C3.60237 4.87507 1.54102 6.93642 1.54102 9.47923V14.3207C1.54102 15.4553 2.46078 16.3751 3.59536 16.3751H6.14518H9.99935H16.2077C17.4503 16.3751 18.4577 15.3677 18.4577 14.1251V10.1251C18.4577 7.22557 16.1072 4.87507 13.2077 4.87507H12.299L12.2989 3.87651H13.7503C14.509 3.87651 15.124 3.26157 15.1242 2.50293C15.1243 1.74411 14.5092 1.12891 13.7503 1.12891H12.2989ZM3.04102 9.47923C3.04102 7.76485 4.4308 6.37507 6.14518 6.37507C7.85957 6.37507 9.24935 7.76485 9.24935 9.47923V14.8751H6.14518H3.59536C3.28921 14.8751 3.04102 14.6269 3.04102 14.3207V9.47923ZM10.7493 9.47923V14.8751H16.2077C16.6219 14.8751 16.9577 14.5393 16.9577 14.1251V10.1251C16.9577 8.054 15.2788 6.37507 13.2077 6.37507H9.54559C10.2933 7.19366 10.7493 8.28319 10.7493 9.47923Z"
                                            fill=""></path></svg></span>
                                        <span>{`Apto. ${reading.unit}`}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span
                                            className={`font-semibold ${totalValue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {totalValue.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                                        </span>
                                        <button onClick={() => handleOpenGasModal(reading)} className="text-gray-400 hover:text-brand-500">
                                            <svg width="1em" height="1em" viewBox="0 0 21 21" fill="none"
                                                 xmlns="http://www.w3.org/2000/svg" className="size-5"><path
                                                fill-rule="evenodd" clip-rule="evenodd"
                                                d="M17.0911 3.53206C16.2124 2.65338 14.7878 2.65338 13.9091 3.53206L5.6074 11.8337C5.29899 12.1421 5.08687 12.5335 4.99684 12.9603L4.26177 16.445C4.20943 16.6931 4.286 16.9508 4.46529 17.1301C4.64458 17.3094 4.90232 17.3859 5.15042 17.3336L8.63507 16.5985C9.06184 16.5085 9.45324 16.2964 9.76165 15.988L18.0633 7.68631C18.942 6.80763 18.942 5.38301 18.0633 4.50433L17.0911 3.53206ZM14.9697 4.59272C15.2626 4.29982 15.7375 4.29982 16.0304 4.59272L17.0027 5.56499C17.2956 5.85788 17.2956 6.33276 17.0027 6.62565L16.1043 7.52402L14.0714 5.49109L14.9697 4.59272ZM13.0107 6.55175L6.66806 12.8944C6.56526 12.9972 6.49455 13.1277 6.46454 13.2699L5.96704 15.6283L8.32547 15.1308C8.46772 15.1008 8.59819 15.0301 8.70099 14.9273L15.0436 8.58468L13.0107 6.55175Z"
                                                fill="currentColor"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </ComponentCard>
          </div>
        </div>

        <ComponentCard
          title="Gastos del Mes"
          headerContent={
            <button
              onClick={openAddExpenseModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              Novo Gasto
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {loadingExpenses ? (
            <p className="text-center p-4">Carregando gastos...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500 p-4">{expensesError}</p>
          ) : allExpenses.length === 0 ? (
            <p className="p-4 text-center text-gray-500">Nenhum gasto para este mês.</p>
          ) : (
            <DataTable columns={expenseColumns} data={allExpenses} />
          )}
        </ComponentCard>
      </div>

      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onExpenseAdded={() => {
          if (targetMonth) { // Refresh expenses after adding a new one
            fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
          }
          setIsAddExpenseModalOpen(false);
        }}
        expenseTypes={expenseTypes}
        residentUnits={residentUnits}
        accounts={accounts}
        startAsRecurring={startModalAsRecurring}
      />

      <AddGasConsumptionModal
        isOpen={isGasModalOpen}
        onClose={handleCloseGasModal}
        gasReading={selectedGasReading}
        gasUnitPrice={GAS_UNIT_PRICE}
        onSave={handleSaveGasConsumption}
      />
    </>
  );
};

export default Slips;
