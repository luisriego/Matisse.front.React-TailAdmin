import React from 'react';
import { Expense } from '../../types/expense';
import { formatCurrency } from '../../utils/formatters';

interface PendingBillsProps {
  bills: Expense[];
  loading: boolean;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PendingBills: React.FC<PendingBillsProps> = ({ bills, loading }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark">
      <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">Contas a Pagar</h4>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-4">
          {bills.length > 0 ? (
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
