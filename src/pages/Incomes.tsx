import React, { useState, useEffect, useCallback } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import AddIncomeModal from '../components/modal/AddIncomeModal';

interface ResidentUnit {
  id: string;
  unit: string;
}

// Define a new interface for the IncomeType object
interface IncomeType {
  id: string;
  name: string;
  code: string;
  description: string;
}

// Interface for Income, adapted from Expense and API doc
interface Income {
  id: string;
  description: string;
  amount: number; // in cents
  dueDate: string;
  paidAt?: string | null;
  createdAt?: string;
  residentUnitId: string;
  type: IncomeType; // Change type from string to IncomeType
}

// Interface for the API response for a single income, based on GET /api/v1/incomes
interface ApiIncome {
  id:string; // Assuming ID is always present, even if not in example
  residentUnitId: string;
  amount: number;
  type: IncomeType; // Change type from string to IncomeType
  dueDate: string; // Directly a string
  description: string;
  // paidAt and createdAt are not in the example for GET /api/v1/incomes
}

// Interface for the API response of resident units
interface ApiResidentUnit {
  id: string;
  unit: string;
}

const Incomes: React.FC = () => {
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);

  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [incomesError, setIncomesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load data for selectors (Resident Units)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        // Load Resident Units from API
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsData: ApiResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);

      } catch (err) {
        console.error("Erro ao carregar dados iniciais:", err);
      }
    };
    fetchInitialData();
  }, []);

  const fetchIncomes = useCallback(async () => {
    setLoadingIncomes(true);
    setIncomesError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      // Use the /api/v1/incomes endpoint to get all incomes
      const response = await fetch(`/api/v1/incomes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
             setIncomes([]);
             console.warn("Endpoint para buscar ingressos no encontrado (404). Mostrando lista vacía.");
             return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiIncome[] = await response.json();

      // Map API response to frontend structure
      const formattedIncomes: Income[] = data.map(inc => ({
        ...inc,
        // dueDate is already a string, no need for .date
        // paidAt and createdAt are not provided by this endpoint, so they will be undefined/null
      }));

      setIncomes(formattedIncomes);
    } catch (err: any) {
      setIncomesError('Falha ao carregar os ingressos.');
      console.error("Failed to fetch incomes:", err);
    } finally {
      setLoadingIncomes(false);
    }
  }, []);

  // Initial load of incomes
  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const columns: ColumnDef<Income>[] = [
    {
      key: 'type',
      header: 'Tipo',
      className: 'w-1/4',
      cell: (income) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{income.type?.name || 'Não especificado'}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Monto',
      className: 'w-40 text-right',
      cell: (income) => (
        <span className="text-gray-800 text-theme-sm dark:text-white/90">
          {(income.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Vencimento',
      className: 'w-32',
      cell: (income) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {new Date(income.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
        </span>
      ),
    },
    {
      key: 'residentUnit',
      header: 'Unidade',
      className: 'w-40',
      cell: (income) => {
        const unit = residentUnits.find(u => u.id === income.residentUnitId);
        return (
          <span className="text-gray-500 text-theme-sm dark:text-gray-400">
            {unit ? unit.unit : 'Geral'}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Descrição',
      className: 'w-1/3',
      cell: (income) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {income.description}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageMeta
        title="Ingressos | Matisse"
        description="Página para registro de novos ingressos"
      />
      <PageBreadcrumb pageTitle="Ingressos" />

      <div className="space-y-6">
        <ComponentCard
          title="Todos os ingressos"
          headerContent={
            <button onClick={() => setIsAddModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300">
              Novo Ingresso
              <span className="flex items-center">+</span>
            </button>
          }
        >
          {loadingIncomes ? (
            <p className="text-center">Carregando ingressos...</p>
          ) : incomesError ? (
            <p className="text-center text-error-500">{incomesError}</p>
          ) : incomes.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum ingresso registrado ainda.</p>
          ) : (
            <DataTable columns={columns} data={incomes} />
          )}
        </ComponentCard>

        <AddIncomeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onIncomeAdded={fetchIncomes}
          residentUnits={residentUnits}
        />
      </div>
    </>
  );
};

export default Incomes;