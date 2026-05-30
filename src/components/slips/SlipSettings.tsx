import React from "react";
import ComponentCard from "../common/ComponentCard";

interface SlipSettingsProps {
  targetMonthLabel: string;
  extraFee: string;
  setExtraFee: (value: string) => void;
  reserveFund: string;
  setReserveFund: (value: string) => void;
  gasUnitPrice: string;
  setGasUnitPrice: (value: string) => void;
  syndicTotal: string;
  setSyndicTotal: (value: string) => void;
  className?: string;
}

const SlipSettings: React.FC<SlipSettingsProps> = ({
  targetMonthLabel,
  extraFee,
  setExtraFee,
  reserveFund,
  setReserveFund,
  gasUnitPrice,
  setGasUnitPrice,
  syndicTotal,
  setSyndicTotal,
  className = "",
}) => {
  const inputCls =
    "h-9 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900";

  return (
    <ComponentCard title="Parâmetros do mês" className={className}>
      <div className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Valores aplicados a <strong className="font-medium text-gray-700 dark:text-gray-300">{targetMonthLabel}</strong>.
          Guardados automaticamente para este mês. Rateio síndico: sempre partes iguais.
        </p>
        <div>
          <label htmlFor="extra-fee" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Taxa extra (por unidade)
          </label>
          <input
            type="text"
            id="extra-fee"
            value={extraFee}
            onChange={(e) => setExtraFee(e.target.value)}
            className={inputCls}
            placeholder="250,00"
          />
        </div>
        <div>
          <label htmlFor="reserve-fund" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fundo de reserva (por unidade)
          </label>
          <input
            type="text"
            id="reserve-fund"
            value={reserveFund}
            onChange={(e) => setReserveFund(e.target.value)}
            className={inputCls}
            placeholder="93,70"
          />
        </div>
        <div>
          <label htmlFor="syndic-total" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Rateio síndico total (R$)
          </label>
          <input
            type="text"
            id="syndic-total"
            value={syndicTotal}
            onChange={(e) => setSyndicTotal(e.target.value)}
            className={inputCls}
            placeholder="600,00"
          />
        </div>
        <div>
          <label htmlFor="gas-unit-price" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Preço do gás (R$ / m³)
          </label>
          <input
            type="text"
            id="gas-unit-price"
            value={gasUnitPrice}
            onChange={(e) => setGasUnitPrice(e.target.value)}
            className={inputCls}
            placeholder="26,00"
          />
        </div>
      </div>
    </ComponentCard>
  );
};

export default SlipSettings;
