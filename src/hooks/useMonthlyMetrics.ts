import { useQuery } from '@tanstack/react-query';
import { Income, Expense } from '../types';

interface MonthlyData {
  income: number;
  expense: number;
}

interface Metrics {
  monthlyIncome: number;
  monthlyExpenses: number;
  chartIncomeData: number[];
  chartExpenseData: number[];
}

const fetchMonthlyData = async (year: number, month: number, headers: HeadersInit): Promise<MonthlyData> => {
  const [incRes, expRes] = await Promise.all([
    fetch(`/api/v1/incomes/date-range/${year}/${month}`, { headers }),
    fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
  ]);

  if (!incRes.ok || !expRes.ok) {
    throw new Error('Failed to fetch monthly data');
  }

  const inc: Income[] = await incRes.json();
  const exp: Expense[] = await expRes.json();

  const income = inc.reduce((sum, item) => sum + item.amount, 0);
  const expense = exp.reduce((sum, item) => sum + item.amount, 0);

  return { income, expense };
};

const fetchMetrics = async (): Promise<Metrics> => {
  const token = localStorage.getItem('token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const chartMonths = 6;
  const chartIncomeData: number[] = [];
  const chartExpenseData: number[] = [];

  const promises: Promise<MonthlyData>[] = [];
  for (let i = chartMonths - 1; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const chartYear = d.getFullYear();
    const chartMonth = d.getMonth() + 1;
    promises.push(fetchMonthlyData(chartYear, chartMonth, headers));
  }

  const results = await Promise.all(promises);

  results.forEach(result => {
    chartIncomeData.push(result.income);
    chartExpenseData.push(result.expense);
  });

  const currentMonthData = results[results.length - 1];

  return {
    monthlyIncome: currentMonthData.income,
    monthlyExpenses: currentMonthData.expense,
    chartIncomeData,
    chartExpenseData,
  };
};

export const useMonthlyMetrics = () => {
  return useQuery<Metrics, Error>({
    queryKey: ['monthlyMetrics'],
    queryFn: fetchMetrics,
  });
};
