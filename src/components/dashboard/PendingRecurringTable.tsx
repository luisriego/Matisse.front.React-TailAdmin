import { useNavigate } from "react-router-dom";
import { DashboardRecurring } from "../../hooks/useDashboardData";

interface Props {
  recurring: DashboardRecurring[];
  loading: boolean;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function PendingRecurringTable({ recurring, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return <Skeleton />;
  }

  const pending = [...recurring]
    .sort((a, b) => a.dueDay - b.dueDay)
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Despesas recorrentes pendentes
        </h3>
        <button
          type="button"
          onClick={() => navigate("/despesas")}
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Ver despesas
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhuma despesa recorrente pendente neste mês
          </p>
        </div>
      ) : (
        <RecurringRows pending={pending} />
      )}
    </div>
  );
}

function RecurringRows({ pending }: { pending: DashboardRecurring[] }) {
  return (
    <div className="max-h-[240px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th className="pb-2 text-left font-medium">Descrição</th>
            <th className="pb-2 text-right font-medium">Valor</th>
            <th className="pb-2 text-right font-medium">Dia</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {pending.map((row) => (
            <tr key={row.id}>
              <td className="max-w-[180px] truncate py-2 text-gray-700 dark:text-gray-300">
                {row.description || row.type || "—"}
              </td>
              <td className="py-2 text-right font-medium text-gray-900 dark:text-white/90">
                {formatBrl(row.amount)}
              </td>
              <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                {row.dueDay > 0 ? `Dia ${row.dueDay}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
  );
}
