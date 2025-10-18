import React from 'react';
import ComponentCard from '../common/ComponentCard';

// NOTE: These interfaces are duplicated from Slips.tsx. Consider moving them to a shared types file.
interface ResidentUnit {
  id: string;
  unit: string;
}

interface GasReading {
  residentUnitId: string;
  unit: string;
  previousReading: number;
  currentReading: string;
}

interface GasConsumptionCardProps {
  residentUnits: ResidentUnit[];
  gasReadings: GasReading[];
  gasUnitPrice: string;
  onOpenGasModal: (reading: GasReading) => void;
  className?: string;
}

const GasConsumptionCard: React.FC<GasConsumptionCardProps> = ({
  residentUnits,
  gasReadings,
  gasUnitPrice,
  onOpenGasModal,
  className = "",
}) => {
  return (
    <ComponentCard title="Consumo de gás por unidade" className={className}>
      {residentUnits.length === 0 ? (
        <p className="text-center text-gray-500 p-4">
          Não há unidades residenciais cadastradas.
        </p>
      ) : (
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <ul className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
            {gasReadings.map((reading) => {
              const currentReadingNum =
                parseFloat(reading.currentReading.replace(',', '.')) || 0;
              const totalConsumption =
                currentReadingNum > reading.previousReading
                  ? currentReadingNum - reading.previousReading
                  : 0;
              const unitPrice = parseFloat(gasUnitPrice.replace(',', '.')) || 0;
              const totalValue = totalConsumption * unitPrice;

              return (
                <li
                  key={reading.residentUnitId}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                >
                  <div className="flex items-center gap-3 font-medium text-gray-500 dark:text-gray-400">
                    <span>
                      <svg
                        className="fill-current"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12.2989 1.12891C11.4706 1.12891 10.799 1.80033 10.7989 2.62867L10.7988 3.1264V3.12659L10.799 4.87507H6.14518C3.60237 4.87507 1.54102 6.93642 1.54102 9.47923V14.3207C1.54102 15.4553 2.46078 16.3751 3.59536 16.3751H6.14518H9.99935H16.2077C17.4503 16.3751 18.4577 15.3677 18.4577 14.1251V10.1251C18.4577 7.22557 16.1072 4.87507 13.2077 4.87507H12.299L12.2989 3.87651H13.7503C14.509 3.87651 15.124 3.26157 15.1242 2.50293C15.1243 1.74411 14.5092 1.12891 13.7503 1.12891H12.2989ZM3.04102 9.47923C3.04102 7.76485 4.4308 6.37507 6.14518 6.37507C7.85957 6.37507 9.24935 7.76485 9.24935 9.47923V14.8751H6.14518H3.59536C3.28921 14.8751 3.04102 14.6269 3.04102 14.3207V9.47923ZM10.7493 9.47923V14.8751H16.2077C16.6219 14.8751 16.9577 14.5393 16.9577 14.1251V10.1251C16.9577 8.054 15.2788 6.37507 13.2077 6.37507H9.54559C10.2933 7.19366 10.7493 8.28319 10.7493 9.47923Z"
                          fill=""
                        ></path>
                      </svg>
                    </span>
                    <span>{`Apto. ${reading.unit}`}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-semibold ${totalValue > 0 ? 'text-green-600' : 'text-gray-400'
                        }`}
                    >
                      {totalValue.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                    <button
                      onClick={() => onOpenGasModal(reading)}
                      className="text-gray-400 hover:text-brand-500"
                    >
                      <svg
                        width="1em"
                        height="1em"
                        viewBox="0 0 21 21"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-5"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M17.0911 3.53206C16.2124 2.65338 14.7878 2.65338 13.9091 3.53206L5.6074 11.8337C5.29899 12.1421 5.08687 12.5335 4.99684 12.9603L4.26177 16.445C4.20943 16.6931 4.286 16.9508 4.46529 17.1301C4.64458 17.3094 4.90232 17.3859 5.15042 17.3336L8.63507 16.5985C9.06184 16.5085 9.45324 16.2964 9.76165 15.988L18.0633 7.68631C18.942 6.80763 18.942 5.38301 18.0633 4.50433L17.0911 3.53206ZM14.9697 4.59272C15.2626 4.29982 15.7375 4.29982 16.0304 4.59272L17.0027 5.56499C17.2956 5.85788 17.2956 6.33276 17.0027 6.62565L16.1043 7.52402L14.0714 5.49109L14.9697 4.59272ZM13.0107 6.55175L6.66806 12.8944C6.56526 12.9972 6.49455 13.1277 6.46454 13.2699L5.96704 15.6283L8.32547 15.1308C8.46772 15.1008 8.59819 15.0301 8.70099 14.9273L15.0436 8.58468L13.0107 6.55175Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ComponentCard>
  );
};

export default GasConsumptionCard;
