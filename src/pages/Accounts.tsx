import { useEffect, useState } from "react";
import ComponentCard from "../components/common/ComponentCard";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataTable, { ColumnDef } from "../components/tables/DataTable";
import { Account } from "../types/accountApi";
import Switch from "../components/ui/Switch";
import EditAccountModal from "../components/modal/EditAccountModal";
import { PencilIcon, TrashBinIcon } from "../icons";

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

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
      setAccounts(data.accounts);
    } catch (error: any) {
      setError(error.message);
      console.error("Failed to fetch accounts:", error);
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
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to update account status. Status: ${response.status}`);
      }

      setAccounts(currentAccounts =>
        currentAccounts.map(acc =>
          acc.id === accountId ? { ...acc, isActive } : acc
        )
      );

    } catch (error: any) {
      // Revert the optimistic update on failure and notify the user
      setError("Failed to update account status. Please try again.");
      console.error("Failed to toggle account:", error);
      // Optional: Add a user-facing error notification (e.g., a toast message)
      // Re-fetch accounts to ensure UI consistency with the server state
      fetchAccounts();
    } finally {
      setUpdatingAccountId(null);
    }
  };

  const handleOpenEditModal = (account: Account) => {
    setSelectedAccount(account);
    setIsEditModalOpen(true);
  };

  const columns: ColumnDef<Account>[] = [
    {
      key: "name",
      header: "Nome",
      className: "w-64",
      cell: (account) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
          {account.name}
        </span>
      ),
    },
    {
      key: "code",
      header: "Código",
      className: "w-24",
      cell: (account) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {account.code}
        </span>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      cell: (account) => (
        <p
        className="truncate max-w-lg text-gray-500 text-theme-sm dark:text-gray-400"
        title={account.description || ''}
        >
          {account.description}
        </p>
      ),
    },
    {
      key: "total",
      header: "Saldo",
      className: "w-48",
      cell: (account) => (
        <span
          className={`font-medium text-theme-sm ${
            account.balance < 0
              ? "text-error-500"
              : "text-gray-800 dark:text-white/90"
          }`}
        >
          {(account.balance / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: "action",
      header: "Estado",
      className: "w-24",
      cell: (account) => (
        <Switch
          checked={account.isActive}
          onChange={(newIsActive) => handleToggleAccount(account.id, newIsActive)}
          disabled={updatingAccountId === account.id}
          label={account.isActive ? 'Ativa' : 'Inativa'}
        />
      ),
    },
    {
      key: "actions",
      header: "Ações",
      className: "w-28",
      cell: (account) => (
        <div className="flex items-center justify-center gap-2">
          <button className="text-gray-500 hover:text-error-500 dark:text-gray-400 dark:hover:text-error-500">
            <TrashBinIcon className="size-5" />
          </button>
          <button onClick={() => handleOpenEditModal(account)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90">
            <PencilIcon className="size-5" />
          </button>
        </div>
      ),
    },
  ];

  const renderContent = () => {
    if (loading) {
      return <p>Carregando...</p>;
    }

    if (error) {
      return <p>Erro ao carregar dados: {error}</p>;
    }

    return <DataTable columns={columns} data={accounts} />;
  };

  return (
    <>
      <PageMeta
        title="Contas | TailAdmin - React.js Admin Dashboard Template"
        description="Página de listagem de contas"
      />
      <PageBreadcrumb pageTitle="Contas" />
      <div className="space-y-6">
        <ComponentCard title="Todas as Contas">
          {renderContent()}
        </ComponentCard>
        <EditAccountModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          account={selectedAccount}
          onAccountUpdate={fetchAccounts}
        />
      </div>
    </>
  );
}