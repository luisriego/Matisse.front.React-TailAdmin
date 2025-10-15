import React, { useState, useCallback, useEffect } from "react";
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

interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
}

// Interface for the API response for a single active/eventual expense
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

// New interface for the API response for pending recurring expenses
interface ApiPendingRecurringExpense {
  id: string;
  amount: number;
  type: string; // This is a UUID string
  dueDay: number;
  monthsOfYear: number[];
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
  hasPredefinedAmount: boolean;
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
  const [gasConsumptions, setGasConsumptions] = useState<GasConsumption[]>([]);

  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState<string | null>(null);

  // Load initial data (expense types, resident units)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        // Load Expense Types
        const expenseTypesResponse = await fetch('/api/v1/expense-types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expenseTypesResponse.ok) throw new Error('Falha ao carregar tipos de despesa.');
        const expenseTypesData: ExpenseType[] = await expenseTypesResponse.json();
        setExpenseTypes(expenseTypesData);

        // Load Resident Units
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciales.');
        const unitsData: ResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);

        // Initialize gas consumptions for each unit
        setGasConsumptions(unitsData.map(unit => ({ residentUnitId: unit.id, consumption: 0 })));

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
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      // Fetch Pending Recurring Expenses
      const recurringResponse = await fetch(`/api/v1/recurring-expenses/pending-monthly/${month}/${year}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const recurringData: ApiPendingRecurringExpense[] = recurringResponse.ok ? await recurringResponse.json() : [];
      const formattedRecurring: Expense[] = recurringData.map(exp => {
        const expenseType = expenseTypes.find(type => type.id === exp.type);
        const dueDate = `${year}-${month.toString().padStart(2, '0')}-${exp.dueDay.toString().padStart(2, '0')}`;
        return {
          id: exp.id,
          description: exp.description,
          amount: exp.amount,
          dueDate: dueDate,
          paidAt: null,
          createdAt: new Date().toISOString(), // Placeholder, as not provided by this endpoint
          residentUnitId: null, // Not provided by this endpoint
          expenseType: expenseType || { id: exp.type, name: 'Tipo Desconocido' }, // Fallback
        };
      });
      setRecurringExpenses(formattedRecurring);

      // Fetch Active (Eventual) Expenses
      const activeResponse = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const activeData: ApiActiveExpense[] = activeResponse.ok ? await activeResponse.json() : [];
      const formattedActive: Expense[] = activeData.map(exp => ({
        ...exp,
        dueDate: exp.dueDate.date,
        paidAt: exp.paidAt ? exp.paidAt.date : null,
        createdAt: exp.createdAt.date,
        expenseType: exp.type,
      }));
      setActiveExpenses(formattedActive);

    } catch (err: any) {
      setExpensesError('Falha ao carregar os gastos.');
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [expenseTypes]); // Add expenseTypes to dependency array

  // Fetch expenses when targetMonth changes
  useEffect(() => {
    if (targetMonth) {
      fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
    }
  }, [targetMonth, fetchExpensesForMonth]);

  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) {
      setTargetMonth(selectedDates[0]);
    }
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
          force: false, // Assuming 'force' is false by default, as per API doc example
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar os boletos.');
      }

      setSuccess(`Boletos para ${formattedMonth} gerados com sucesso!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGasConsumptionChange = (unitId: string, value: string) => {
    setGasConsumptions(prev =>
      prev.map(gc =>
        gc.residentUnitId === unitId ? { ...gc, consumption: parseFloat(value) || 0 } : gc
      )
    );
  };

  const expenseColumns: ColumnDef<Expense>[] = [
    {
      key: 'expenseType',
      header: 'Tipo',
      className: 'w-1/4',
      cell: (expense) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      className: 'w-1/2',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {expense.description}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'w-1/4 text-right',
      cell: (expense) => (
        <span className="text-gray-800 text-theme-sm dark:text-white/90">
          {(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageMeta
        title="Boletos | Matisse"
        description="Página para geração e gestão de boletos"
      />
      <PageBreadcrumb pageTitle="Boletos" />

      <div className="space-y-6">
        <ComponentCard
          title="Gerar Boletos Mensais"
        >
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-4 mb-6">
            <div className="sm:col-span-3">
              <DatePicker
                id="slip-generation-month"
                label="Mes y Año para Generación"
                onChange={handleMonthChange}
                defaultDate={targetMonth || new Date()}
                mode="month" // Re-adding mode="month" to restrict to month and year
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
          {loadingExpenses ? (
            <p className="text-center">Carregando gastos recorrentes...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : recurringExpenses.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum gasto recorrente previsto para este mês.</p>
          ) : (
            <DataTable columns={expenseColumns} data={recurringExpenses} />
          )}
        </ComponentCard>

        <ComponentCard title="Gastos Eventuales del Mes">
          {loadingExpenses ? (
            <p className="text-center">Carregando gastos eventuales...</p>
          ) : expensesError ? (
            <p className="text-center text-error-500">{expensesError}</p>
          ) : activeExpenses.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum gasto eventual registrado para este mês.</p>
          ) : (
            <DataTable columns={expenseColumns} data={activeExpenses} />
          )}
        </ComponentCard>

        <ComponentCard title="Consumo de Gás por Unidade">
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
        </ComponentCard>

      </div>
    </>
  );
};

export default Slips;