import { useNavigate } from "react-router-dom";
import { DashboardSlip } from "../../hooks/useDashboardData";

interface Props {
  slips: DashboardSlip[];
  loading: boolean;
}

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function daysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000));
}

export default function PendingSlipsTable({ slips, loading }: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="h-[260px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const overdue = slips
    .filter((s) => !s.paidAt && s.dueDate && s.dueDate < today)
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Boletos vencidos
        </h3>
        <button
          type="button"
          onClick={() => navigate("/boletos")}
          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          Ver todos
        </button>
      </div>

      {overdue.length === 0 ? (
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum boleto vencido — tudo em dia!
          </p>
        </div>
      ) : (
        <div className="max-h-[240px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white text-xs uppercase text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="pb-2 text-left font-medium">Unidade</th>
                <th className="pb-2 text-right font-medium">Valor</th>
                <th className="pb-2 text-right font-medium">Vencimento</th>
                <th className="pb-2 text-right font-medium">Atraso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {overdue.slice(0, 10).map((slip) => (
                <tr key={slip.id}>
                  <td className="py-2 text-gray-700 dark:text-gray-300">
                    {slip.unitLabel ?? slip.residentUnitId?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-white/90">
                    {slip.amount ? formatBrl(slip.amount) : "—"}
                  </td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                    {slip.dueDate
                      ? new Date(slip.dueDate + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {slip.dueDate ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        {daysOverdue(slip.dueDate)}d
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
