import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import ComponentCard from '../components/common/ComponentCard';
import DataTable, { ColumnDef } from '../components/tables/DataTable';
import AddIncomeModal from '../components/modal/AddIncomeModal';
import {
  API_INCOME_TYPES,
  CATALOG_STORAGE_KEYS,
  parseListResponse,
  readCachedIncomeTypes,
} from '../utils/catalogCache';
import { formatDateDMY } from "../utils/dateFormat";

interface ResidentUnit {
  id: string;
  unit: string;
}


interface IncomeType {
  id: string;
  name: string;
  code: string;
  description: string;
}


interface Income {
  id: string;
  description: string;
  amount: number; 
  dueDate: string;
  paidAt?: string | null;
  createdAt?: string;
  residentUnitId: string;
  type: IncomeType; 
}


interface ApiIncome {
  id:string; 
  residentUnitId: string;
  amount: number;
  type: IncomeType; 
  dueDate: string; 
  description: string;
  
}


interface ApiResidentUnit {
  id: string;
  unit: string;
}

const monthNamesPt = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const getInitialPeriod = (): string => {
  const now = new Date();
  now.setMonth(now.getMonth() - 1);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
};

const formatPeriodLabel = (period: string): string => {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return period;
  return `${monthNamesPt[monthIndex]} de ${year}`;
};

const buildPeriodOptions = (count: number): string[] => {
  const options: string[] = [];
  const cursor = new Date();
  cursor.setDate(1);
  for (let i = 0; i < count; i += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    options.push(`${year}-${month}`);
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return options;
};

const Incomes: React.FC = () => {
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>(() => readCachedIncomeTypes<IncomeType>());
  const [incomes, setIncomes] = useState<Income[]>([]);

  const [loadingIncomes, setLoadingIncomes] = useState(true);
  const [incomesError, setIncomesError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getInitialPeriod());

  
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");

        
        const unitsResponse = await fetch('/api/v1/resident-unit/actives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!unitsResponse.ok) throw new Error('Falha ao carregar unidades residenciais.');
        const unitsData: ApiResidentUnit[] = await unitsResponse.json();
        setResidentUnits(unitsData);

        const incTypesResponse = await fetch(API_INCOME_TYPES, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (incTypesResponse.ok) {
          const raw = await incTypesResponse.json();
          const list = parseListResponse<IncomeType>(raw);
          setIncomeTypes(list);
          try {
            localStorage.setItem(CATALOG_STORAGE_KEYS.incomeTypes, JSON.stringify(list));
          } catch {
            
          }
        } else {
          const cached = readCachedIncomeTypes<IncomeType>();
          if (cached.length > 0) setIncomeTypes(cached);
        }

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

      
      const formattedIncomes: Income[] = data.map(inc => ({
        ...inc,
        
        
      }));

      setIncomes(formattedIncomes);
    } catch (err: any) {
      setIncomesError('Falha ao carregar os ingressos.');
      console.error("Failed to fetch incomes:", err);
    } finally {
      setLoadingIncomes(false);
    }
  }, []);

  
  useEffect(() => {
    fetchIncomes();
  }, [fetchIncomes]);

  const periodOptions = buildPeriodOptions(24);
  const filteredIncomes = useMemo(() => {
    const [year, month] = selectedPeriod.split("-");
    if (!year || !month) return incomes;
    return incomes.filter((income) => {
      const date = new Date(income.dueDate);
      if (Number.isNaN(date.getTime())) return false;
      const incomeMonth = String(date.getUTCMonth() + 1).padStart(2, "0");
      const incomeYear = String(date.getUTCFullYear());
      return incomeYear === year && incomeMonth === month;
    });
  }, [incomes, selectedPeriod]);

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
          {formatDateDMY(income.dueDate)}
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
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span>Mês/Ano</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-10 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            >
              {periodOptions.map((period) => (
                <option key={period} value={period}>
                  {formatPeriodLabel(period)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ComponentCard
          title={`Ingressos de ${formatPeriodLabel(selectedPeriod)}`}
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
          ) : filteredIncomes.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400">Nenhum ingresso registrado no período selecionado.</p>
          ) : (
            <DataTable columns={columns} data={filteredIncomes} />
          )}
        </ComponentCard>

        <AddIncomeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onIncomeAdded={fetchIncomes}
          residentUnits={residentUnits}
          incomeTypes={incomeTypes}
        />
      </div>
    </>
  );
};

export default Incomes;