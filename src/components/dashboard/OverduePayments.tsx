import React from 'react';
import { Income } from '../../types/income';
import { ResidentUnit } from '../../types/residentUnit';
import { formatCurrency } from '../../utils/formatters';

interface OverduePaymentsProps {
  payments: (Income & { residentUnit?: ResidentUnit })[];
  loading: boolean;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const OverduePayments: React.FC<OverduePaymentsProps> = ({ payments, loading }) => {
  return (
    <div className="rounded-lg border border-red-500 bg-red-50 p-4 shadow-sm dark:border-red-700 dark:bg-red-900/20">
      <h4 className="mb-4 text-lg font-semibold text-red-700 dark:text-red-300">Pagamentos Atrasados</h4>
      {loading ? (
        <p className="text-red-600 dark:text-red-400">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {payments.length > 0 ? (
            payments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {payment.residentUnit?.unit || 'Unidade desconhecida'} - {payment.description}
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Vencimento: {formatDate(payment.dueDate)}
                  </p>
                </div>
                <p className="font-semibold text-red-800 dark:text-red-200">{formatCurrency(payment.amount)}</p>
              </div>
            ))
          ) : (
            <p className="text-center text-red-600 dark:text-red-400">Nenhum pagamento atrasado.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default OverduePayments;
