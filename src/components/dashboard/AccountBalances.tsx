import React from 'react';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AccountBalancesProps {
  accounts: Account[];
  loading: boolean;
}

const AccountBalances: React.FC<AccountBalancesProps> = ({ accounts, loading }) => {
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark">
      <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">Saldos por Cuenta</h4>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="space-y-4">
          {accounts.length > 0 ? (
            <>
              {accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-black dark:text-white">{account.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{account.code}</p>
                  </div>
                  <p className="font-semibold text-primary">{formatCurrency(account.balance || 0)}</p>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-4 dark:border-gray-700">
                <p className="font-semibold text-lg text-black dark:text-white">Saldo Total</p>
                <p className="font-bold text-lg text-primary">{formatCurrency(totalBalance)}</p>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma conta encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AccountBalances;
