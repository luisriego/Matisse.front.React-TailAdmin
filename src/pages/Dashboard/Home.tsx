import PageMeta from "../../components/common/PageMeta";
import KpiCards from "../../components/dashboard/KpiCards";
import RevenueExpenseChart from "../../components/dashboard/RevenueExpenseChart";
import GasConsumptionChart from "../../components/dashboard/GasConsumptionChart";
import PendingSlipsTable from "../../components/dashboard/PendingSlipsTable";
import PendingRecurringTable from "../../components/dashboard/PendingRecurringTable";
import AccountBalancesList from "../../components/dashboard/AccountBalancesList";
import { useDashboardData } from "../../hooks/useDashboardData";

export default function Home() {
  const { accounts, expenses, slips, recurring, monthlyHistory, loading, error } =
    useDashboardData();

  return (
    <>
      <PageMeta
        title="Painel do Condomínio | Matisse"
        description="Visão geral operacional do condomínio"
      />

      <div className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        <KpiCards
          accounts={accounts}
          expenses={expenses}
          slips={slips}
          loading={loading}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <RevenueExpenseChart data={monthlyHistory} loading={loading} />
          <GasConsumptionChart />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PendingSlipsTable slips={slips} loading={loading} />
          <PendingRecurringTable recurring={recurring} loading={loading} />
          <div className="xl:col-span-2">
            <AccountBalancesList accounts={accounts} loading={loading} />
          </div>
        </div>
      </div>
    </>
  );
}
