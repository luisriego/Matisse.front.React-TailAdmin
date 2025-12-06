import React from 'react';
import PageMeta from '../../components/common/PageMeta';
import SummaryCard from '../../components/dashboard/SummaryCard';
import PendingBills from '../../components/dashboard/PendingBills';
import OverduePayments from '../../components/dashboard/OverduePayments';
import MonthlyBalanceChart from '../../components/dashboard/MonthlyBalanceChart';
import AccountBalances from '../../components/dashboard/AccountBalances';
import { ArrowUpIcon, ArrowDownIcon } from '../../icons';
import { Income, ResidentUnit } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useMonthlyMetrics } from '../../hooks/useMonthlyMetrics';

const Home: React.FC = () => {
  const { data: metrics, isLoading, isError, error } = useMonthlyMetrics();
  const [overduePayments] = React.useState<(Income & { ResidentUnit?: ResidentUnit })[]>([]);

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Erro ao carregar o dashboard: {error.message}</p>
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
        <AccountBalances />
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 2xl:gap-7.5">
            <SummaryCard
              title="Ingressos do Mês"
              value={isLoading ? 'Carregando...' : formatCurrency(metrics?.monthlyIncome || 0)}
              icon={<ArrowUpIcon className="w-6 h-6 text-white" />}
              bgColorClass="bg-green-500"
            />
            <SummaryCard
              title="Despesas do Mes"
              value={isLoading ? 'Carregando...' : formatCurrency(metrics?.monthlyExpenses || 0)}
              icon={<ArrowDownIcon className="w-6 h-6 text-white" />}
              bgColorClass="bg-red-500"
            />
          </div>
          <PendingBills />
        </div>
      </div>
      <div className="mt-6">
        {overduePayments.length > 0 && (
          <OverduePayments payments={overduePayments} loading={isLoading} />
        )}
      </div>
      <div className="mt-6">
        <MonthlyBalanceChart />
      </div>
    </>
  );
};

export default Home;
