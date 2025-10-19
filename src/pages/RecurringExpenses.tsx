import React, { useState, useEffect } from 'react';
import RecurringExpensesTable from '../components/expenses/RecurringExpensesTable';
import { ExpenseType, ResidentUnit, Account } from '../types';

const RecurringExpenses = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // In a real app, you would fetch these from an API.
  useEffect(() => {
    // Example: fetch('/api/v1/expense-types').then(res => res.json()).then(setExpenseTypes);
    // Example: fetch('/api/v1/accounts').then(res => res.json()).then(setAccounts);
  }, []);

  const handleYearChange = (newYear: number) => {
    setYear(newYear);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gastos Recurrentes</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => handleYearChange(year - 1)} className="px-3 py-1 border rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            &lt;
          </button>
          <span className="text-xl font-semibold">{year}</span>
          <button onClick={() => handleYearChange(year + 1)} className="px-3 py-1 border rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            &gt;
          </button>
        </div>
      </div>
      <RecurringExpensesTable
        year={year}
        expenseTypes={expenseTypes}
        residentUnits={residentUnits}
        accounts={accounts}
      />
    </div>
  );
};

export default RecurringExpenses;
