import React, { useState, useEffect, useCallback } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { ColumnDef } from '../components/tables/DataTable';
import AddExpenseModal from '../components/modal/AddExpenseModal';
import ExpensesCard from "../components/expenses/ExpensesCard";

interface ExpenseType {
  id: string;
  name: string;
  distributionMethod?: string; // Added distributionMethod
}

interface ResidentUnit {
  id: string;
  unit: string;
}

interface Account {
  id: string;
  name: string;
}

// Interfaz actualizada para coincidir con la respuesta de la API
interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
  hasPredefinedAmount: boolean; // Added for compatibility with ExpensesCard
  accountId: string | null; // Added for compatibility with ExpensesCard
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

// Interfaz para la respuesta de la API de unidades
interface ApiResidentUnit {
  id: string;
  unit: string;
}

const Expenses: React.FC = () => {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expensesError, setExpensesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);


  // Carga de datos para los selectores (Tipos de Despesa y Unidades)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        // Cargar Tipos de Despesa desde la API
        const expenseTypesResponse = await fetch('/api/v1/expense-types', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!expenseTypesResponse.ok) throw new Error('Falha ao carregar tipos de despesa.');
        const expenseTypesData: ExpenseType[] = await expenseTypesResponse.json();
        setExpenseTypes(expenseTypesData);

        // Cargar Unidades Residenciales desde la API
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsData: ApiResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);

        // Cargar Cuentas desde la API
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
    // A lógica de busca permanece a mesma, mas agora será chamada pelo modal também
    setLoadingExpenses(true);
    setExpensesError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() es 0-indexado

      const response = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiExpense[] = await response.json();

      // Mapeamos la respuesta de la API a la estructura que espera el frontend
      const formattedExpenses: Expense[] = data.map(exp => ({
        ...exp,
        dueDate: exp.dueDate.date,
        paidAt: exp.paidAt ? exp.paidAt.date : null,
        createdAt: exp.createdAt.date,
        expenseType: {
          id: exp.type.id,
          name: exp.type.name,
          distributionMethod: exp.type.distributionMethod, // Ensure distributionMethod is passed
        },
        hasPredefinedAmount: true, // Assuming all fetched expenses are confirmed
        accountId: exp.accountId,
      }));

      setExpenses(formattedExpenses);
    } catch (err: any) {
      setExpensesError('Falha ao carregar as despesas.');
      console.error("Failed to fetch expenses:", err);
    } finally {
      setLoadingExpenses(false);
    }
  }, []);

  // Carga inicial de despesas
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
          {new Date(expense.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        </span>
      ),
    },
    {
      key: 'residentUnit',
      header: 'Unidade',
      className: 'w-40',
      cell: (expense) => {
        // Buscamos la unidad residencial en el estado `residentUnits` usando el `residentUnitId` del gasto
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

  return (
    <>
      <PageMeta
        title="Despesas | Matisse"
        description="Página para registro de novas despesas"
      />
      <PageBreadcrumb pageTitle="Despesas" />

      <div className="space-y-6">
        <ExpensesCard
          title="Todas as despesas do mês atual"
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
