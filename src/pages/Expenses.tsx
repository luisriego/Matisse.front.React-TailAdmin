import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { ColumnDef } from '../components/tables/DataTable';
import AddExpenseModal from '../components/modal/AddExpenseModal';
import ExpensesCard from "../components/expenses/ExpensesCard";
import { Expense, ExpenseType, ResidentUnit, Account, ApiExpense } from '../types';

// --- Funciones de Fetching ---

const fetchExpenseTypes = async (): Promise<ExpenseType[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch('/api/v1/expense-types', { headers });
  if (!response.ok) throw new Error('Falha ao carregar tipos de despesa.');
  return response.json();
};

const fetchResidentUnits = async (): Promise<ResidentUnit[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch('/api/v1/resident-unit/actives', { headers });
  if (!response.ok) throw new Error('Falha ao carregar unidades residenciais.');
  return response.json();
};

const fetchAccounts = async (): Promise<Account[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch('/api/v1/accounts', { headers });
  if (!response.ok) throw new Error('Falha ao carregar contas.');
  const data = await response.json();
  return data.accounts;
};

const fetchExpenses = async (): Promise<Expense[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const response = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data: ApiExpense[] = await response.json();
  return data.map(exp => ({
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
};

// --- Componente ---

const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- Queries ---
  const { data: expenseTypes = [] } = useQuery<ExpenseType[], Error>({ queryKey: ['expenseTypes'], queryFn: fetchExpenseTypes });
  const { data: residentUnits = [] } = useQuery<ResidentUnit[], Error>({ queryKey: ['residentUnits'], queryFn: fetchResidentUnits });
  const { data: accounts = [] } = useQuery<Account[], Error>({ queryKey: ['accounts'], queryFn: fetchAccounts });
  
  const { data: expenses = [], isLoading: loadingExpenses, isError, error: expensesError } = useQuery<Expense[], Error>({
    queryKey: ['expenses'],
    queryFn: fetchExpenses,
  });

  const handleMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setIsAddModalOpen(false);
  };

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
          error={isError ? (expensesError as Error).message : null}
          onAddExpense={() => setIsAddModalOpen(true)}
        />

        <AddExpenseModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onExpenseAdded={handleMutationSuccess}
          expenseTypes={expenseTypes}
          residentUnits={residentUnits}
          accounts={accounts}
        />
      </div>
    </>
  );
};

export default Expenses;
