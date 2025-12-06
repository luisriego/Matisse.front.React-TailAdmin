import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import { PencilIcon } from "../icons";
import EditResidentUnitModal from "../components/modal/EditResidentUnitModal";
import CreateResidentUnitModal from "../components/modal/CreateResidentUnitModal";
import { ResidentUnit } from "../types/residentUnit";

// --- Función de Fetching ---
const fetchResidentUnits = async (): Promise<ResidentUnit[]> => {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Token de autenticação não encontrado.");
  const headers = { Authorization: `Bearer ${token}` };
  const response = await fetch(`/api/v1/resident-unit/actives`, { headers });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
};

// --- Componente ---
const ResidentUnits: React.FC = () => {
  const queryClient = useQueryClient();

  // --- Query ---
  const { data: residentUnits = [], isLoading: loadingResidentUnits, isError, error: residentUnitsError } = useQuery<ResidentUnit[], Error>({
    queryKey: ['residentUnits'],
    queryFn: fetchResidentUnits,
  });

  // --- Estados para los modales ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<ResidentUnit | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleOpenEditModal = (unit: ResidentUnit) => {
    setSelectedUnit(unit);
    setIsEditModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleMutationSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['residentUnits'] });
    setIsEditModalOpen(false);
    setIsCreateModalOpen(false);
  };

  const columns: ColumnDef<ResidentUnit>[] = [
    {
      key: 'unit',
      header: 'Unidade',
      className: 'w-48',
      cell: (unit) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{`Apto. ${unit.unit}`}</span>,
    },
    {
      key: 'idealFraction',
      header: 'Fração Ideal',
      className: 'w-32',
      cell: (unit) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{unit.idealFraction}</span>,
    },
    {
      key: 'isActive',
      header: 'Ativo',
      className: 'w-24 text-center',
      cell: (unit) => (
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${unit.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {unit.isActive ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'notificationRecipients',
      header: 'Destinatários',
      className: 'w-auto',
      cell: (unit) => (
        <div className="flex flex-wrap gap-2">
          {unit.notificationRecipients.map((recipient, index) => (
            <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-full px-3 py-1 text-xs font-medium text-gray-800 dark:text-gray-200">
              <span className="font-semibold">{recipient.name}</span> ({recipient.email})
            </div>
          ))}
        </div>
      ),
    },
    {
        key: 'actions',
        header: 'Ações',
        className: 'w-28',
        cell: (unit) => (
            <div className="flex items-center justify-center gap-2">
                <button onClick={() => handleOpenEditModal(unit)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90">
                    <PencilIcon className="size-5" />
                </button>
            </div>
        )
    }
  ];

  return (
    <>
      <PageMeta
        title="Unidades Residenciais | Matisse"
        description="Página para visualização e gerenciamento de unidades residenciais"
      />
      <PageBreadcrumb pageTitle="Unidades Residenciais" />

      <div className="space-y-6">
        <ComponentCard title="Todas as Unidades Residenciais">
          <div className="flex justify-end mb-4">
            <button onClick={handleOpenCreateModal} className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600">
              Nova Unidade
            </button>
          </div>
          {loadingResidentUnits ? (
            <p className="text-center">Carregando unidades residenciais...</p>
          ) : isError ? (
            <p className="text-center text-error-500">{(residentUnitsError as Error).message}</p>
          ) : residentUnits.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhuma unidade residencial registrada ainda.</p>
          ) : (
            <DataTable columns={columns} data={residentUnits} />
          )}
        </ComponentCard>
        
        <EditResidentUnitModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          unit={selectedUnit}
          onUnitUpdate={handleMutationSuccess}
        />

        <CreateResidentUnitModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onUnitCreate={handleMutationSuccess}
          residentUnits={residentUnits}
        />
      </div>
    </>
  );
};

export default ResidentUnits;
