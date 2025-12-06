import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Expense } from '../../types/expense';
import { formatCurrency } from '../../utils/formatters';

// 1. Función para obtener las facturas pendientes
const fetchPendingBills = async (): Promise<Expense[]> => {
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const res = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers });
  if (!res.ok) {
    throw new Error('Error al obtener las facturas pendientes');
  }
  const expenses: Expense[] = await res.json();
  return expenses.filter(expense => !expense.paidAt);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PendingBills: React.FC = () => {
  // 2. Usamos useQuery para obtener los datos
  const { data: bills, isLoading, isError, error } = useQuery<Expense[], Error>({
    queryKey: ['pendingBills'],
    queryFn: fetchPendingBills,
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark">
      <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">Contas a Pagar</h4>
      {isLoading ? (
        <p>Carregando...</p>
      ) : isError ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <div className="space-y-4">
          {bills && bills.length > 0 ? (
            bills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-black dark:text-white">{bill.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Vencimento: {formatDate(bill.dueDate)}</p>
                </div>
                <p className="font-semibold text-red-500">{formatCurrency(bill.amount)}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma conta pendente.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingBills;
