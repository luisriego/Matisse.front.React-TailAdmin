import React from 'react';
import ComponentCard from '../common/ComponentCard';
import DataTable, { ColumnDef } from '../tables/DataTable';
import { Expense } from '../../types'; 

interface ExpensesCardProps {
  title: string;
  expenses: Expense[];
  columns: ColumnDef<Expense>[];
  loading: boolean;
  error: string | null;
  onAddExpense: () => void;
  
  onImportBankStatement?: () => void;
  className?: string;
}

const ExpensesCard: React.FC<ExpensesCardProps> = ({
  title,
  expenses,
  columns,
  loading,
  error,
  onAddExpense,
  onImportBankStatement,
  className = '',
}) => {
  return (
    <ComponentCard
      title={title}
      className={className}
      headerContent={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onImportBankStatement && (
            <button
              type="button"
              onClick={onImportBankStatement}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition rounded-lg border border-gray-300 bg-white text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Importar extrato
            </button>
          )}
          <button
            type="button"
            onClick={onAddExpense}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
          >
            Novo Gasto
            <span className="flex items-center">+</span>
          </button>
        </div>
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
