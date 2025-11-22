import React, { useState, useCallback, useEffect } from "react";
import PageMeta from '../components/common/PageMeta';
import PageBreadcrumb from '../components/common/PageBreadCrumb';
import { Hook } from 'flatpickr/dist/types/options';
import AddGasConsumptionModal from "../components/modal/AddGasConsumptionModal";
import ConfirmationModal from "../components/modal/ConfirmationModal";
import DefineGasPriceModal from "../components/modal/DefineGasPriceModal";
import SlipSettings from "../components/slips/SlipSettings";
import GasConsumptionCard from "../components/gas/GasConsumptionCard";
import GenerateSlipsCard from "../components/slips/GenerateSlipsCard";
import MonthlyExpensesTable from "../components/expenses/MonthlyExpensesTable";
import FullScreenLoader from "../components/common/FullScreenLoader";
import { ExpenseType, ResidentUnit, Account, GasReading } from '../types';

const Slips: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [targetMonth, setTargetMonth] = useState<Date | null>(new Date());
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
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

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalContent] = useState({ title: '', message: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [isDefineGasPriceModalOpen, setIsDefineGasPriceModalOpen] = useState(false);
  const [isSavingGasPrice, setIsSavingGasPrice] = useState(false);

  const isGenerationDisabled = !extraFee || !reserveFund || !gasUnitPrice || gasReadings.some(reading => !reading.currentReading);

  const fetchSpecificReading = async (unitId: string, year: number, month: number, token: string): Promise<number | null> => {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const response = await fetch(`/api/v1/gas/resident-units/${unitId}/reading/${year}/${month}`, { headers });
      if (response.ok) {
        const data = await response.json();
        return data.reading;
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    setPageError(null);
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

      if (unitsRes.ok) {
        const unitsData: ResidentUnit[] = await unitsRes.json();
        setResidentUnits(unitsData);

        const previousReadingDate = new Date(targetMonth || new Date());
        previousReadingDate.setMonth(previousReadingDate.getMonth() - 2);
        const previousReadingYear = previousReadingDate.getFullYear();
        const previousReadingMonth = previousReadingDate.getMonth() + 1;

        const currentReadingDate = new Date(targetMonth || new Date());
        currentReadingDate.setMonth(currentReadingDate.getMonth() - 1);
        const currentReadingYear = currentReadingDate.getFullYear();
        const currentReadingMonth = currentReadingDate.getMonth() + 1;

        const readingsPromises = unitsData.map(async unit => {
          const prevReading = await fetchSpecificReading(unit.id, previousReadingYear, previousReadingMonth, token);
          const currReading = await fetchSpecificReading(unit.id, currentReadingYear, currentReadingMonth, token);
          return { prevReading, currReading };
        });
        const allReadingsData = await Promise.all(readingsPromises);

        setGasReadings(unitsData.map((unit, index) => {
          const prev = allReadingsData[index].prevReading;
          const curr = allReadingsData[index].currReading;
          return {
            residentUnitId: unit.id,
            unit: unit.unit,
            previousReading: prev,
            currentReading: curr !== null ? curr.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '',
          };
        }));
      } else {
        const errorData = await unitsRes.json();
        throw new Error(errorData.message || 'Falha ao carregar unidades residenciais.');
      }

      if (typesRes.ok) setExpenseTypes(await typesRes.json());
      if (accountsRes.ok) setAccounts((await accountsRes.json()).accounts || []);

      if (gasPriceRes.ok) {
        const gasPriceData = await gasPriceRes.json();
        const priceInReais = gasPriceData.price_per_m3_in_cents / 100;
        setGasUnitPrice(priceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } else if (gasPriceRes.status === 404) {
        setIsDefineGasPriceModalOpen(true);
        setPageError("O preço do gás ainda não foi definido. Por favor, insira os dados da fatura.");
      } else {
        const errorData = await gasPriceRes.json();
        throw new Error(errorData.message || 'Falha ao carregar o preço do gás.');
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
      setPageError(message);
    } finally {
      setLoading(false);
    }
  }, [targetMonth]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const proceedWithGeneration = async (force = false) => {
    setIsGenerating(true);
    setSuccess(null);
    setPageError(null);

    if (!targetMonth) {
      setPageError("Mês alvo não selecionado.");
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
        setPageError(err.message);
      } else {
        setPageError('Ocorreu um erro desconhecido ao gerar os boletos.');
      }
    } finally {
      setIsGenerating(false);
      setIsConfirmationModalOpen(false);
    }
  };

  const handleGenerateSlips = async () => {
    await proceedWithGeneration();
  };

  const handleSaveGasPrice = async (billAmountInCents: number, bufferPercentage: number) => {
    setIsSavingGasPrice(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      const response = await fetch('/api/v1/gas/price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ billAmountInCents, bufferPercentage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao definir o preço do gás.');
      }
      
      const gasPriceRes = await fetch('/api/v1/gas/price', { headers: { Authorization: `Bearer ${token}` } });
      if (gasPriceRes.ok) {
        const gasPriceData = await gasPriceRes.json();
        const priceInReais = gasPriceData.price_per_m3_in_cents / 100;
        
        setGasUnitPrice(priceInReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setPageError(null);
        setIsDefineGasPriceModalOpen(false);
        setSuccess("Preço do gás definido com sucesso!");
      } else {
        throw new Error('Falha ao recarregar o preço do gás após salvar.');
      }

    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Erro ao salvar preço do gás:", err.message);
        throw err;
      }
      throw new Error("Ocorreu um erro desconhecido ao salvar o preço do gás.");
    } finally {
      setIsSavingGasPrice(false);
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

  const handleSaveGasConsumption = async (updatedReading: GasReading, readingDate?: Date) => {
    setPageError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token de autenticação não encontrado.");

      let dateForReading: Date;
      if (readingDate) {
        dateForReading = readingDate;
      } else {
        const newDate = new Date(targetMonth || new Date());
        newDate.setMonth(newDate.getMonth() - 1);
        dateForReading = newDate;
      }

      const readingYear = dateForReading.getFullYear();
      const readingMonth = dateForReading.getMonth() + 1;

      const parseReadingInput = (value: string): number => {
        if (!value) return 0;
        const sanitized = value.replace(',', '.');
        if (sanitized.includes('.')) return parseFloat(sanitized) || 0;
        if (/^\d+$/.test(sanitized)) return (parseInt(sanitized, 10) || 0) / 1000;
        return 0;
      };

      const readingValue = parseReadingInput(updatedReading.currentReading);
      if (readingValue <= 0) throw new Error("A leitura atual deve ser um valor positivo.");

      const body = {
        id: crypto.randomUUID(),
        residentUnitId: updatedReading.residentUnitId,
        year: readingYear,
        month: readingMonth,
        reading: readingValue,
      };

      const response = await fetch('/api/v1/gas/reading', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao salvar a leitura de gás.');
      }

      await fetchInitialData();
      setSuccess('Consumo de gás salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.';
      setPageError(message);
    }
  };

  return (
    <>
      <FullScreenLoader isOpen={loading} />
      <PageMeta title="Boletos | Matisse" description="Página para geração e gestão de boletos" />
      <PageBreadcrumb pageTitle="Boletos" />

      {pageError && !isDefineGasPriceModalOpen && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
          <span className="font-medium">Erro!</span> {pageError}
        </div>
      )}

      {success && (
        <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">
          <span className="font-medium">Sucesso!</span> {success}
        </div>
      )}

      {!loading && !pageError && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <GenerateSlipsCard
              targetMonth={targetMonth}
              onMonthChange={handleMonthChange}
              onGenerate={handleGenerateSlips}
              loading={isGenerating}
              className="lg:col-span-3 h-full"
              isGenerationDisabled={isGenerationDisabled || !!pageError}
            />
            <div className="lg:col-span-3 h-full">
              <SlipSettings
                extraFee={extraFee}
                setExtraFee={setExtraFee}
                reserveFund={reserveFund}
                setReserveFund={setReserveFund}
                gasUnitPrice={gasUnitPrice}
                setGasUnitPrice={setGasUnitPrice}
                className="h-full" // Added h-full
              />
            </div>
            <GasConsumptionCard
              residentUnits={residentUnits}
              gasReadings={gasReadings}
              gasUnitPrice={gasUnitPrice}
              onOpenGasModal={handleOpenGasModal}
              className="lg:col-span-6 h-full"
            />
          </div>

          <MonthlyExpensesTable
            targetMonth={targetMonth}
            expenseTypes={expenseTypes}
            residentUnits={residentUnits}
            accounts={accounts}
          />
        </div>
      )}

      <DefineGasPriceModal
        isOpen={isDefineGasPriceModalOpen}
        onClose={() => setIsDefineGasPriceModalOpen(false)}
        onSave={handleSaveGasPrice}
        isLoading={isSavingGasPrice}
      />
      
      <AddGasConsumptionModal
        isOpen={isGasModalOpen}
        onClose={handleCloseGasModal}
        gasReading={selectedGasReading}
        gasUnitPrice={gasUnitPrice}
        onSave={handleSaveGasConsumption}
      />
      
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={() => proceedWithGeneration(true)}
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
