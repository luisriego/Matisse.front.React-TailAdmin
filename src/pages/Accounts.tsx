import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ComponentCard from "../components/common/ComponentCard";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataTable, { ColumnDef } from "../components/tables/DataTable";
import { Account } from "../types/accountApi";
import Switch from "../components/ui/Switch";
import EditAccountModal from "../components/modal/EditAccountModal";
import SetInitialBalanceModal from "../components/modal/SetInitialBalanceModal";
import AddAccountModal from "../components/modal/AddAccountModal";
import { PencilIcon, TrashBinIcon, DollarLineIcon } from "../icons";

// 1. La lógica de obtención de datos se mueve fuera del componente para mayor claridad.
const fetchAccountsWithBalances = async (): Promise<Account[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Authentication token not found.");
  const headers = { Authorization: `Bearer ${token}` };

  const response = await fetch(`/api/v1/accounts`, { headers });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  
  const data = await response.json();
  const initialAccounts: Account[] = data.accounts;

  const balancePromises = initialAccounts.map(account =>
    fetch(`/api/v1/accounts/${account.id}/balance`, { headers })
      .then(res => res.ok ? res.json() : null)
  );

  const balanceResults = await Promise.all(balancePromises);

  return initialAccounts.map(account => {
    const balanceData = balanceResults.find(b => b && b.account_id === account.id);
    return balanceData ? { ...account, balance: balanceData.balance } : account;
  });
};

// La lógica de la mutación también se extrae.
const toggleAccountStatus = async ({ accountId, isActive }: { accountId: string, isActive: boolean }) => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Authentication token not found.");
  
  const endpoint = isActive
    ? `/api/v1/accounts/enable/${accountId}`
    : `/api/v1/accounts/disable/${accountId}`;

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to update account status. Status: ${response.status}`);
  }
};

export default function Accounts() {
  const queryClient = useQueryClient();

  // 2. Se reemplaza useEffect y múltiples useState por un único useQuery.
  const { data: accounts = [], isLoading, isError, error } = useQuery<Account[], Error>({
    queryKey: ['accountsWithBalances'], // Clave compartida con el Dashboard para cacheo.
    queryFn: fetchAccountsWithBalances,
  });

  // 3. Se reemplaza la lógica manual de fetch y actualización de estado por useMutation.
  const { mutate: toggleAccount, isPending: isUpdatingAccount } = useMutation({
    mutationFn: toggleAccountStatus,
    onSuccess: () => {
      // 4. Se invalida la query para que TanStack Query refresque los datos automáticamente.
      queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
    },
    // Opcional: se puede añadir onError para un manejo de errores más específico.
  });

  // Los estados para los modales se mantienen igual.
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isSetInitialBalanceModalOpen, setIsSetInitialBalanceModalOpen] = useState(false);
  const [accountToSetInitialBalance, setAccountToSetInitialBalance] = useState<Account | null>(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  const handleToggleAccount = (accountId: string, isActive: boolean) => {
    toggleAccount({ accountId, isActive });
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
  
  // 5. Función centralizada para que los modales notifiquen que una mutación tuvo éxito.
  const handleMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['accountsWithBalances'] });
    setIsEditModalOpen(false);
    setIsAddAccountModalOpen(false);
    setIsSetInitialBalanceModalOpen(false);
  }

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
      className: "w-48 text-right",
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
          disabled={isUpdatingAccount} // Se usa el estado de la mutación.
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
          {(account.balance === undefined || account.balance === null || account.balance === 0) && (
            <button
              onClick={() => handleOpenSetInitialBalanceModal(account)}
              className="text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
              title="Definir Saldo Inicial"
            >
              <DollarLineIcon className="size-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const renderContent = () => {
    if (isLoading) { // Se usa el estado de useQuery.
      return <p>Carregando...</p>;
    }

    if (isError) { // Se usa el estado de useQuery.
      return <p>Erro ao carregar dados: {error.message}</p>;
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
        <ComponentCard 
          title="Todas as Contas"
          headerContent={
            <button
              onClick={handleOpenAddAccountModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300"
            >
              Nova Conta
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {renderContent()}
        </ComponentCard>
        <EditAccountModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          account={selectedAccount}
          onAccountUpdate={handleMutationSuccess} // Se usa la nueva función.
        />
        <SetInitialBalanceModal
          isOpen={isSetInitialBalanceModalOpen}
          onClose={() => setIsSetInitialBalanceModalOpen(false)}
          account={accountToSetInitialBalance}
          onInitialBalanceSet={handleMutationSuccess} // Se usa la nueva función.
        />
        <AddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onAccountAdded={handleMutationSuccess} // Se usa la nueva función.
        />
      </div>
    </>
  );
}
