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
  type: {
    id: string;
    code: string;
    name: string;
    description: string;
    distributionMethod: string;
  };
}

interface ApiPendingRecurringExpense {
  id: string;
  accountId: string | null;
  amount: number;
  type: string;
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

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);

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
        const typesData = await typesRes.json();
        setExpenseTypes(typesData);

        if (!unitsRes.ok) throw new Error('Falha ao carregar unidades residenciales.');
        const unitsData = await unitsRes.json();
        setResidentUnits(unitsData);
        setGasConsumptions(unitsData.map((unit: ResidentUnit) => ({ residentUnitId: unit.id, consumption: 0 })));

        if (!accountsRes.ok) throw new Error('Falha ao carregar contas.');
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.accounts);

      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
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
      const formattedRecurring: Expense[] = recurringData.map(exp => ({
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
      }));
      setRecurringExpenses(formattedRecurring);

      const activeData: ApiActiveExpense[] = activeRes.ok ? await activeRes.json() : [];
      const formattedActive: Expense[] = activeData.map(exp => ({
        ...exp,
        dueDate: exp.dueDate.date,
        paidAt: exp.paidAt ? exp.paidAt.date : null,
        createdAt: exp.createdAt.date,
        expenseType: exp.type,
        hasPredefinedAmount: true,
        accountId: null, // Assuming active expenses have an account already, not provided here
      }));
      setActiveExpenses(formattedActive);

    } catch (err: any) {
      setExpensesError('Falha ao carregar os gastos.');
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

  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const handleGenerateSlips = async () => { /* ... */ };

  const handleGasConsumptionChange = (unitId: string, value: string) => {
    setGasConsumptions(prev => prev.map(gc => gc.residentUnitId === unitId ? { ...gc, consumption: parseFloat(value) || 0 } : gc));
  };

  const handleRecurringAmountChange = (expenseId: string, newAmount: string) => {
    const amountInCents = Math.round(parseFloat(newAmount) * 100);
    setRecurringExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, amount: amountInCents } : exp));
  };

  const handleRecurringAccountChange = (expenseId: string, newAccountId: string) => {
    setRecurringExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, accountId: newAccountId } : exp));
  };

  const handleSaveRecurringExpense = async (expenseId: string) => {
    setSavingExpenseId(expenseId);
    setError(null);
    setSuccess(null);
    const expenseToSave = recurringExpenses.find(exp => exp.id === expenseId);

    if (!expenseToSave || !expenseToSave.accountId) {
      setError("Selecione uma conta para o gasto antes de salvar.");
      setSavingExpenseId(null);
      return;
    }
    if (expenseToSave.amount <= 0) {
      setError("O monto deve ser maior que zero para salvar.");
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
        amount: expenseToSave.amount,
        date: expenseToSave.dueDate,
      };

      const response = await fetch('/api/v1/recurring-expenses/enter-monthly', {
        method: 'POST',
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingExpenseId(null);
    }
  };

  const recurringExpenseColumns: ColumnDef<Expense>[] = [
    { key: 'expenseType', header: 'Tipo', className: 'w-1/4', cell: (expense) => <span className="font-medium">{expense.expenseType?.name || 'Não especificado'}</span> },
    { key: 'description', header: 'Descrição', className: 'w-1/4', cell: (expense) => <span>{expense.description}</span> },
    {
      key: 'account',
      header: 'Conta',
      className: 'w-1/4',
      cell: (expense) => {
        const accountName = accounts.find(acc => acc.id === expense.accountId)?.name;
        if (accountName) {
          return <span>{accountName}</span>;
        }
        return (
          <select
            value={expense.accountId || ''}
            onChange={(e) => handleRecurringAccountChange(expense.id, e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
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
          return <span>{(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
        }
        return (
          <div className="flex items-center justify-end gap-2">
            <input
              type="number"
              value={expense.amount / 100}
              onChange={(e) => handleRecurringAmountChange(expense.id, e.target.value)}
              className="h-9 w-28 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-right shadow-sm focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900"
              step="0.01"
            />
            <button
              onClick={() => handleSaveRecurringExpense(expense.id)}
              disabled={savingExpenseId === expense.id || expense.amount <= 0 || !expense.accountId}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm transition bg-green-500 rounded-lg shadow-sm text-white hover:bg-green-600 disabled:bg-gray-400"
            >
              {savingExpenseId === expense.id ? '...' : 'Salvar'}
            </button>
          </div>
        );
      },
    },
  ];

  const activeExpenseColumns: ColumnDef<Expense>[] = [
    { key: 'expenseType', header: 'Tipo', className: 'w-1/3', cell: (expense) => <span className="font-medium">{expense.expenseType?.name || 'Não especificado'}</span> },
    { key: 'description', header: 'Descrição', className: 'w-1/3', cell: (expense) => <span>{expense.description}</span> },
    { key: 'amount', header: 'Monto', className: 'w-1/3 text-right', cell: (expense) => <span>{(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span> },
  ];

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

        <ComponentCard title="Gastos Recorrentes Previstos">
          {loadingExpenses ? <p>Carregando...</p> : expensesError ? <p>{expensesError}</p> : recurringExpenses.length === 0 ? <p>Nenhum gasto recorrente previsto.</p> : <DataTable columns={recurringExpenseColumns} data={recurringExpenses} />}
        </ComponentCard>

        <ComponentCard title="Gastos Eventuales del Mes">
          {loadingExpenses ? <p>Carregando...</p> : expensesError ? <p>{expensesError}</p> : activeExpenses.length === 0 ? <p>Nenhum gasto eventual registrado.</p> : <DataTable columns={activeExpenseColumns} data={activeExpenses} />}
        </ComponentCard>

        <ComponentCard title="Consumo de Gás por Unidade">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {residentUnits.map(unit => (
              <div key={unit.id} className="sm:col-span-1">
                <label htmlFor={`gas-consumption-${unit.id}`}>{`Unidade ${unit.unit}`}</label>
                <input
                  type="number"
                  id={`gas-consumption-${unit.id}`}
                  value={gasConsumptions.find(gc => gc.residentUnitId === unit.id)?.consumption || ''}
                  onChange={(e) => handleGasConsumptionChange(unit.id, e.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            ))}
          </div>
        </ComponentCard>

      </div>
    </>
  );
};

export default Slips;