
export interface ExpenseType {
  id: string;
  name: string;
  distributionMethod?: string;
}

export interface ResidentUnit {
  id: string;
  unit: string;
}

export interface Account {
  id: string;
  name: string;
  description?: string; 
  isActive?: boolean; 
}

export interface Expense {
  id: string;
  description: string;
  amount: number; 
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
  account?: Account; 
  accountId: string | null;
}

export interface ApiPendingRecurringExpense {
  id: string;
  accountId: string | null;
  amount: number;
  type: string; 
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
  /** Leitura de fecho do mês anterior ao boleto; `null` se a API não tiver registo (não confundir com 0 m³). */
  previousReading: number | null;
  currentReading: string;
}
