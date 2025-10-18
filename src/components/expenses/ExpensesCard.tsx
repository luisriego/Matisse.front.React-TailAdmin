import React from 'react';
import ComponentCard from '../common/ComponentCard';
import DataTable, { ColumnDef } from '../tables/DataTable';
import { Expense } from '../../types'; // Corregido: Ruta de importación

interface ExpensesCardProps {
  title: string;
  expenses: Expense[];
  columns: ColumnDef<Expense>[];
  loading: boolean;
  error: string | null;
  onAddExpense: () => void;
  className?: string;
}

const ExpensesCard: React.FC<ExpensesCardProps> = ({
  title,
  expenses,
  columns,
  loading,
  error,
  onAddExpense,
  className = '',
}) => {
  return (
    <ComponentCard
      title={title}
      className={className}
      headerContent={
        <button
          onClick={onAddExpense}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
        >
          Novo Gasto
          <span className="flex items-center">+</span>
        </button>
      }
    >
      {loading ? (
        <p className="text-center p-4">Carregando gastos...</p>
      ) : error ? (
        <p className="text-center text-error-500 p-4">{error}</p>
      ) : expenses.length === 0 ? (
        <p className="p-4 text-center text-gray-500">Nenhum gasto para este mês.</p>
      ) : (
        <DataTable columns={columns} data={expenses} />
      )}
    </ComponentCard>
  );
};

export default ExpensesCard;
