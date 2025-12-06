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
import { GasReading } from '../types';
import { useSlipsData } from "../hooks/useSlipsData";
import { useGenerateSlips } from "../hooks/useGenerateSlips";
import { useSaveGasPrice } from "../hooks/useSaveGasPrice";
import { useSaveGasConsumption } from "../hooks/useSaveGasConsumption"; // 1. Importar

const Slips: React.FC = () => {
  const [targetMonth, setTargetMonth] = useState<Date | null>(new Date());
  
  const { data, isLoading, isError, error } = useSlipsData(targetMonth);
  const { residentUnits = [], gasReadings = [], expenseTypes = [], accounts = [], gasUnitPrice: initialGasPrice = '', isGasPriceDefined = false } = data || {};

  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [isGasModalOpen, setIsGasModalOpen] = useState(false);
  const [selectedGasReading, setSelectedGasReading] = useState<GasReading | null>(null);

  const [extraFee, setExtraFee] = useState('');
  const [reserveFund, setReserveFund] = useState('');
  const [gasUnitPrice, setGasUnitPrice] = useState('');

  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalContent] = useState({ title: '', message: '' });
  
  const [isDefineGasPriceModalOpen, setIsDefineGasPriceModalOpen] = useState(false);

  const { mutate: generateSlips, isLoading: isGenerating } = useGenerateSlips();
  const { mutate: saveGasPrice, isLoading: isSavingGasPrice } = useSaveGasPrice();
  const { mutate: saveGasConsumption, isLoading: isSavingGasConsumption, isSuccess: isSaveGasConsumptionSuccess, isError: isSaveGasConsumptionError, error: saveGasConsumptionError } = useSaveGasConsumption(); // 2. Usar hook

  useEffect(() => {
    if (isError) setPageError((error as Error).message);
    if (!isLoading && !isGasPriceDefined) {
      setIsDefineGasPriceModalOpen(true);
      setPageError("O preço do gás ainda não foi definido. Por favor, insira os dados da fatura.");
    }
  }, [isError, error, isLoading, isGasPriceDefined]);

  useEffect(() => {
    if (initialGasPrice) setGasUnitPrice(initialGasPrice);
  }, [initialGasPrice]);

  // Notificaciones para las mutaciones
  useEffect(() => {
    if (isSaveGasConsumptionSuccess) {
      setSuccess("Consumo de gás salvo com sucesso!");
      setPageError(null);
      setIsGasModalOpen(false);
    }
    if (isSaveGasConsumptionError) setPageError((saveGasConsumptionError as Error).message);
  }, [isSaveGasConsumptionSuccess, isSaveGasConsumptionError, saveGasConsumptionError]);


  const isGenerationDisabled = !extraFee || !reserveFund || !gasUnitPrice || (gasReadings && gasReadings.some(reading => !reading.currentReading));

  const handleMonthChange: Hook = useCallback((selectedDates) => {
    if (selectedDates.length > 0) setTargetMonth(selectedDates[0]);
  }, []);

  const handleGenerateSlips = (force = false) => {
    if (!targetMonth) {
      setPageError("Mês alvo não selecionado.");
      return;
    }
    const parseCurrency = (value: string) => {
      if (!value) return 0;
      const sanitized = value.replace(/\./g, '').replace(',', '.');
      return Math.round(parseFloat(sanitized) * 100);
    };
    generateSlips({
      targetMonth: `${targetMonth.getFullYear()}-${(targetMonth.getMonth() + 1).toString().padStart(2, '0')}`,
      force,
      extraFee: parseCurrency(extraFee),
      reserveFund: parseCurrency(reserveFund),
    });
    if (isConfirmationModalOpen) setIsConfirmationModalOpen(false);
  };

  const handleSaveGasConsumption = (updatedReading: GasReading, readingDate?: Date) => {
    let dateForReading = readingDate || new Date(targetMonth || new Date());
    if (!readingDate) {
      dateForReading.setMonth(dateForReading.getMonth() - 1);
    }
    
    const parseReadingInput = (value: string): number => {
      if (!value) return 0;
      const sanitized = value.replace(',', '.');
      if (sanitized.includes('.')) return parseFloat(sanitized) || 0;
      if (/^\d+$/.test(sanitized)) return (parseInt(sanitized, 10) || 0) / 1000;
      return 0;
    };

    const readingValue = parseReadingInput(updatedReading.currentReading);
    if (readingValue <= 0) {
      setPageError("A leitura atual deve ser um valor positivo.");
      return;
    }

    saveGasConsumption({
      residentUnitId: updatedReading.residentUnitId,
      year: dateForReading.getFullYear(),
      month: dateForReading.getMonth() + 1,
      reading: readingValue,
    });
  };

  const handleOpenGasModal = (reading: GasReading) => {
    setSelectedGasReading(reading);
    setIsGasModalOpen(true);
  };

  const handleCloseGasModal = () => {
    setIsGasModalOpen(false);
    setSelectedGasReading(null);
  };

  return (
    <>
      <FullScreenLoader isOpen={isLoading} />
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

      {!isLoading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <GenerateSlipsCard
              targetMonth={targetMonth}
              onMonthChange={handleMonthChange}
              onGenerate={() => handleGenerateSlips(false)}
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
                className="h-full"
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
        onSave={saveGasPrice}
        isLoading={isSavingGasPrice}
      />
      
      <AddGasConsumptionModal
        isOpen={isGasModalOpen}
        onClose={handleCloseGasModal}
        gasReading={selectedGasReading}
        gasUnitPrice={gasUnitPrice}
        onSave={handleSaveGasConsumption}
        isLoading={isSavingGasConsumption} // 3. Usar el estado del hook
      />
      
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onClose={() => setIsConfirmationModalOpen(false)}
        onConfirm={() => handleGenerateSlips(true)}
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
