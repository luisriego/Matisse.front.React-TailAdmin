import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Account, AccountBalanceResponse } from '../../types';
import { formatCurrency } from '../../utils/formatters';

// 1. Función que busca los datos. Podría moverse a un archivo `api/accounts.ts` en el futuro.
const fetchAccountsWithBalances = async (): Promise<Account[]> => {
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  const accountsRes = await fetch('/api/v1/accounts', { headers });
  if (!accountsRes.ok) throw new Error('Error al obtener las cuentas');
  const accountsData = await accountsRes.json();
  const fetchedAccounts: Account[] = accountsData.accounts;

  const accountsWithBalancesPromises = fetchedAccounts.map(async (account) => {
    const balanceRes = await fetch(`/api/v1/accounts/${account.id}/balance`, { headers });
    if (!balanceRes.ok) {
      console.warn(`Failed to fetch balance for account ${account.id}`);
      return { ...account, balance: 0 };
    }
    const balanceData: AccountBalanceResponse = await balanceRes.json();
    return { ...account, balance: balanceData.balance };
  });

  return Promise.all(accountsWithBalancesPromises);
};

const AccountBalances: React.FC = () => {
  // 2. Usamos useQuery en lugar de props.
  const { data: accounts, isLoading, isError, error } = useQuery<Account[], Error>({
    queryKey: ['accountsWithBalances'], // Clave única para esta query
    queryFn: fetchAccountsWithBalances,   // Función que obtiene los datos
  });

  const totalBalance = accounts?.reduce((sum, account) => sum + (account.balance || 0), 0) || 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark">
      <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">Saldos por Cuenta</h4>
      {isLoading ? (
        <p>Carregando...</p>
      ) : isError ? (
        <p className="text-red-500">Error: {error.message}</p>
      ) : (
        <div className="space-y-4">
          {accounts && accounts.length > 0 ? (
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
