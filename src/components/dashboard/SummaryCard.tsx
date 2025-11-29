import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  bgColorClass?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, bgColorClass = 'bg-primary' }) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-boxdark h-[100px] flex items-center">
      <div className="flex items-center w-full">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColorClass}`}>
          {icon}
        </div>
        <div className="ml-4 flex-grow">
          <h4 className="text-lg font-semibold text-black dark:text-white">{value}</h4>
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
