import { useNavigate } from "react-router-dom";
import { DashboardAccount } from "../../hooks/useDashboardData";

interface Props {
  accounts: DashboardAccount[];
  loading: boolean;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function AccountBalancesList({ accounts, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
    );
  }

  const sorted = [...accounts].sort((a, b) => b.balance - a.balance);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Saldos por conta
        </h3>
        <button
          type="button"
          onClick={() => navigate("/contas")}
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Ver contas
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Nenhuma conta ativa</p>
      ) : (
        <ul className="max-h-[240px] space-y-2 overflow-y-auto">
          {sorted.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800"
            >
              <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                {account.name}
              </span>
              <span
                className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
                  account.balance >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {formatBrl(account.balance)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
