import { useEffect, useState } from "react";
import ComponentCard from "../components/common/ComponentCard";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import DataTable, { ColumnDef } from "../components/tables/DataTable";
import { User } from "../types/userApi";
import Badge from "../components/ui/badge/Badge";

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          throw new Error("Authentication token not found.");
        }

        const response = await fetch("http://localhost:1000/api/v1/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setUsers(data);
      } catch (error: any) {
        setError(error.message);
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const columns: ColumnDef<User>[] = [
    {
      key: "user",
      header: "User",
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
      key: "unit",
      header: "Unit",
      cell: (user) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {user.residentUnit?.unit}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (user) => (
        <Badge size="sm" color={user.isActive ? "success" : "error"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
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
