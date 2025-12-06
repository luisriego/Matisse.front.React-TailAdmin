import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { useMonthlyMetrics } from '../../hooks/useMonthlyMetrics';

const MonthlyBalanceChart: React.FC = () => {
  const { data: metrics, isLoading } = useMonthlyMetrics();

  const getMonthNames = () => {
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const categories: string[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      categories.push(monthNames[d.getMonth()]);
    }
    return categories;
  };

  const options: ApexOptions = {
    chart: {
      type: 'bar',
      height: 350,
      toolbar: {
        show: false,
      },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '55%',
        endingShape: 'rounded',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      categories: getMonthNames(),
    },
    yaxis: {
      title: {
        text: 'R$',
      },
      labels: {
        formatter: function (val) {
          return "R$ " + val.toFixed(2);
        }
      }
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return "R$ " + val.toFixed(2);
        },
      },
    },
    colors: ['#34D399', '#F87171'], // Green for income, Red for expenses
  };

  const series = [
    {
      name: 'Ingressos',
      data: (metrics?.chartIncomeData || []).map(val => val / 100),
    },
    {
      name: 'Despesas',
      data: (metrics?.chartExpenseData || []).map(val => val / 100),
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark">
      <h4 className="mb-4 text-lg font-semibold text-black dark:text-white">Balanço Mensal (Últimos 6 Meses)</h4>
      {isLoading ? (
        <p>Carregando gráfico...</p>
      ) : (
        <ReactApexChart options={options} series={series} type="bar" height={350} />
      )}
    </div>
  );
};

export default MonthlyBalanceChart;
