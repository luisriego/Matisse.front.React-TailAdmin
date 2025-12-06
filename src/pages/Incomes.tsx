import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import AddIncomeModal from '../components/modal/AddIncomeModal';
import { Income, IncomeType, ResidentUnit, ApiIncome } from '../types';

// --- Funciones de Fetching (fuera del componente) ---

const fetchResidentUnits = async (): Promise<ResidentUnit[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch('/api/v1/resident-unit/actives', { headers });
  if (!response.ok) throw new Error('Falha ao carregar unidades residenciais.');
  return response.json();
};

const fetchIncomeTypes = async (): Promise<IncomeType[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch('/api/v1/income-types', { headers });
  if (!response.ok) throw new Error('Falha ao carregar tipos de ingresso.');
  return response.json();
};

const fetchIncomes = async (): Promise<Income[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`/api/v1/incomes`, { headers });
  if (!response.ok) {
    if (response.status === 404) return []; // Devuelve un array vacío si no se encuentra
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data: ApiIncome[] = await response.json();
  return data.map(inc => ({ ...inc }));
};

// --- Componente ---

const Incomes: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // --- Queries ---
  const { data: residentUnits = [] } = useQuery<ResidentUnit[], Error>({
    queryKey: ['residentUnits'],
    queryFn: fetchResidentUnits,
  });

  const { data: incomeTypes = [] } = useQuery<IncomeType[], Error>({
    queryKey: ['incomeTypes'],
    queryFn: fetchIncomeTypes,
  });

  const { data: incomes = [], isLoading: loadingIncomes, isError: isErrorIncomes, error: incomesError } = useQuery<Income[], Error>({
    queryKey: ['incomes'],
    queryFn: fetchIncomes,
  });

  const handleMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['incomes'] });
    setIsAddModalOpen(false);
  }

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
          ) : isErrorIncomes ? (
            <p className="text-center text-error-500">{(incomesError as Error).message}</p>
          ) : incomes.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum ingresso registrado ainda.</p>
          ) : (
            <DataTable columns={columns} data={incomes} />
          )}
        </ComponentCard>

        <AddIncomeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onIncomeAdded={handleMutationSuccess}
          residentUnits={residentUnits}
          incomeTypes={incomeTypes}
        />
      </div>
    </>
  );
};

export default Incomes;
