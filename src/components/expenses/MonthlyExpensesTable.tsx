import React, { useState, useCallback, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import { ColumnDef } from '../tables/DataTable'; 
import ExpensesCard from './ExpensesCard';
import AddExpenseModal from '../modal/AddExpenseModal';
import BankStatementImportModal from '../modal/BankStatementImportModal';
import { Modal } from "../ui/modal";
import { ExpenseType, ResidentUnit, Account, Expense, ApiActiveExpense, ApiPendingRecurringExpense } from '../../types';
import { formatDateDMY } from "../../utils/dateFormat";

interface MonthlyExpensesTableProps {
    targetMonth: Date | null;
    expenseTypes: ExpenseType[];
    residentUnits: ResidentUnit[];
    accounts: Account[];
}

const CORRECTION_TAG_RE = /\s*\[CORRIGE:([^\]]+)\]\s*$/i;
const SUBSTITUTED_TAG_RE = /\s*\[SUBSTITUIDO:([^\]]+)\]\s*$/i;
const EXPENSE_CORRECTION_REGISTRY_KEY = "expenses.correctionRegistry.v1";

function stripCorrectionTag(description: string): string {
    return description.replace(CORRECTION_TAG_RE, "").replace(SUBSTITUTED_TAG_RE, "").trim();
}

function getCorrectionTargetId(description: string): string | null {
    const match = description.match(CORRECTION_TAG_RE);
    return match?.[1] ?? null;
}

function getSubstitutedById(description: string): string | null {
    const match = description.match(SUBSTITUTED_TAG_RE);
    return match?.[1] ?? null;
}

function readCorrectionRegistry(): Record<string, string> {
    try {
        const raw = localStorage.getItem(EXPENSE_CORRECTION_REGISTRY_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, string>;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function writeCorrectionRegistry(registry: Record<string, string>): void {
    localStorage.setItem(EXPENSE_CORRECTION_REGISTRY_KEY, JSON.stringify(registry));
}

function toDateOnly(value: string): string {
    if (!value) return "";
    return value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
}

function buildExpenseFingerprint(exp: ApiActiveExpense): string {
    const description = stripCorrectionTag(exp.description ?? "").trim().toLowerCase();
    const dateOnly = toDateOnly(exp.dueDate);
    const amount = String(exp.amount ?? 0);
    const unitId = exp.residentUnitId ?? "";
    // Identidade econômica do lançamento (sem tipo/conta):
    // ao corrigir classificação contábil, queremos manter só o registro mais novo.
    return `${description}|${dateOnly}|${amount}|${unitId}`;
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
    const [isImportStatementOpen, setIsImportStatementOpen] = useState(false);
    const [startModalAsRecurring] = useState(false);
    const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
    const [expenseToCorrect, setExpenseToCorrect] = useState<Expense | null>(null);
    const [correctionTypeId, setCorrectionTypeId] = useState("");
    const [correctionAccountId, setCorrectionAccountId] = useState("");
    const [correctionDescription, setCorrectionDescription] = useState("");
    const [correctionDueDate, setCorrectionDueDate] = useState("");
    const [correctionAmountInput, setCorrectionAmountInput] = useState("");
    const [correctingExpenseId, setCorrectingExpenseId] = useState<string | null>(null);

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
            const registry = readCorrectionRegistry();
            const correctedOriginalIds = new Set<string>(Object.keys(registry));
            const substitutedExpenseIds = new Set<string>();
            for (const exp of activeData) {
                const targetId = getCorrectionTargetId(exp.description ?? "");
                if (targetId) {
                    correctedOriginalIds.add(targetId);
                    registry[targetId] = exp.id;
                }
                const substitutedById = getSubstitutedById(exp.description ?? "");
                if (substitutedById) substitutedExpenseIds.add(exp.id);
            }
            writeCorrectionRegistry(registry);
            const dedupeLatestByFingerprint = new Map<string, ApiActiveExpense>();
            for (const exp of activeData) {
                if (correctedOriginalIds.has(exp.id) || substitutedExpenseIds.has(exp.id)) continue;
                const fp = buildExpenseFingerprint(exp);
                const prev = dedupeLatestByFingerprint.get(fp);
                if (!prev) {
                    dedupeLatestByFingerprint.set(fp, exp);
                    continue;
                }
                const prevTs = new Date(prev.createdAt).getTime();
                const curTs = new Date(exp.createdAt).getTime();
                if (Number.isFinite(curTs) && (!Number.isFinite(prevTs) || curTs >= prevTs)) {
                    dedupeLatestByFingerprint.set(fp, exp);
                }
            }

            const formattedActive: Expense[] = Array.from(dedupeLatestByFingerprint.values()).map(exp => ({
                id: exp.id,
                description: stripCorrectionTag(exp.description ?? ""),
                amount: exp.amount,
                dueDate: exp.dueDate, 
                paidAt: exp.paidAt, 
                createdAt: exp.createdAt, 
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

    const openCorrectionModal = (expense: Expense) => {
        setExpenseToCorrect(expense);
        setCorrectionTypeId(expense.expenseType?.id ?? "");
        setCorrectionAccountId(expense.accountId ?? "");
        setCorrectionDescription(expense.description ?? "");
        setCorrectionDueDate(expense.dueDate.slice(0, 10));
        setCorrectionAmountInput(
            (expense.amount / 100).toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }),
        );
        setExpensesError(null);
        setIsCorrectionModalOpen(true);
    };

    const closeCorrectionModal = () => {
        setIsCorrectionModalOpen(false);
        setExpenseToCorrect(null);
        setCorrectionTypeId("");
        setCorrectionAccountId("");
        setCorrectionDescription("");
        setCorrectionDueDate("");
        setCorrectionAmountInput("");
        setCorrectingExpenseId(null);
    };

    const handleConfirmCorrection = async () => {
        if (!expenseToCorrect) return;
        const token = localStorage.getItem("token");
        if (!token) {
            setExpensesError("Token não encontrado.");
            return;
        }
        if (!correctionTypeId || !correctionAccountId || !correctionDescription.trim() || !correctionDueDate) {
            setExpensesError("Preencha tipo, conta, descrição e data para corrigir.");
            return;
        }
        const cents = Math.round(
            parseFloat(correctionAmountInput.replace(/\./g, "").replace(",", ".")) * 100,
        );
        if (!Number.isFinite(cents) || cents <= 0) {
            setExpensesError("O valor corrigido deve ser maior que zero.");
            return;
        }

        setCorrectingExpenseId(expenseToCorrect.id);
        setExpensesError(null);
        try {
            const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
            const compensateRes = await fetch(`/api/v1/expenses/compensate/${expenseToCorrect.id}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({ amount: expenseToCorrect.amount }),
            });
            if (!compensateRes.ok) {
                const errData = await compensateRes.json().catch(() => ({}));
                throw new Error(errData.message || "Falha ao compensar o gasto original.");
            }

            const newExpenseId = uuidv4();
            const createRes = await fetch("/api/v1/expenses/enter", {
                method: "PUT",
                headers,
                body: JSON.stringify({
                    id: newExpenseId,
                    description: `${correctionDescription.trim()} [CORRIGE:${expenseToCorrect.id}]`,
                    amount: cents,
                    type: correctionTypeId,
                    accountId: correctionAccountId,
                    dueDate: correctionDueDate,
                    isActive: true,
                    residentUnitId: expenseToCorrect.residentUnitId,
                }),
            });
            if (!createRes.ok) {
                const errData = await createRes.json().catch(() => ({}));
                throw new Error(errData.message || "Gasto compensado, mas falhou ao recriar o lançamento corrigido.");
            }

            const oldCleanDescription = stripCorrectionTag(expenseToCorrect.description ?? "");
            await fetch(`/api/v1/expenses/update/${expenseToCorrect.id}`, {
                method: "PATCH",
                headers,
                body: JSON.stringify({
                    description: `${oldCleanDescription} [SUBSTITUIDO:${newExpenseId}]`,
                }),
            }).catch(() => undefined);

            const registry = readCorrectionRegistry();
            registry[expenseToCorrect.id] = newExpenseId;
            writeCorrectionRegistry(registry);

            closeCorrectionModal();
            if (targetMonth) {
                fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Falha ao corrigir gasto.";
            setExpensesError(message);
        } finally {
            setCorrectingExpenseId(null);
        }
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
                return (
                    <span className="text-gray-500 text-theme-sm dark:text-gray-400">
                        {formatDateDMY(expense.dueDate, "Formato de Fecha Inválido")}
                    </span>
                );
            },
        },
        {
            key: 'accountId',
            header: 'Conta',
            className: 'w-1/5',
            cell: (expense) => {
                if (expense.hasPredefinedAmount) {
                    
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
            className: 'w-1/5 text-right',
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
        {
            key: 'actions',
            header: 'Ações',
            className: 'w-1/5 text-right',
            cell: (expense) => {
                if (!expense.hasPredefinedAmount) return <span className="text-gray-400">-</span>;
                return (
                    <button
                        type="button"
                        onClick={() => openCorrectionModal(expense)}
                        className="inline-flex items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/40"
                    >
                        Corrigir
                    </button>
                );
            },
        },
    ];

    return (
        <>
            <ExpensesCard
                title="Despesas do Mês"
                expenses={allExpenses}
                columns={expenseColumns}
                loading={loadingExpenses}
                error={expensesError}
                onAddExpense={openAddExpenseModal}
                onImportBankStatement={() => setIsImportStatementOpen(true)}
            />

            <BankStatementImportModal
                isOpen={isImportStatementOpen}
                onClose={() => setIsImportStatementOpen(false)}
                onSuccess={() => {
                    if (targetMonth) {
                        fetchExpensesForMonth(targetMonth.getFullYear(), targetMonth.getMonth() + 1);
                    }
                }}
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

            <Modal
                isOpen={isCorrectionModalOpen}
                onClose={closeCorrectionModal}
                title="Corrigir gasto (com compensação)"
                widthClass="max-w-2xl"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        A correção contábil mantém rastreabilidade: primeiro compensa o lançamento original, depois cria
                        um novo com os dados corretos.
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Tipo de despesa
                            </label>
                            <select
                                value={correctionTypeId}
                                onChange={(e) => setCorrectionTypeId(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                                <option value="">Selecione...</option>
                                {expenseTypes.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Conta
                            </label>
                            <select
                                value={correctionAccountId}
                                onChange={(e) => setCorrectionAccountId(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                                <option value="">Selecione...</option>
                                {accounts.map((acc) => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Data
                            </label>
                            <input
                                type="date"
                                value={correctionDueDate}
                                onChange={(e) => setCorrectionDueDate(e.target.value)}
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Valor (R$)
                            </label>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={correctionAmountInput}
                                onChange={(e) => setCorrectionAmountInput(e.target.value)}
                                placeholder="0,00"
                                className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Descrição
                        </label>
                        <input
                            type="text"
                            value={correctionDescription}
                            onChange={(e) => setCorrectionDescription(e.target.value)}
                            className="h-10 w-full rounded-lg border border-gray-300 px-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                        />
                    </div>
                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={closeCorrectionModal}
                            disabled={correctingExpenseId !== null}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirmCorrection()}
                            disabled={correctingExpenseId !== null}
                            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                        >
                            {correctingExpenseId ? "Corrigindo..." : "Compensar e recriar"}
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default MonthlyExpensesTable;