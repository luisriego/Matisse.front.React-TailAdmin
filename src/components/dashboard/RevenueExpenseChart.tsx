import React from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { MonthlySnapshot } from "../../hooks/useDashboardData";

interface Props {
  data: MonthlySnapshot[];
  loading: boolean;
}

export default function RevenueExpenseChart({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="h-[320px] animate-pulse rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]" />
    );
  }

  const categories = data.map((d) => d.label);
  const expensesSeries = data.map((d) => Math.round(d.expenses / 100));
  const incomesSeries = data.map((d) => Math.round(d.incomes / 100));

  const options: ApexOptions = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: { borderRadius: 4, columnWidth: "55%" },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: { style: { fontSize: "12px" } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) =>
          val.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }),
      },
    },
    legend: { position: "top" },
    colors: ["#ef4444", "#10b981"],
    tooltip: {
      y: {
        formatter: (val: number) =>
          val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      },
    },
  };

  const series = [
    { name: "Despesas", data: expensesSeries },
    { name: "Ingressos", data: incomesSeries },
  ];

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
        Despesas vs Ingressos (últimos 6 meses)
      </h3>
      <Chart options={options} series={series} type="bar" height={280} />
    </div>
  );
}
