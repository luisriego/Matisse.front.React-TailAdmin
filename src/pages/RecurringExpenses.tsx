import { useState } from 'react';
import RecurringExpensesTable from '../components/expenses/RecurringExpensesTable';

const RecurringExpenses = () => {
  const [year, setYear] = useState(new Date().getFullYear());

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
        expenseTypes={[]}
        residentUnits={[]}
        accounts={[]}
      />
    </div>
  );
};

export default RecurringExpenses;
