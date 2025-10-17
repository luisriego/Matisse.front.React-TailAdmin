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
  const [isSavingGas, setIsSavingGas] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [startModalAsRecurring, setStartModalAsRecurring] = useState(true);

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

        if (unitsData.length > 0) {
          setSelectedUnitId(unitsData[0].id);
        }

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
  const openAddExpenseModal = (recurring: boolean) => {
    setStartModalAsRecurring(recurring);
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

  const handleCurrentReadingChange = (residentUnitId: string, value: string) => {
    const sanitizedValue = value.replace(/[^0-9,.]/g, '');
    setGasReadings(prevReadings =>
      prevReadings.map(reading =>
        reading.residentUnitId === residentUnitId
          ? { ...reading, currentReading: sanitizedValue }
          : reading
      )
    );
  };

  const handleSaveGasConsumption = async () => {
    setIsSavingGas(true);
    setError(null);
    setSuccess(null);

    const gasAccount = accounts.find(acc => acc.name.toLowerCase().includes('gás'));
    if (!gasAccount) {
      setError("Conta de Gás não encontrada. Verifique as configurações de contas.");
      setIsSavingGas(false);
      return;
    }

    if (!targetMonth) {
      setError("Por favor, selecione o mês antes de salvar.");
      setIsSavingGas(false);
      return;
    }

    const gasExpenseType = expenseTypes.find(type => type.name.toLowerCase().includes('gás'));
    if (!gasExpenseType) {
      setError("Tipo de despesa 'Gás' não encontrado. Verifique as configurações.");
      setIsSavingGas(false);
      return;
    }

    const unitPrice = parseFloat(GAS_UNIT_PRICE.replace(',', '.')) || 0;
    if (unitPrice <= 0) {
      setError("O valor unitário do gás (definido no código) deve ser maior que zero.");
      setIsSavingGas(false);
      return;
    }

    const expensesToCreate = gasReadings
      .map(reading => {
        const previousReading = reading.previousReading;
        const currentReadingNum = parseFloat(reading.currentReading.replace(',', '.')) || 0;
        const totalConsumption = currentReadingNum > previousReading ? currentReadingNum - previousReading : 0;
        const totalValue = totalConsumption * unitPrice;
        const amountInCents = Math.round(totalValue * 100);

        if (amountInCents <= 0) return null;

        const year = targetMonth.getFullYear();
        const month = targetMonth.getMonth() + 1;

        return {
          id: uuidv4(),
          description: `Consumo de Gás - Apto. ${reading.unit}`,
          amount: amountInCents,
          dueDate: `${year}-${month.toString().padStart(2, '0')}-10`, // Default due date to 10th
          accountId: gasAccount.id,
          expenseTypeId: gasExpenseType.id,
          residentUnitId: reading.residentUnitId,
        };
      })
      .filter(Boolean); // Remove nulls

    if (expensesToCreate.length === 0) {
      setSuccess("Nenhum consumo de gás para salvar.");
      setIsSavingGas(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const response = await fetch('/api/v1/expenses/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ expenses: expensesToCreate }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar o consumo de gás.');
      }

      setSuccess(`${expensesToCreate.length} consumo(s) de gás salvo(s) com sucesso!`);
      fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
      // Optionally reset gas form
      setGasReadings(gasReadings.map(r => ({ ...r, previousReading: parseFloat(r.currentReading.replace(',', '.')) || r.previousReading, currentReading: '' })));

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido ao salvar o consumo de gás.');
      }
    } finally {
      setIsSavingGas(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <ComponentCard title="Gerar Boletos Mensais">
              <div className="grid grid-cols-1 gap-y-4 mb-6">
                <div>
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
                  <div className="w-1/3 sm:w-1/4">
                    <ul className="flex flex-col rounded-lg border border-gray-200 dark:border-gray-700">
                      {gasReadings.map((reading) => (
                        <li key={reading.residentUnitId} className="border-b border-gray-200 last:border-b-0 dark:border-gray-700">
                          <button
                            onClick={() => setSelectedUnitId(reading.residentUnitId)}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium ${selectedUnitId === reading.residentUnitId
                                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400'
                                : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/[0.05]'
                              }`}>
                            <span>{`Apto. ${reading.unit}`}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex-grow">
                    {(() => {
                      const selectedReading = gasReadings.find(r => r.residentUnitId === selectedUnitId);
                      if (!selectedReading) return <div className="flex h-full items-center justify-center text-gray-500">Selecione um apartamento</div>;

                      const { residentUnitId, unit, previousReading, currentReading } = selectedReading;
                      const isEditing = editingUnitId === residentUnitId;
                      const currentReadingNum = parseFloat(currentReading.replace(',', '.')) || 0;
                      const totalConsumption = currentReadingNum > previousReading ? currentReadingNum - previousReading : 0;
                      const unitPrice = parseFloat(GAS_UNIT_PRICE.replace(',', '.')) || 0;
                      const totalValue = totalConsumption * unitPrice;

                      return (
                        <div className="flex flex-col justify-between h-full">
                          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <h4 className="text-lg font-bold text-gray-800 dark:text-white/90">{`Apartamento ${unit}`}</h4>
                              <button
                                onClick={() => isEditing ? setEditingUnitId(null) : setEditingUnitId(residentUnitId)}
                                className="flex-shrink-0 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                                aria-label={isEditing ? "Confirmar" : "Editar"}
                              >
                                {isEditing ? (
                                  <svg className="h-6 w-6 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                ) : (
                                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                )}
                              </button>
                            </div>
                            <div className="mt-4 space-y-3 text-sm">
                              <div className="flex justify-between"><span>Anterior:</span><span className="font-medium">{previousReading.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m³</span></div>
                              <div className={`flex items-center justify-between ${isEditing ? 'py-2' : ''}`}>
                                <span>Atual:</span>
                                {isEditing ? (
                                  <input
                                    id={`gas-current-${residentUnitId}`}
                                    type="text"
                                    inputMode="decimal"
                                    value={currentReading}
                                    onChange={(e) => handleCurrentReadingChange(residentUnitId, e.target.value)}
                                    className="h-9 w-28 appearance-none rounded-lg border border-brand-500 bg-transparent px-3 py-2 text-sm text-right shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50 dark:border-brand-800"
                                    placeholder="0,00"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium">{currentReadingNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m³</span>
                                )}
                              </div>
                              <div className="flex justify-between"><span>Total:</span><span className="font-medium">{totalConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m³</span></div>
                              <div className="flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
                                <span className="font-semibold">Valor:</span>
                                <span className="font-bold text-green-600">{totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end pt-6">
                            <button
                              onClick={handleSaveGasConsumption}
                              disabled={isSavingGas}
                              className="inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-sm transition bg-green-500 rounded-lg shadow-theme-xs text-white hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {isSavingGas ? 'Salvando...' : 'Salvar Consumo de Gás'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </ComponentCard>
          </div>
        </div>

        <ComponentCard
          title="Gastos Recorrentes Previstos"
          headerContent={
            <button
              onClick={() => openAddExpenseModal(true)}
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
            null
          ) : (
            <DataTable columns={recurringExpenseColumns} data={recurringExpenses} />
          )}
        </ComponentCard>

        <ComponentCard
          title="Gastos Eventuales del Mes"
          headerContent={
            <button
              onClick={() => openAddExpenseModal(false)}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              Novo Gasto Eventual
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {loadingExpenses ? (
            <p className="text-center">Carregando gastos eventuales...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : activeExpenses.length === 0 ? (
            null
          ) : (
            <DataTable columns={activeExpenseColumns} data={activeExpenses} />
          )}
        </ComponentCard>
      </div>

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
        startAsRecurring={startModalAsRecurring}
      />
    </>
  );
};

export default Slips;
