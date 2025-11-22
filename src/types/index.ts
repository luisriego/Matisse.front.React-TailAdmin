
export interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  residentUnitId: string | null;
  type: {
    id: string;
    code: string;
    name: string;
    description: string;
    distributionMethod: string;
  };
  account: {
    id: string;
    code: string;
    name: string;
    description: string;
    isActive: boolean;
  };
  recurringExpense: string | null;
}

export interface Income {
  id: string;
  amount: number;
  residentUnitId: string;
  type: {
    id: string;
    name: string;
    code: string;
    description: string;
  };
  dueDate: string;
  description: string;
}

export interface IncomeType {
  id: string;
  name: string;
  code: string;
  description: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  code: string;
  distributionMethod: string;
  description: string;
}

export interface ResidentUnit {
  id: string;
  unit: string;
  idealFraction: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  notificationRecipients: {
    name: string;
    email: string;
  }[];
}

export interface Account {
  id: string;
  code: string;
  name: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number | null; // Corrected type
  currentReading: string;
}

export interface FinancialEvent {
  id: string;
  title: string;
  start: string;
  allDay: boolean;
  extendedProps: {
    calendar: "Danger" | "Success";
    amount: number;
    type: "Expense" | "Income";
  };
}
