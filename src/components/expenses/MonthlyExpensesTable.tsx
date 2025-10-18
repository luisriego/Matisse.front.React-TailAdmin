import React, { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { ColumnDef } from '../tables/DataTable'; // Mantener ColumnDef si se usa, eliminar DataTable
import ExpensesCard from './ExpensesCard';
import AddExpenseModal from '../modal/AddExpenseModal';
import { ExpenseType, ResidentUnit, Account, Expense, ApiActiveExpense, ApiPendingRecurringExpense } from '../../types';

interface MonthlyExpensesTableProps {
    targetMonth: Date | null;
    expenseTypes: ExpenseType[];
    residentUnits: ResidentUnit[];
    accounts: Account[];
}

const MonthlyExpensesTable: React.FC<MonthlyExpensesTableProps> = ({
                                                                       targetMonth,
                                                                       expenseTypes,
                                                                       residentUnits,
                                                                       accounts,
                                                                   }) => {
    const [recurringExpenses, setRecurringExpenses] = useState<Expense[]>([]);
    const [activeExpenses, setActiveExpenses] = useState<Expense[]>([]);
    const [editableAmounts, setEditableAmounts] = useState<Record<string, string>>({});

    const [loadingExpenses, setLoadingExpenses] = useState(false);
    const [expensesError, setExpensesError] = useState<string | null>(null);
    const [savingExpenseId, setSavingExpenseId] = useState<string | null>(null);
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
    const [startModalAsRecurring] = useState(false);

    const fetchExpensesForMonth = useCallback(async (year: number, month: number) => {
        setLoadingExpenses(true);
        setExpensesError(null);
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Token não encontrado.");
            const headers = { Authorization: `Bearer ${token}` };

            const [recurringRes, activeRes] = await Promise.all([
                fetch(`/api/v1/recurring-expenses/pending-monthly/${month}/${year}`, { headers }),
                fetch(`/api/v1/expenses/date-range/${year}/${month}`, { headers }),
            ]);

            const recurringData: ApiPendingRecurringExpense[] = recurringRes.ok ? await recurringRes.json() : [];
            const initialEditableAmounts: Record<string, string> = {};
            const formattedRecurring: Expense[] = recurringData.map(exp => {
                if (!exp.hasPredefinedAmount) {
                    initialEditableAmounts[exp.id] = exp.amount === 0 ? '' : (exp.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                }
                const foundExpenseType = expenseTypes.find(type => type.id === exp.type);
                return {
                    id: exp.id,
                    description: exp.description,
                    amount: exp.amount,
                    dueDate: `${year}-${month.toString().padStart(2, '0')}-${exp.dueDay.toString().padStart(2, '0')}`,
                    paidAt: null,
                    createdAt: new Date().toISOString(),
                    residentUnitId: null,
                    expenseType: foundExpenseType || { id: exp.type, name: 'Tipo Desconocido', distributionMethod: 'Não disponível' },
                    hasPredefinedAmount: exp.hasPredefinedAmount,
                    accountId: exp.accountId,
                };
            });
            setRecurringExpenses(formattedRecurring);
            setEditableAmounts(initialEditableAmounts);

            const activeData: ApiActiveExpense[] = activeRes.ok ? await activeRes.json() : [];
            const formattedActive: Expense[] = activeData.map(exp => ({
                id: exp.id,
                description: exp.description,
                amount: exp.amount,
                dueDate: exp.dueDate, // Corrected: Access directly
                paidAt: exp.paidAt, // Corrected: Access directly
                createdAt: exp.createdAt, // Corrected: Access directly
                residentUnitId: exp.residentUnitId,
                expenseType: {
                    id: exp.type.id,
                    name: exp.type.name,
                    distributionMethod: exp.type.distributionMethod,
                },
                hasPredefinedAmount: true,
                accountId: exp.account?.id || exp.accountId,
            }));
            setActiveExpenses(formattedActive);

        } catch (err: unknown) {
            if (err instanceof Error) {
                setExpensesError(err.message);
            } else {
                setExpensesError('Falha ao carregar os gastos.');
            }
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoadingExpenses(false);
        }
    }, [expenseTypes]);

    useEffect(() => {
        if (targetMonth) {
            fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
        }
    }, [targetMonth, fetchExpensesForMonth]);

    const allExpenses = useMemo(() => {
        const combined = [...recurringExpenses, ...activeExpenses];
        return combined.sort((a, b) => a.description.localeCompare(b.description));
    }, [recurringExpenses, activeExpenses]);

    const openAddExpenseModal = () => {
        setIsAddExpenseModalOpen(true);
    };

    const handleEditableAmountChange = (expenseId: string, value: string) => {
        setEditableAmounts(prev => ({ ...prev, [expenseId]: value }));
    };

    const handleRecurringAccountChange = (expenseId: string, newAccountId: string) => {
        setRecurringExpenses(prev => prev.map(exp => exp.id === expenseId ? { ...exp, accountId: newAccountId } : exp));
    };

    const handleSaveRecurringExpense = async (expenseId: string) => {
        setSavingExpenseId(expenseId);
        setExpensesError(null);

        const expenseToSave = recurringExpenses.find(exp => exp.id === expenseId);
        const editableAmountStr = editableAmounts[expenseId];

        if (!expenseToSave || !expenseToSave.accountId) {
            setExpensesError("Selecione uma conta para o gasto antes de salvar.");
            setSavingExpenseId(null);
            return;
        }

        // Corrected: Inlined sanitizedAmount to remove unused variable warning
        const amountInCents = Math.round(parseFloat(editableAmountStr.replace(/\./g, '').replace(',', '.')) * 100);

        if (isNaN(amountInCents) || amountInCents <= 0) {
            setExpensesError("O monto deve ser um número maior que zero.");
            setSavingExpenseId(null);
            return;
        }

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Token não encontrado.");

            const payload = {
                id: uuidv4(),
                recurringExpenseId: expenseToSave.id,
                accountId: expenseToSave.accountId,
                amount: amountInCents,
                date: expenseToSave.dueDate,
            };

            const response = await fetch('/api/v1/recurring-expenses/enter-monthly', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao salvar o gasto.');
            }

            if (targetMonth) {
                fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
            }

        } catch (err: unknown) {
            if (err instanceof Error) {
                setExpensesError(err.message);
            } else {
                setExpensesError('Ocorreu um erro desconhecido ao salvar o gasto.');
            }
        } finally {
            setSavingExpenseId(null);
        }
    };

    const expenseColumns: ColumnDef<Expense>[] = [
        { key: 'expenseType', header: 'Tipo', className: 'w-1/5', cell: (expense) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{expense.expenseType?.name || 'Não especificado'}</span> },
        {
            key: 'distributionMethod',
            header: 'Método de Distribuição',
            className: 'w-1/5',
            cell: (expense) => (
                <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {expense.expenseType?.distributionMethod || 'N/A'}
        </span>
            ),
        },
        { key: 'description', header: 'Descrição', className: 'w-2/5', cell: (expense) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{expense.description}</span> },
        {
            key: 'status',
            header: 'Status',
            className: 'w-1/5',
            cell: (expense) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${!expense.hasPredefinedAmount
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                }`}>
                {!expense.hasPredefinedAmount ? 'Previsto' : 'Confirmado'}
            </span>
            )
        },
        {
            key: 'dueDate',
            header: 'Previsão',
            className: 'w-1/5',
            cell: (expense) => {
                if (!expense.dueDate) {
                    return <span className="text-gray-500 text-theme-sm dark:text-gray-400">N/A</span>;
                }

                const datePart = expense.dueDate.split(' ')[0]; // Obtiene "YYYY-MM-DD"
                const parts = datePart.split('-'); // ["YYYY", "MM", "DD"]

                if (parts.length === 3) {
                    const year = parts[0].substring(2); // Obtiene "YY"
                    const month = parts[1]; // Obtiene "MM"
                    const day = parts[2]; // Obtiene "DD"
                    return (
                        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
              {`${day}/${month}/${year}`}
            </span>
                    );
                }

                return <span className="text-gray-500 text-theme-sm dark:text-gray-400">Formato de Fecha Inválido</span>;
            },
        },
        {
            key: 'accountId',
            header: 'Conta',
            className: 'w-1/5',
            cell: (expense) => {
                if (expense.hasPredefinedAmount) {
                    // Ahora expense.accountId debería estar correctamente poblado desde ApiActiveExpense.account.id
                    return <span className="text-gray-500 text-theme-sm dark:text-gray-400">{accounts.find(acc => acc.id === expense.accountId)?.name || 'N/A'}</span>;
                }
                if (expense.accountId) {
                    return <span className="text-gray-500 text-theme-sm dark:text-gray-400">{accounts.find(acc => acc.id === expense.accountId)?.name || 'Conta Inválida'}</span>;
                }
                return (
                    <select
                        value={expense.accountId || ''}
                        onChange={(e) => handleRecurringAccountChange(expense.id, e.target.value)}
                        className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                    >
                        <option value="">Selecione...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                );
            },
        },
        {
            key: 'amount',
            header: 'Monto',
            className: 'w-1/5',
            cell: (expense) => {
                if (expense.hasPredefinedAmount) {
                    return <span className="text-gray-800 text-theme-sm dark:text-white/90">{(expense.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
                }
                return (
                    <div className="flex items-center justify-end gap-2">
                        <input
                            type="text"
                            inputMode="decimal"
                            value={editableAmounts[expense.id] || ''}
                            onChange={(e) => handleEditableAmountChange(expense.id, e.target.value)}
                            className="h-9 w-28 appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-right shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
                            placeholder="0,00"
                        />
                        <button
                            onClick={() => handleSaveRecurringExpense(expense.id)}
                            disabled={savingExpenseId === expense.id || !expense.accountId || !editableAmounts[expense.id]}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm transition bg-green-500 rounded-lg shadow-sm text-white hover:bg-green-600 disabled:bg-gray-400"
                        >
                            {savingExpenseId === expense.id ? '...' : 'Salvar'}
                        </button>
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <ExpensesCard
                title="Gastos del mes"
                expenses={allExpenses}
                columns={expenseColumns}
                loading={loadingExpenses}
                error={expensesError}
                onAddExpense={openAddExpenseModal}
            />

            <AddExpenseModal
                isOpen={isAddExpenseModalOpen}
                onClose={() => setIsAddExpenseModalOpen(false)}
                onExpenseAdded={() => {
                    if (targetMonth) {
                        fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
                    }
                    setIsAddExpenseModalOpen(false);
                }}
                expenseTypes={expenseTypes}
                residentUnits={residentUnits}
                accounts={accounts}
                startAsRecurring={startModalAsRecurring}
            />
        </>
    );
};

export default MonthlyExpensesTable;