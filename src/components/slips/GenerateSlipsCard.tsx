import React from 'react';
import { Hook } from 'flatpickr/dist/types/options';
import ComponentCard from '../common/ComponentCard';
import DatePicker from '../form/date-picker';

interface GenerateSlipsCardProps {
  targetMonth: Date | null;
  onMonthChange: Hook;
  onGenerate: () => void;
  loading: boolean;
  className?: string;
  isGenerationDisabled?: boolean;
}

const GenerateSlipsCard: React.FC<GenerateSlipsCardProps> = ({
  targetMonth,
  onMonthChange,
  onGenerate,
  loading,
  className = "",
  isGenerationDisabled = false,
}) => {
  return (
    <ComponentCard title="Gerar boletos mensais" className={className}>
      <div className="flex flex-col h-full p-6">
        {/* This div will grow and push the content to the bottom */}
        <div className="flex-grow"></div>
        
        {/* Content aligned to the bottom */}
        <div>
          <div className="mb-4">
            <DatePicker
              id="slip-generation-month"
              label="Mes y Año"
              onChange={onMonthChange}
              defaultDate={targetMonth || new Date()}
              mode="month"
              placeholder="Selecione o mês"
            />
          </div>
          <button
            onClick={onGenerate}
            disabled={loading || !targetMonth || isGenerationDisabled}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm transition bg-brand-500 rounded-lg shadow-theme-xs text-white hover:bg-brand-600 disabled:bg-brand-300 w-full"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Gerando...</span>
              </>
            ) : (
              'Gerar Boletos'
            )}
          </button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default GenerateSlipsCard;
