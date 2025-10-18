import React from 'react';
import ComponentCard from '../common/ComponentCard';

interface SlipSettingsProps {
  extraFee: string;
  setExtraFee: (value: string) => void;
  reserveFund: string;
  setReserveFund: (value: string) => void;
  gasUnitPrice: string;
  setGasUnitPrice: (value: string) => void;
  className?: string;
}

const SlipSettings: React.FC<SlipSettingsProps> = ({
  extraFee,
  setExtraFee,
  reserveFund,
  setReserveFund,
  gasUnitPrice,
  setGasUnitPrice,
  className = "",
}) => {
  return (
    <ComponentCard title="Configurações do Boleto" className={className}>
      <div className="space-y-3">
        <div>
          <label htmlFor="extra-fee" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Taxa Extra
          </label>
          <input
            type="text"
            id="extra-fee"
            value={extraFee}
            onChange={(e) => setExtraFee(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            placeholder="0,00"
          />
        </div>
        <div>
          <label htmlFor="reserve-fund" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fundo de Reserva
          </label>
          <input
            type="text"
            id="reserve-fund"
            value={reserveFund}
            onChange={(e) => setReserveFund(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            placeholder="0,00"
          />
        </div>
        <div>
          <label htmlFor="gas-unit-price" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor do m³ de Gás
          </label>
          <input
            type="text"
            id="gas-unit-price"
            value={gasUnitPrice}
            onChange={(e) => setGasUnitPrice(e.target.value)}
            className="h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900"
            placeholder="0,00"
          />
        </div>
      </div>
    </ComponentCard>
  );
};

export default SlipSettings;
