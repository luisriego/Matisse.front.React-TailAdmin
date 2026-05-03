import React, { useState, useEffect, useCallback } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { ColumnDef } from '../components/tables/DataTable';
import AddExpenseModal from '../components/modal/AddExpenseModal';
import ExpensesCard from "../components/expenses/ExpensesCard";
import { getDefaultAccountingMonthPeriod } from "../utils/defaultAccountingMonth";
import { formatDateDMY } from "../utils/dateFormat";

interface ExpenseType {
  id: string;
  name: string;
  distributionMethod?: string; 
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
  amount: number; 
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
  hasPredefinedAmount: boolean; 
  accountId: string | null; 
}

interface ApiExpense {
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
  accountId: string | null;
}


interface ApiResidentUnit {
  id: string;
  unit: string;
}

const formatPeriodLabel = (period: string): string => {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return period;
  return `${monthNamesPt[monthIndex]} de ${year}`;
};

const monthNamesPt = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const buildPeriodOptions = (count: number): string[] => {
  const options: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < count; i += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    options.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return options;
};

const Expenses: React.FC = () => {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getDefaultAccountingMonthPeriod());


  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        
        const expenseTypesResponse = await fetch('/api/v1/expense-types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expenseTypesResponse.ok) throw new Error('Falha ao carregar tipos de despesa.');
        const expenseTypesData: ExpenseType[] = await expenseTypesResponse.json();
        setExpenseTypes(expenseTypesData);

        
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsData: ApiResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);

        
        const accountsResponse = await fetch('/api/v1/accounts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!accountsResponse.ok) throw new Error('Falha ao carregar contas.');
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData.accounts);
      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    };
    fetchInitialData();
  }, []);

  const fetchExpenses = useCallback(async () => {
    
    setLoadingExpenses(true);
    setExpensesError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const [yearRaw, monthRaw] = selectedPeriod.split("-");
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      if (!year || !month) {
        throw new Error("Período inválido.");
      }

      const response = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiExpense[] = await response.json();

      
      const formattedExpenses: Expense[] = data.map(exp => ({
        ...exp,
        dueDate: exp.dueDate.date,
        paidAt: exp.paidAt ? exp.paidAt.date : null,
        createdAt: exp.createdAt.date,
        expenseType: {
          id: exp.type.id,
          name: exp.type.name,
          distributionMethod: exp.type.distributionMethod, 
        },
        hasPredefinedAmount: true, 
        accountId: exp.accountId,
      }));

      setExpenses(formattedExpenses);
    } catch (err: any) {
      setExpensesError('Falha ao carregar as despesas.');
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [selectedPeriod]);

  
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'expenseType',
      header: 'Tipo',
      className: 'w-1/5',
      cell: (expense) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span>
      ),
    },
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
    {
      key: 'amount',
      header: 'Monto',
      className: 'w-40 text-right',
      cell: (expense) => (
        <span className="text-gray-800 text-theme-sm dark:text-white/90">
          {(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      className: 'w-32',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {formatDateDMY(expense.dueDate)}
        </span>
      ),
    },
    {
      key: 'residentUnit',
      header: 'Unidade',
      className: 'w-40',
      cell: (expense) => {
        
        const unit = residentUnits.find(u => u.id === expense.residentUnitId);
        return (
          <span className="text-gray-500 text-theme-sm dark:text-gray-400">
            {unit ? unit.unit : 'Geral'}
          </span>
        );
      },
    },
        {
      key: 'description',
      header: 'Descrição',
      className: 'w-1/4',
      cell: (expense) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {expense.description}
        </span>
      ),
    },
  ];

  const periodOptions = buildPeriodOptions(24);

  return (
    <>
      <PageMeta
        title="Despesas | Matisse"
        description="Página para registro de novas despesas"
      />
      <PageBreadcrumb pageTitle="Despesas" />

      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Mês/Ano</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            >
              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {formatPeriodLabel(period)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ExpensesCard
          title={`Despesas de ${formatPeriodLabel(selectedPeriod)}`}
          expenses={expenses}
          columns={columns}
          loading={loadingExpenses}
          error={expensesError}
          onAddExpense={() => setIsAddModalOpen(true)}
        />

        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onExpenseAdded={fetchExpenses}
          expenseTypes={expenseTypes}
          residentUnits={residentUnits}
          accounts={accounts}
        />
      </div>
    </>
  );
};

export default Expenses;
