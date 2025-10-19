import React, { useState, useCallback, useEffect, useMemo } from "react";
import ComponentCard from '../common/ComponentCard';
import DataTable, { ColumnDef } from '../tables/DataTable';
import AddExpenseModal from '../modal/AddExpenseModal';
import { ExpenseType, ResidentUnit, Account } from '../../types';

// This interface matches the API response for recurring expense definitions
interface RecurringExpenseDefinition {
    id: string;
    description: string;
    amount: number;
    dueDay: number;
    startDate: string;
    endDate: string;
    monthsOfYear: number[];
    isActive: boolean;
    hasPredefinedAmount: boolean;
    type: string; // Assuming 'type' (expense type id) is part of the response
    accountId: string | null;
}

interface RecurringExpensesTableProps {
    year: number;
    expenseTypes: ExpenseType[];
    residentUnits: ResidentUnit[];
    accounts: Account[];
}

const RecurringExpensesTable: React.FC<RecurringExpensesTableProps> = ({
    year,
    expenseTypes,
    residentUnits,
    accounts,
}) => {
    const [definitions, setDefinitions] = useState<RecurringExpenseDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);

    const fetchDefinitions = useCallback(async (fetchYear: number) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Token não encontrado.");
            const headers = { Authorization: `Bearer ${token}` };

            const response = await fetch(`/api/v1/recurring-expenses/year/${fetchYear}`, { headers });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Falha ao carregar as definições de gastos recorrentes.');
            }

            const data = await response.json();
            setDefinitions(data.expenses || []); // Assuming the definitions are in the 'expenses' property

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocorreu um erro desconhecido ao carregar as definições.');
            }
            console.error("Failed to fetch recurring expense definitions:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDefinitions(year);
    }, [year, fetchDefinitions]);

    const sortedDefinitions = useMemo(() => {
        return [...definitions].sort((a, b) => a.description.localeCompare(b.description));
    }, [definitions]);

    const openAddExpenseModal = () => {
        setIsAddExpenseModalOpen(true);
    };

    const columns: ColumnDef<RecurringExpenseDefinition>[] = [
        { key: 'description', header: 'Descrição', className: 'w-2/5', cell: (def) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{def.description}</span> },
        {
            key: 'isActive',
            header: 'Status',
            className: 'w-1/12',
            cell: (def) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${def.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                    {def.isActive ? 'Ativo' : 'Inativo'}
                </span>
            )
        },
        { key: 'dueDay', header: 'Dia Venc.', className: 'w-1/12', cell: (def) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{def.dueDay}</span> },
        {
            key: 'monthsOfYear',
            header: 'Meses',
            className: 'w-1/5',
            cell: (def) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{def.monthsOfYear.join(', ')}</span>
        },
        {
            key: 'hasPredefinedAmount',
            header: 'Tipo de Monto',
            className: 'w-1/6',
            cell: (def) => (
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${!def.hasPredefinedAmount
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                    {!def.hasPredefinedAmount ? 'Variável' : 'Fixo'}
                </span>
            )
        },
        {
            key: 'amount',
            header: 'Monto Padrão',
            className: 'w-1/6 text-right',
            cell: (def) => {
                if (!def.hasPredefinedAmount) {
                    return <span className="text-gray-500 text-theme-sm dark:text-gray-400">N/A</span>;
                }
                return <span className="text-gray-800 text-theme-sm dark:text-white/90">{(def.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
            },
        },
    ];

    return (
        <>
            <ComponentCard
                title="Definições de Gastos Recorrentes"
                className="mt-4"
                headerContent={
                    <button
                        onClick={openAddExpenseModal}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
                    >
                        Nova Definição
                        <span className="flex items-center">+</span>
                    </button>
                }
            >
                {loading ? (
                    <p className="text-center p-4">Carregando definições...</p>
                ) : error ? (
                    <p className="text-center text-error-500 p-4">{error}</p>
                ) : sortedDefinitions.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">Nenhuma definição de gasto recorrente encontrada para este ano.</p>
                ) : (
                    <DataTable columns={columns} data={sortedDefinitions} />
                )}
            </ComponentCard>

            <AddExpenseModal
                isOpen={isAddExpenseModalOpen}
                onClose={() => setIsAddExpenseModalOpen(false)}
                onExpenseAdded={() => {
                    fetchDefinitions(year);
                    setIsAddExpenseModalOpen(false);
                }}
                expenseTypes={expenseTypes}
                residentUnits={residentUnits}
                accounts={accounts}
                startAsRecurring={true}
            />
        </>
    );
};

export default RecurringExpensesTable;
