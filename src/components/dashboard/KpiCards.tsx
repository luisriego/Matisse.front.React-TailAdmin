import React from "react";
import {
  DashboardAccount,
  DashboardExpense,
  DashboardSlip,
} from "../../hooks/useDashboardData";

function formatBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

interface KpiCardsProps {
  accounts: DashboardAccount[];
  expenses: DashboardExpense[];
  slips: DashboardSlip[];
  loading: boolean;
}

interface CardProps {
  title: string;
  value: string;
  subtitle?: string;
  color: "green" | "red" | "blue" | "amber";
  icon: React.ReactNode;
}

function Card({ title, value, subtitle, color, icon }: CardProps) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    red: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorMap[color]}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="truncate text-xl font-bold tracking-tight text-gray-900 dark:text-white/90">
            {value}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="h-[88px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
  );
}

export default function KpiCards({ accounts, expenses, slips, loading }: KpiCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);

  const slipsTotal = slips.length;
  const slipsPaid = slips.filter((s) => !!s.paidAt).length;

  const today = new Date().toISOString().slice(0, 10);
  const overdue = slips.filter((s) => !s.paidAt && s.dueDate && s.dueDate < today);
  const overdueAmount = overdue.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card
        title="Saldo total"
        value={formatBrl(totalBalance)}
        subtitle={`${accounts.length} conta${accounts.length !== 1 ? "s" : ""} ativa${accounts.length !== 1 ? "s" : ""}`}
        color={totalBalance >= 0 ? "green" : "red"}
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        }
      />
      <Card
        title="Boletos do mês"
        value={`${slipsPaid} / ${slipsTotal}`}
        subtitle={slipsTotal > 0 ? `${Math.round((slipsPaid / slipsTotal) * 100)}% cobrados` : "Nenhum gerado"}
        color="blue"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
      />
      <Card
        title="Despesas do mês"
        value={formatBrl(totalExpenses)}
        subtitle={`${expenses.length} lançamento${expenses.length !== 1 ? "s" : ""}`}
        color="amber"
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
      />
      <Card
        title="Inadimplência"
        value={overdue.length > 0 ? formatBrl(overdueAmount) : "Nenhuma"}
        subtitle={overdue.length > 0 ? `${overdue.length} boleto${overdue.length !== 1 ? "s" : ""} vencido${overdue.length !== 1 ? "s" : ""}` : "Tudo em dia"}
        color={overdue.length > 0 ? "red" : "green"}
        icon={
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        }
      />
    </div>
  );
}
