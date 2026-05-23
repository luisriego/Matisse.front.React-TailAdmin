import { useEffect, useState, useCallback } from "react";
import {
  attachUnitLabels,
  resolveSlipsForMonth,
} from "../utils/dashboardSlips";

export interface DashboardAccount {
  id: string;
  name: string;
  isActive: boolean;
  balance: number;
}

export interface DashboardExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  type?: { name: string };
}

export interface DashboardIncome {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  residentUnitId: string | null;
}

export interface DashboardSlip {
  id: string;
  residentUnitId?: string | null;
  unitLabel?: string;
  amount?: number | null;
  status?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
}

export interface DashboardRecurring {
  id: string;
  description: string;
  amount: number;
  dueDay: number;
  type: string;
}

export interface MonthlySnapshot {
  label: string;
  year: number;
  month: number;
  expenses: number;
  incomes: number;
}

export interface DashboardData {
  accounts: DashboardAccount[];
  expenses: DashboardExpense[];
  incomes: DashboardIncome[];
  slips: DashboardSlip[];
  recurring: DashboardRecurring[];
  monthlyHistory: MonthlySnapshot[];
  loading: boolean;
  error: string | null;
}

function monthKey(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function getLastNMonths(n: number): Array<{ year: number; month: number; label: string }> {
  const now = new Date();
  const months: Array<{ year: number; month: number; label: string }> = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
    });
  }
  return months;
}

export function useDashboardData(): DashboardData {
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [expenses, setExpenses] = useState<DashboardExpense[]>([]);
  const [incomes, setIncomes] = useState<DashboardIncome[]>([]);
  const [slips, setSlips] = useState<DashboardSlip[]>([]);
  const [recurring, setRecurring] = useState<DashboardRecurring[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<MonthlySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Sem autenticação");
      setLoading(false);
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const [accountsRes, expensesRes, incomesRes, recurringRes, unitsRes] = await Promise.allSettled([
        fetch("/api/v1/accounts", { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }).then((r) =>
          r.ok ? r.json() : null,
        ),
        fetch("/api/v1/incomes", { headers }).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/v1/recurring-expenses/pending-monthly/${month}/${year}`, { headers }).then(
          (r) => (r.ok ? r.json() : null),
        ),
        fetch("/api/v1/resident-unit/actives", { headers }).then((r) => (r.ok ? r.json() : null)),
      ]);

      const unitLabelById: Record<string, string> = {};
      if (unitsRes.status === "fulfilled" && unitsRes.value) {
        const units = Array.isArray(unitsRes.value)
          ? unitsRes.value
          : unitsRes.value.residentUnits ?? unitsRes.value.units ?? [];
        for (const u of units as Array<{ id: string; unit: string }>) {
          if (u.id && u.unit) unitLabelById[u.id] = u.unit;
        }
      }

      if (accountsRes.status === "fulfilled" && accountsRes.value) {
        const list: DashboardAccount[] = (accountsRes.value.accounts ?? accountsRes.value ?? [])
          .filter((a: DashboardAccount) => a.isActive !== false);

        const balanceResults = await Promise.allSettled(
          list.map((a) =>
            fetch(`/api/v1/accounts/${a.id}/balance`, { headers })
              .then((r) => (r.ok ? r.json() : null))
              .then((data) => {
                if (data && typeof data.balance === "number") return data.balance;
                if (data && typeof data.balanceInCents === "number") return data.balanceInCents;
                return a.balance ?? 0;
              }),
          ),
        );
        const withBalances = list.map((a, i) => ({
          ...a,
          balance:
            balanceResults[i].status === "fulfilled"
              ? (balanceResults[i] as PromiseFulfilledResult<number>).value
              : a.balance ?? 0,
        }));
        setAccounts(withBalances);
      }

      if (expensesRes.status === "fulfilled" && expensesRes.value) {
        const raw = Array.isArray(expensesRes.value)
          ? expensesRes.value
          : expensesRes.value.expenses ?? [];
        setExpenses(raw);
      }

      if (incomesRes.status === "fulfilled" && incomesRes.value) {
        const raw = Array.isArray(incomesRes.value)
          ? incomesRes.value
          : incomesRes.value.incomes ?? [];
        setIncomes(raw);
      }

      if (recurringRes.status === "fulfilled" && recurringRes.value) {
        const raw = Array.isArray(recurringRes.value)
          ? recurringRes.value
          : recurringRes.value.expenses ?? recurringRes.value.recurringExpenses ?? [];
        setRecurring(raw);
      }

      // Monthly history (last 6 months of expenses)
      const months = getLastNMonths(6);
      const historyResults = await Promise.allSettled(
        months.map(({ year: y, month: m }) =>
          fetch(`/api/v1/expenses/date-range/${y}/${m}`, { headers }).then((r) =>
            r.ok ? r.json() : null,
          ),
        ),
      );

      const history: MonthlySnapshot[] = months.map((m, i) => {
        let expTotal = 0;
        if (historyResults[i].status === "fulfilled") {
          const val = (historyResults[i] as PromiseFulfilledResult<unknown>).value;
          const arr = Array.isArray(val) ? val : (val as Record<string, unknown>)?.expenses ?? [];
          expTotal = (arr as DashboardExpense[]).reduce(
            (sum: number, e: DashboardExpense) => sum + (e.amount ?? 0),
            0,
          );
        }
        return { ...m, expenses: expTotal, incomes: 0 };
      });

      // Fill incomes per month from the full incomes list
      const allIncomes: DashboardIncome[] =
        incomesRes.status === "fulfilled" && incomesRes.value
          ? Array.isArray(incomesRes.value)
            ? incomesRes.value
            : incomesRes.value.incomes ?? []
          : [];
      for (const inc of allIncomes) {
        const d = new Date(inc.dueDate || inc.paidAt || "");
        if (isNaN(d.getTime())) continue;
        const key = monthKey(d.getFullYear(), d.getMonth() + 1);
        const entry = history.find((h) => monthKey(h.year, h.month) === key);
        if (entry) entry.incomes += inc.amount ?? 0;
      }
      setMonthlyHistory(history);

      const slipRows = await resolveSlipsForMonth(year, month, headers);
      setSlips(attachUnitLabels(slipRows, unitLabelById));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { accounts, expenses, incomes, slips, recurring, monthlyHistory, loading, error };
}
