import React from 'react';
import { Hook } from 'flatpickr/dist/types/options';
import ComponentCard from '../common/ComponentCard';
import DatePicker from '../form/date-picker';
import ErrorAlert from '../common/alerts/ErrorAlert';
import SuccessAlert from '../common/alerts/SuccessAlert';

interface GenerateSlipsCardProps {
  targetMonth: Date | null;
  onMonthChange: Hook;
  onGenerate: () => void;
  loading: boolean;
  error: string | null;
  success: string | null;
  className?: string;
}

const GenerateSlipsCard: React.FC<GenerateSlipsCardProps> = ({
  targetMonth,
  onMonthChange,
  onGenerate,
  loading,
  error,
  success,
  className = "",
}) => {
  return (
    <ComponentCard title="Gerar boletos mensais" className={className}>
      <div className="flex flex-col h-full p-6">
        <div className="flex-grow">
          <DatePicker
            id="slip-generation-month"
            label="Mes y Año"
            onChange={onMonthChange}
            defaultDate={targetMonth || new Date()}
            mode="month"
            placeholder="Selecione o mês"
          />
        </div>
        <div>
          <div className="mb-4">
            {error && <ErrorAlert message={error} />}
            {success && <SuccessAlert message={success} />}
          </div>
          <button
            onClick={onGenerate}
            disabled={loading || !targetMonth}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300 w-full"
          >
            {loading ? 'Gerando...' : 'Gerar Boletos'}
          </button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default GenerateSlipsCard;
