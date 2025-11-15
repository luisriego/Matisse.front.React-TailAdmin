import React, { useState, useCallback, useEffect } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { Hook } from 'flatpickr/dist/types/options';
import AddGasConsumptionModal from "../components/modal/AddGasConsumptionModal";
import ConfirmationModal from "../components/modal/ConfirmationModal";
import SlipSettings from "../components/slips/SlipSettings";
import GasConsumptionCard from "../components/gas/GasConsumptionCard";
import GenerateSlipsCard from "../components/slips/GenerateSlipsCard";
import MonthlyExpensesTable from "../components/expenses/MonthlyExpensesTable";
import FullScreenLoader from "../components/common/FullScreenLoader"; // Import the new loader
import { ExpenseType, ResidentUnit, Account, GasReading } from '../types';

const Slips: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [targetMonth, setTargetMonth] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [residentUnits, setResidentUnits] = useState<ResidentUnit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const [gasReadings, setGasReadings] = useState<GasReading[]>([]);
  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedGasReading, setSelectedGasReading] = useState<GasReading | null>(null);

  const [extraFee, setExtraFee] = useState('');
  const [reserveFund, setReserveFund] = useState('');
  const [gasUnitPrice, setGasUnitPrice] = useState('');

  // Confirmation Modal State
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalContent, setConfirmationModalContent] = useState({ title: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);

  const isGenerationDisabled = !extraFee || !reserveFund || !gasUnitPrice || gasReadings.some(reading => !reading.currentReading);


  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error("Token não encontrado.");
        const headers = { Authorization: `Bearer ${token}` };

        const [typesRes, unitsRes, accountsRes, gasPriceRes] = await Promise.all([
          fetch('/api/v1/expense-types', { headers }),
          fetch('/api/v1/resident-unit/actives', { headers }),
          fetch('/api/v1/accounts', { headers }),
          fetch('/api/v1/gas/price', { headers }),
        ]);

        if (!typesRes.ok) throw new Error('Falha ao carregar tipos de despesa.');
        if (!unitsRes.ok) throw new Error('Falha ao carregar unidades residenciais.');
        if (!accountsRes.ok) throw new Error('Falha ao carregar contas.');
        if (!gasPriceRes.ok) throw new Error('Falha ao carregar o preço do gás.');

        const expenseTypesData: ExpenseType[] = await typesRes.json();
        setExpenseTypes(expenseTypesData);
        const unitsData: ResidentUnit[] = await unitsRes.json();
        const accountsData = await accountsRes.json();
        const gasPriceData = await gasPriceRes.json();

        setResidentUnits(unitsData);
        setAccounts(accountsData.accounts || []);

        const priceInReais = gasPriceData.price_per_m3_in_cents / 100;
        setGasUnitPrice(priceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));


        const initialGasReadings: GasReading[] = unitsData.map(unit => ({
          residentUnitId: unit.id,
          unit: unit.unit,
          previousReading: 0, // Placeholder as requested
          currentReading: '',
        }));
        setGasReadings(initialGasReadings);

      } catch (err: unknown) {
        console.error("Erro ao carregar dados iniciais:", err);
        setError("Falha ao carregar dados de configuração. Tente recarregar a página.");
      }
    };
    fetchInitialData();
  }, []);

  // --- HANDLERS ---
  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const handleGenerateSlips = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (!targetMonth) {
      setError("Por favor, selecione um mês e ano para gerar os boletos.");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const checkTotalResponse = await fetch('/api/v1/slips/check-total', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: 400000 }), // Example amount
      });

      if (checkTotalResponse.ok) {
        const checkTotalData = await checkTotalResponse.json();
        if (checkTotalData.status === 'alert_generated') {
          setConfirmationModalContent({
            title: 'Alerta de Contabilidade',
            message: checkTotalData.message,
          });
          setLoading(false); // Hide full-screen loader
          setIsConfirmationModalOpen(true); // Show confirmation modal
          return;
        } else {
          await proceedWithGeneration();
        }
      } else {
        console.error("Error with check-total endpoint, proceeding with generation.");
        await proceedWithGeneration();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido.');
      }
      setLoading(false);
    }
  };

  const proceedWithGeneration = async (force = false) => {
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    if (!targetMonth) {
      setError("Mês alvo não selecionado.");
      setIsGenerating(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth() + 1;
      const formattedMonth = `${year}-${month.toString().padStart(2, '0')}`;

      const parseCurrency = (value: string) => {
        if (!value) return 0;
        const sanitized = value.replace(/\./g, '').replace(',', '.');
        return Math.round(parseFloat(sanitized) * 100);
      };

      const response = await fetch('/api/v1/slips/generation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetMonth: formattedMonth,
          force,
          extraFee: parseCurrency(extraFee),
          reserveFund: parseCurrency(reserveFund),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar os boletos.');
      }

      setSuccess(`Boletos para ${formattedMonth} gerados com sucesso!`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido ao gerar os boletos.');
      }
    } finally {
      setIsGenerating(false);
      setIsConfirmationModalOpen(false);
      setLoading(false);
    }
  };


  const handleOpenGasModal = (reading: GasReading) => {
    setSelectedGasReading(reading);
    setIsGasModalOpen(true);
  };

  const handleCloseGasModal = () => {
    setIsGasModalOpen(false);
    setSelectedGasReading(null);
  };

  const handleSaveGasConsumption = (updatedReading: GasReading) => {
    setGasReadings(prevReadings =>
      prevReadings.map(r =>
        r.residentUnitId === updatedReading.residentUnitId ? updatedReading : r
      )
    );
    setSuccess('Consumo de gás salvo com sucesso!');
    setTimeout(() => setSuccess(null), 3000);
  };

  // --- RENDER ---
  return (
    <>
      <FullScreenLoader isOpen={loading} />
      <PageMeta title="Boletos | Matisse" description="Página para geração e gestão de boletos" />
      <PageBreadcrumb pageTitle="Boletos" />
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <GenerateSlipsCard
            targetMonth={targetMonth}
            onMonthChange={handleMonthChange}
            onGenerate={handleGenerateSlips}
            loading={loading || isGenerating} // Show loading state from both processes
            error={error}
            success={success}
            className="lg:col-span-3 h-full"
            isGenerationDisabled={isGenerationDisabled}
          />
          <div className="lg:col-span-4">
            <SlipSettings
              extraFee={extraFee}
              setExtraFee={setExtraFee}
              reserveFund={reserveFund}
              setReserveFund={setReserveFund}
              gasUnitPrice={gasUnitPrice}
              setGasUnitPrice={setGasUnitPrice}
            />
          </div>
          <GasConsumptionCard
            residentUnits={residentUnits}
            gasReadings={gasReadings}
            gasUnitPrice={gasUnitPrice}
            onOpenGasModal={handleOpenGasModal}
            className="lg:col-span-5"
          />
        </div>

        <MonthlyExpensesTable
          targetMonth={targetMonth}
          expenseTypes={expenseTypes}
          residentUnits={residentUnits}
          accounts={accounts}
        />
      </div>

      <AddGasConsumptionModal
        isOpen={isGasModalOpen}
        onClose={handleCloseGasModal}
        gasReading={selectedGasReading}
        gasUnitPrice={gasUnitPrice}
        onSave={handleSaveGasConsumption}
      />

      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => {
          setIsConfirmationModalOpen(false);
          setLoading(false); // Stop loading if user cancels
        }}
        onConfirm={() => proceedWithGeneration(true)} // Pass force=true on confirmation
        title={confirmationModalContent.title}
        message={confirmationModalContent.message}
        confirmText="Gerar Mesmo Assim"
        cancelText="Cancelar"
        isLoading={isGenerating}
      />
    </>
  );
};

export default Slips;
