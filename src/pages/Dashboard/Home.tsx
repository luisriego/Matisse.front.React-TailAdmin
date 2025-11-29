import React, { useEffect, useState, useCallback } from 'react';
import PageMeta from '../../components/common/PageMeta';
import SummaryCard from '../../components/dashboard/SummaryCard';
import PendingBills from '../../components/dashboard/PendingBills';
import OverduePayments from '../../components/dashboard/OverduePayments';
import MonthlyBalanceChart from '../../components/dashboard/MonthlyBalanceChart';
import AccountBalances from '../../components/dashboard/AccountBalances';
import {
  ArrowUpIcon,
  ArrowDownIcon,
} from '../../icons';
import { Account, Income, Expense, ResidentUnit, AccountBalanceResponse } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AccountsApiResponse {
  accounts: Account[];
  qtd: number;
}

const Home: React.FC = () => {
  const [accountsWithBalances, setAccountsWithBalances] = useState<Account[]>([]);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [pendingBills, setPendingBills] = useState<Expense[]>([]);
  const [overduePayments] = useState<(Income & { ResidentUnit?: ResidentUnit })[]>([]);
  const [chartIncomeData, setChartIncomeData] = useState<number[]>([]);
  const [chartExpenseData, setChartExpenseData] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChartData = useCallback(async (year: number, month: number, headers: HeadersInit) => {
    const [incRes, expRes] = await Promise.all([
      fetch(`/api/v1/incomes/date-range/${year}/${month}`, { headers }),
      fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
    ]);

    const inc: Income[] = await incRes.json();
    const exp: Expense[] = await expRes.json();

    // Filter data in frontend to ensure only current month's data is used
    const filteredIncomes = inc.filter(item => {
      const itemDate = new Date(item.dueDate);
      return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
    });
    const filteredExpenses = exp.filter(item => {
      const itemDate = new Date(item.dueDate);
      return itemDate.getFullYear() === year && itemDate.getMonth() + 1 === month;
    });

    return {
      income: filteredIncomes.reduce((sum, item) => sum + item.amount, 0), // Return in cents
      expense: filteredExpenses.reduce((sum, item) => sum + item.amount, 0), // Return in cents
    };
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const [accountsRes, unitsRes] = await Promise.all([
          fetch('/api/v1/accounts', { headers }),
          fetch('/api/v1/resident-unit/actives', { headers }),
        ]);

        if (!accountsRes.ok || !unitsRes.ok) {
          throw new Error('Failed to fetch initial dashboard data');
        }

        const accountsData: AccountsApiResponse = await accountsRes.json();
        const fetchedAccounts: Account[] = accountsData.accounts;

        // Fetch balances for each account
        const accountsWithBalancesPromises = fetchedAccounts.map(async (account) => {
          const balanceRes = await fetch(`/api/v1/accounts/${account.id}/balance`, { headers });
          if (!balanceRes.ok) {
            console.warn(`Failed to fetch balance for account ${account.id}`);
            return { ...account, balance: 0 }; // Default to 0 or handle error
          }
          const balanceData: AccountBalanceResponse = await balanceRes.json();
          return { ...account, balance: balanceData.balance };
        });

        const resolvedAccountsWithBalances = await Promise.all(accountsWithBalancesPromises);
        setAccountsWithBalances(resolvedAccountsWithBalances);

        // Fetch chart data
        const chartMonths = 6;
        const incomeChart: number[] = [];
        const expenseChart: number[] = [];

        for (let i = chartMonths - 1; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const chartYear = d.getFullYear();
          const chartMonth = d.getMonth() + 1;

          const chartData = await fetchChartData(chartYear, chartMonth, headers);
          incomeChart.push(chartData.income);
          expenseChart.push(chartData.expense);
        }

        setChartIncomeData(incomeChart);
        setChartExpenseData(expenseChart);

        // Calculate monthly income and expenses for the current month based on filtered data
        const currentMonthChartData = await fetchChartData(year, month, headers);
        setMonthlyIncome(currentMonthChartData.income);
        setMonthlyExpenses(currentMonthChartData.expense);

        const expensesResponse = await fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers });
        const expenses: Expense[] = await expensesResponse.json();

        const unpaidExpenses = expenses.filter(expense => !expense.paidAt);
        setPendingBills(unpaidExpenses);

      } catch (err) {
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          setError('Não foi possível conectar ao servidor. Verifique sua conexão com a internet ou tente novamente mais tarde.');
        } else {
          setError((err as Error).message);
        }
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fetchChartData]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Erro ao carregar o dashboard: {error}</p>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title="Dashboard | Matisse - React.js Admin Dashboard Template"
        description="Dashboard principal do sistema de gestão."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccountBalances accounts={accountsWithBalances} loading={loading} />
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 2xl:gap-7.5">
            <SummaryCard
              title="Ingressos do Mês"
              value={loading ? 'Carregando...' : formatCurrency(monthlyIncome)}
              icon={<ArrowUpIcon className="w-6 h-6 text-white" />}
              bgColorClass="bg-green-500"
            />
            <SummaryCard
              title="Despesas do Mes"
              value={loading ? 'Carregando...' : formatCurrency(monthlyExpenses)}
              icon={<ArrowDownIcon className="w-6 h-6 text-white" />}
              bgColorClass="bg-red-500"
            />
          </div>
          <PendingBills bills={pendingBills} loading={loading} />
        </div>
      </div>
      <div className="mt-6">
        {overduePayments.length > 0 && (
          <OverduePayments payments={overduePayments} loading={loading} />
        )}
      </div>
      <div className="mt-6">
        <MonthlyBalanceChart incomeData={chartIncomeData} expenseData={chartExpenseData} loading={loading} />
      </div>
    </>
  );
};

export default Home;
