// --- INTERFACES ---
export interface ExpenseType {
  id: string;
  name: string;
  distributionMethod: string; // Made required
}

export interface ResidentUnit {
  id: string;
  unit: string;
}

export interface Account {
  id: string;
  name: string;
  code?: string; // Added based on the provided JSON
  description?: string; // Added based on the provided JSON
  isActive?: boolean; // Added based on the provided JSON
}

export interface Expense {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  expenseType: ExpenseType;
  hasPredefinedAmount: boolean;
  accountId: string | null;
}

export interface ApiActiveExpense {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // Corrected to be a string directly
  paidAt: string | null; // Corrected to be a string or null directly
  createdAt: string; // Corrected to be a string directly
  residentUnitId: string | null;
  type: { // Explicitly define type structure here
    id: string;
    code: string;
    name: string;
    description: string;
    distributionMethod: string;
  };
  account?: Account; // Added based on the provided JSON
  accountId: string | null;
}

export interface ApiPendingRecurringExpense {
  id: string;
  accountId: string | null;
  amount: number;
  type: string; // UUID
  dueDay: number;
  monthsOfYear: number[];
  startDate: string;
  endDate: string;
  description: string;
  notes: string;
  hasPredefinedAmount: boolean;
}

export interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number; // C/P
  currentReading: string;  // C/A
}
