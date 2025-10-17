import React, { useState, useCallback, useEffect } from "react";
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

interface GasConsumption {
  residentUnitId: string;
  consumption: number;
}

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
  const [gasConsumptions, setGasConsumptions] = useState<GasConsumption[]>([]);
  const [editableAmounts, setEditableAmounts] = useState<Record<string, string>>({});

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false); // State for AddExpenseModal

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
        setGasConsumptions(unitsData.map(unit => ({ residentUnitId: unit.id, consumption: 0 })));

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

  // --- HANDLERS ---
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

  const handleGasConsumptionChange = (unitId: string, value: string) => {
    setGasConsumptions(prev => prev.map(gc => gc.residentUnitId === unitId ? { ...gc, consumption: parseFloat(value) || 0 } : gc));
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

  // --- COLUMN DEFINITIONS ---
  const recurringExpenseColumns: ColumnDef<Expense>[] = [
    { key: 'expenseType', header: 'Tipo', className: 'w-1/4', cell: (expense) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span> },
    { key: 'description', header: 'Descrição', className: 'w-1/4', cell: (expense) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{expense.description}</span> },
    {
      key: 'accountId',
      header: 'Conta',
      className: 'w-1/4',
      cell: (expense) => {
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
      className: 'w-1/4 text-right',
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

  const activeExpenseColumns: ColumnDef<Expense>[] = [
    { key: 'expenseType', header: 'Tipo', className: 'w-1/4', cell: (expense) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span> },
    { key: 'description', header: 'Descrição', className: 'w-1/2', cell: (expense) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{expense.description}</span> },
    { key: 'amount', header: 'Monto', className: 'w-1/4 text-right', cell: (expense) => <span className="text-gray-800 text-theme-sm dark:text-white/90">{(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> },
  ];

  // --- RENDER ---
  return (
    <>
      <PageMeta title="Boletos | Matisse" description="Página para geração e gestão de boletos" />
      <PageBreadcrumb pageTitle="Boletos" />
      <div className="space-y-6">
        <ComponentCard title="Gerar Boletos Mensais">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-4 mb-6">
            <div className="sm:col-span-3">
              <DatePicker
                id="slip-generation-month"
                label="Mes y Año para Generación"
                onChange={handleMonthChange}
                defaultDate={targetMonth || new Date()}
                mode="month"
                placeholder="Selecione o mês"
              />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <button
                onClick={handleGenerateSlips}
                disabled={loading || !targetMonth}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300 w-full"
              >
                {loading ? 'Gerando...' : 'Gerar Boletos'}
              </button>
            </div>
          </div>
          {error && <ErrorAlert message={error} />}
          {success && <SuccessAlert message={success} />}
        </ComponentCard>
        <ComponentCard
          title="Gastos Recorrentes Previstos"
          headerContent={
            <button
              onClick={() => setIsAddExpenseModalOpen(true)} // This will open the AddExpenseModal
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              Novo Gasto Recorrente
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {loadingExpenses ? (
            <p className="text-center">Carregando gastos recorrentes...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : recurringExpenses.length === 0 ? (
            null // Render nothing if no recurring expenses and no loading/error
          ) : (
            <DataTable columns={recurringExpenseColumns} data={recurringExpenses} />
          )}
        </ComponentCard>
        <ComponentCard title="Gastos Eventuales del Mes">
          {loadingExpenses ? (
            <p className="text-center">Carregando gastos eventuales...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : activeExpenses.length === 0 ? (
            null // Render nothing if no active expenses and no loading/error
          ) : (
            <DataTable columns={activeExpenseColumns} data={activeExpenses} />
          )}
        </ComponentCard>
        <ComponentCard title="Consumo de Gás por Unidade">
          {residentUnits.length === 0 ? (
            null // Render nothing if no resident units
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
              {residentUnits.map(unit => (
                <div key={unit.id} className="sm:col-span-1">
                  <label htmlFor={`gas-consumption-${unit.id}`} className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{`Unidade ${unit.unit}`}</label>
                  <input
                    type="number"
                    id={`gas-consumption-${unit.id}`}
                    value={gasConsumptions.find(gc => gc.residentUnitId === unit.id)?.consumption || ''}
                    onChange={(e) => handleGasConsumptionChange(unit.id, e.target.value)}
                    className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
          )}
        </ComponentCard>
      </div>
      {/* AddExpenseModal for creating new recurring expenses */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        onExpenseAdded={() => {
          if (targetMonth) {
            fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
          }
          setIsAddExpenseModalOpen(false);
        }}
        expenseTypes={expenseTypes}
        residentUnits={residentUnits}
        accounts={accounts}
        startAsRecurring={true}
      />
    </>
  );
};

export default Slips;