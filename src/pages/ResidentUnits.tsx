import React, { useState, useEffect, useCallback } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import { PencilIcon } from "../icons";
import EditResidentUnitModal from "../components/modal/EditResidentUnitModal";
import { ResidentUnit } from "../types/residentUnit"; 
import BulkAddUnitsModal from "../components/modal/BulkAddUnitsModal";


const ResidentUnits: React.FC = () => {
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [loadingResidentUnits, setLoadingResidentUnits] = useState(true);
  const [residentUnitsError, setResidentUnitsError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<ResidentUnit | null>(null);

  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  const fetchResidentUnits = useCallback(async () => {
    setLoadingResidentUnits(true);
    setResidentUnitsError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }

      const response = await fetch(`/api/v1/resident-unit/actives`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ResidentUnit[] = await response.json();
      setResidentUnits(data);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setResidentUnitsError(`Falha ao carregar as unidades residenciais: ${errorMessage}`);
      console.error("Failed to fetch resident units:", err);
    } finally {
      setLoadingResidentUnits(false);
    }
  }, []);

  useEffect(() => {
    fetchResidentUnits();
  }, [fetchResidentUnits]);

  const handleOpenEditModal = (unit: ResidentUnit) => {
    setSelectedUnit(unit);
    setIsEditModalOpen(true);
  };

  const columns: ColumnDef<ResidentUnit>[] = [
    {
      key: 'unit',
      header: 'Unidade',
      className: 'w-24', 
      cell: (unit) => <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">{unit.unit}</span>,
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
      cell: (unit) => <span className="text-gray-500 text-theme-sm dark:text-gray-400">{unit.notificationRecipients.map(r => r.name).join(', ')}</span>,
    },
    {
        key: 'actions',
        header: 'Ações',
        className: 'w-28', 
        cell: (unit) => (
            <div className="flex items-center justify-center gap-2">
                <button type="button" onClick={() => handleOpenEditModal(unit)} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90">
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
        <div className="flex flex-wrap justify-end gap-2">
          {residentUnits.length === 0 && !loadingResidentUnits && (
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600"
            >
              Configurar Edifício (Ações em Massa)
            </button>
          )}
        </div>
        <ComponentCard title="Todas as Unidades Residenciais">
          {loadingResidentUnits ? (
            <p className="text-center">Carregando unidades residenciais...</p>
          ) : residentUnitsError ? (
            <p className="text-center text-error-500">{residentUnitsError}</p>
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
          onUnitUpdate={fetchResidentUnits}
        />

        <BulkAddUnitsModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          onUnitsAdded={fetchResidentUnits}
        />
      </div>
    </>
  );
};

export default ResidentUnits;
