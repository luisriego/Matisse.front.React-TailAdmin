import { Fragment, useEffect, useMemo, useState } from "react";
import ComponentCard from "../components/common/ComponentCard";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import AccountLedgerPanel from "../components/accounts/AccountLedgerPanel";
import { Account } from "../types/accountApi";
import Switch from "../components/ui/Switch";
import EditAccountModal from "../components/modal/EditAccountModal";
import SetInitialBalanceModal from "../components/modal/SetInitialBalanceModal";
import AddAccountModal from "../components/modal/AddAccountModal";
import BankStatementImportModal from "../components/modal/BankStatementImportModal";
import { ChevronDownIcon, PencilIcon, TrashBinIcon, DollarLineIcon } from "../icons";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../components/ui/table";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingBalances, setLoadingBalances] = useState<boolean>(false);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isSetInitialBalanceModalOpen, setIsSetInitialBalanceModalOpen] = useState(false);
  const [accountToSetInitialBalance, setAccountToSetInitialBalance] = useState<Account | null>(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [isImportStatementOpen, setIsImportStatementOpen] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(`/api/v1/accounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const initialAccounts: Account[] = data.accounts;
      setAccounts(initialAccounts);

      setLoadingBalances(true);
      const balancePromises = initialAccounts.map((account) =>
        fetch(`/api/v1/accounts/${account.id}/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => (res.ok ? res.json() : null))
      );

      const balanceResults = await Promise.all(balancePromises);

      const updatedAccounts = initialAccounts.map((account) => {
        const balanceData = balanceResults.find((b) => b && b.account_id === account.id);
        return balanceData ? { ...account, balance: balanceData.balance } : account;
      });
      setAccounts(updatedAccounts);

      setLoadingBalances(false);
    } catch (error: any) {
      setError(error.message);
      console.error("Failed to fetch accounts:", error);
      setLoadingBalances(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleToggleAccount = async (accountId: string, isActive: boolean) => {
    setUpdatingAccountId(accountId);
    const endpoint = isActive
      ? `/api/v1/accounts/enable/${accountId}`
      : `/api/v1/accounts/disable/${accountId}`;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to update account status. Status: ${response.status}`);
      }

      setAccounts((currentAccounts) =>
        currentAccounts.map((acc) => (acc.id === accountId ? { ...acc, isActive } : acc))
      );
    } catch (error: any) {
      setError("Failed to update account status. Please try again.");
      console.error("Failed to toggle account:", error);
      fetchAccounts();
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleOpenEditModal = (account: Account) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  const handleOpenSetInitialBalanceModal = (account: Account) => {
    setAccountToSetInitialBalance(account);
    setIsSetInitialBalanceModalOpen(true);
  };

  const handleOpenAddAccountModal = () => {
    setIsAddAccountModalOpen(true);
  };

  const toggleLedger = (accountId: string) => {
    setExpandedAccountId((prev) => (prev === accountId ? null : accountId));
  };

  const { totalBalanceCents, activeAccountsCount } = useMemo(() => {
    let total = 0;
    let active = 0;
    for (const account of accounts) {
      if (typeof account.balance === "number" && Number.isFinite(account.balance)) {
        total += account.balance;
      }
      if (account.isActive) active += 1;
    }
    return { totalBalanceCents: total, activeAccountsCount: active };
  }, [accounts]);

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const renderContent = () => {
    if (loading || loadingBalances) {
      return <p>Carregando...</p>;
    }

    if (error) {
      return <p>Erro ao carregar dados: {error}</p>;
    }

    return (
      <div className="space-y-4">
        {accounts.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800/60 dark:bg-brand-900/20">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
                Total das contas
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Soma de {accounts.length} conta(s) contabilística(s) — deve coincidir com o
                saldo do extrato da conta bancária única do condomínio.
              </p>
            </div>
            <p
              className={`text-2xl font-bold tabular-nums sm:text-right ${
                totalBalanceCents < 0
                  ? "text-error-500"
                  : "text-brand-700 dark:text-brand-300"
              }`}
            >
              {formatBrl(totalBalanceCents)}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          {/* table-auto evita colspan + painel interior colapsarem a zero com table-fixed */}
          <Table className="w-full table-auto border-collapse">
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="w-12 px-3 py-3 sm:px-4">
                  <span className="sr-only">Expandir movimentos</span>
                </TableCell>
                <TableCell
                  isHeader
                  className="min-w-0 px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  style={{ width: "22%" }}
                >
                  Nome
                </TableCell>
                <TableCell
                  isHeader
                  className="min-w-0 px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  style={{ width: "34%" }}
                >
                  Descrição
                </TableCell>
                <TableCell
                  isHeader
                  className="min-w-0 px-5 py-3 text-right font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  style={{ width: "16%" }}
                >
                  Saldo
                </TableCell>
                <TableCell
                  isHeader
                  className="min-w-0 px-5 py-3 font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  style={{ width: "14%" }}
                >
                  Estado
                </TableCell>
                <TableCell
                  isHeader
                  className="min-w-0 px-5 py-3 text-center font-medium text-gray-500 text-theme-xs dark:text-gray-400"
                  style={{ width: "14%" }}
                >
                  Ações
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {accounts.map((account) => {
                const isOpen = expandedAccountId === account.id;
                return (
                  <Fragment key={account.id}>
                    <TableRow>
                      <TableCell className="px-3 py-3 sm:px-4">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-controls={`ledger-panel-${account.id}`}
                          aria-label={isOpen ? "Fechar movimentos da conta" : "Ver movimentos da conta"}
                          onClick={() => toggleLedger(account.id)}
                          className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.06]"
                        >
                          <ChevronDownIcon
                            className={`size-5 shrink-0 transition-transform duration-200 ${
                              isOpen ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="min-w-0 px-5 py-4 sm:px-6">
                        <span className="block truncate font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {account.name}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 px-5 py-4 sm:px-6">
                        <p
                          className="truncate text-gray-500 text-theme-sm dark:text-gray-400"
                          title={account.description || ""}
                        >
                          {account.description}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-0 px-5 py-4 text-right sm:px-6">
                        <span
                          className={`font-medium text-theme-sm ${
                            account.balance < 0
                              ? "text-error-500"
                              : "text-gray-800 dark:text-white/90"
                          }`}
                        >
                          {(account.balance / 100).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-0 px-5 py-4 sm:px-6">
                        <Switch
                          checked={account.isActive}
                          onChange={(newIsActive) => handleToggleAccount(account.id, newIsActive)}
                          disabled={updatingAccountId === account.id}
                          label={account.isActive ? "Ativa" : "Inativa"}
                        />
                      </TableCell>
                      <TableCell className="min-w-0 px-5 py-4 sm:px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-500"
                          >
                            <TrashBinIcon className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(account)}
                            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90"
                          >
                            <PencilIcon className="size-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenSetInitialBalanceModal(account)}
                            className="text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                            title="Definir ou corrigir saldo inicial"
                          >
                            <DollarLineIcon className="size-5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-gray-50/40 dark:bg-white/[0.02]">
                        <TableCell
                          colSpan={6}
                          className="box-border w-full max-w-none min-w-[100%] overflow-visible p-0 align-top"
                          id={`ledger-panel-${account.id}`}
                        >
                          <div className="block box-border w-full min-w-full overflow-x-auto">
                            <AccountLedgerPanel
                              accountId={account.id}
                              accountName={account.name}
                              balanceHintCents={account.balance}
                              onClose={() => setExpandedAccountId(null)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
              {accounts.length > 0 && (
                <TableRow className="border-t-2 border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-white/[0.04]">
                  <TableCell className="px-3 py-3 sm:px-4" />
                  <TableCell
                    colSpan={2}
                    className="px-5 py-4 font-semibold text-gray-800 text-theme-sm dark:text-white/90 sm:px-6"
                  >
                    Total ({accounts.length} contas
                    {activeAccountsCount < accounts.length
                      ? `, ${activeAccountsCount} ativas`
                      : ""}
                    )
                  </TableCell>
                  <TableCell className="px-5 py-4 text-right font-bold sm:px-6">
                    <span
                      className={`tabular-nums text-theme-sm ${
                        totalBalanceCents < 0
                          ? "text-error-500"
                          : "text-brand-700 dark:text-brand-300"
                      }`}
                    >
                      {formatBrl(totalBalanceCents)}
                    </span>
                  </TableCell>
                  <TableCell colSpan={2} className="px-5 py-4 sm:px-6" />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageMeta
        title="Contas | Matisse"
        description="Página de listagem de contas"
      />
      <PageBreadcrumb pageTitle="Contas" />
      <div className="space-y-6">
        <ComponentCard
          title="Todas as Contas"
          headerContent={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportStatementOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 shadow-theme-xs transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Importar extrato
              </button>
              <button
                type="button"
                onClick={handleOpenAddAccountModal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm text-white shadow-theme-xs transition hover:bg-brand-600 disabled:bg-brand-300"
              >
                Nova Conta
                <span className="flex items-center">+</span>
              </button>
            </div>
          }
        >
          {renderContent()}
        </ComponentCard>
        <EditAccountModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          account={selectedAccount}
          onAccountUpdate={fetchAccounts}
        />
        <SetInitialBalanceModal
          isOpen={isSetInitialBalanceModalOpen}
          onClose={() => setIsSetInitialBalanceModalOpen(false)}
          account={accountToSetInitialBalance}
          onInitialBalanceSet={() => {
            fetchAccounts();
            setIsSetInitialBalanceModalOpen(false);
          }}
        />
        <AddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onAccountAdded={() => {
            fetchAccounts();
            setIsAddAccountModalOpen(false);
          }}
        />
        <BankStatementImportModal
          isOpen={isImportStatementOpen}
          onClose={() => setIsImportStatementOpen(false)}
          onSuccess={fetchAccounts}
        />
      </div>
    </>
  );
}
