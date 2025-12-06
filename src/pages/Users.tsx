import { useQuery } from "@tanstack/react-query";
import ComponentCard from "../components/common/ComponentCard";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataTable, { ColumnDef } from "../components/tables/DataTable";
import { User } from "../types/userApi";
import Badge from "../components/ui/badge/Badge";

// --- Función de Fetching ---
const fetchUsers = async (): Promise<User[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Authentication token not found.");
  
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch("/api/v1/users", { headers });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

// --- Componente ---
export default function Users() {
  // --- Query ---
  const { data: users = [], isLoading, isError, error } = useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const columns: ColumnDef<User>[] = [
    {
      key: "user",
      header: "User",
      className: "text-left",
      cell: (user) => (
        <div>
          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {user.name} {user.lastName}
          </span>
          <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
            {user.email}
          </span>
        </div>
      ),
    },
    {
      key: "phoneNumber",
      header: "Phone",
      className: "text-left",
      cell: (user) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {user.phoneNumber || "N/A"}
        </span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      className: "text-left",
      cell: (user) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {user.residentUnit?.unit || "N/A"}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      className: "text-left",
      cell: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role) => (
            <Badge key={role} size="sm" color="primary">
              {role.replace('ROLE_', '')}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "text-left",
      cell: (user) => (
        <Badge size="sm" color={user.isActive ? "success" : "error"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const renderContent = () => {
    if (isLoading) {
      return <p>Carregando...</p>;
    }

    if (isError) {
      return <p className="text-red-500">{(error as Error).message}</p>;
    }

    return <DataTable columns={columns} data={users} />;
  };

  return (
    <>
      <PageMeta
        title="Usuários | TailAdmin - React.js Admin Dashboard Template"
        description="Página de listagem de usuários"
      />
      <PageBreadcrumb pageTitle="Usuários" />
      <div className="space-y-6">
        <ComponentCard title="Todos os Usuários">
          {renderContent()}
        </ComponentCard>
      </div>
    </>
  );
}
