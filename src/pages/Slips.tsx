import React, { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { ColumnDef } from '../components/tables/DataTable';
import { Hook } from 'flatpickr/dist/types/options';
import AddExpenseModal from '../components/modal/AddExpenseModal';
import AddGasConsumptionModal from "../components/modal/AddGasConsumptionModal";
import SlipSettings from "../components/slips/SlipSettings";
import GasConsumptionCard from "../components/gas/GasConsumptionCard";
import GenerateSlipsCard from "../components/slips/GenerateSlipsCard";
import ExpensesCard from "../components/expenses/ExpensesCard";

// --- INTERFACES ---
interface ExpenseType {
  id: string;
  name: string;
  distributionMethod: string; // Made required
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
  type: { // Explicitly define type structure here
    id: string;
    code: string;
    name: string;
    description: string;
    distributionMethod: string;
  };
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

  const [extraFee, setExtraFee] = useState('');
  const [reserveFund, setReserveFund] = useState('');
  const [gasUnitPrice, setGasUnitPrice] = useState('5,00'); // Default value

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
        setExpenseTypes(expenseTypesData);
        const unitsData: ResidentUnit[] = await unitsRes.json();
        const accountsData = await accountsRes.json();

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
        const foundExpenseType = expenseTypes.find(type => type.id === exp.type);
        return {
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          dueDate: `${year}-${month.toString().padStart(2, '0')}-${exp.dueDay.toString().padStart(2, '0')}`,
          paidAt: null,
          createdAt: new Date().toISOString(),
          residentUnitId: null,
          expenseType: foundExpenseType || { id: exp.type, name: 'Tipo Desconhecido', distributionMethod: 'Não disponível' },
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
        expenseType: {
          id: exp.type.id,
          name: exp.type.name,
          distributionMethod: exp.type.distributionMethod,
        },
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

      const parseCurrency = (value: string) => {
        if (!value) return 0;
        const sanitized = value.replace(/\./g, '').replace(',', '.');
        return Math.round(parseFloat(sanitized) * 100);
      };

      const response = await fetch('/api/v1/slips/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetMonth: formattedMonth,
          force: false,
          extraFee: parseCurrency(extraFee),
          reserveFund: parseCurrency(reserveFund),
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
    {
      key: 'distributionMethod',
      header: 'Método de Distribuição',
      className: 'w-1/5',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {expense.expenseType?.distributionMethod || 'N/A'}
        </span>
      ),
    },
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GenerateSlipsCard
            targetMonth={targetMonth}
            onMonthChange={handleMonthChange}
            onGenerate={handleGenerateSlips}
            loading={loading}
            error={error}
            success={success}
            className="lg:col-span-3 h-full"
          />
          <div className="lg:col-span-4">
            <SlipSettings
              extraFee={extraFee}
              setExtraFee={setExtraFee}
              reserveFund={reserveFund}
              setReserveFund={setReserveFund}
              gasUnitPrice={gasUnitPrice}
              setGasUnitPrice={setGasUnitPrice}
            />
          </div>
          <GasConsumptionCard
            residentUnits={residentUnits}
            gasReadings={gasReadings}
            gasUnitPrice={gasUnitPrice}
            onOpenGasModal={handleOpenGasModal}
            className="lg:col-span-5"
          />
        </div>

        <ExpensesCard
          title="Gastos del mes"
          expenses={allExpenses}
          columns={expenseColumns}
          loading={loadingExpenses}
          error={expensesError}
          onAddExpense={openAddExpenseModal}
        />
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
        gasUnitPrice={gasUnitPrice}
        onSave={handleSaveGasConsumption}
      />
    </>
  );
};

export default Slips;
