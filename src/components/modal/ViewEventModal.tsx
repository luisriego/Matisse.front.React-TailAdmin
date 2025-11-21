import React from 'react';
import { Modal } from '../ui/modal';
import { EventInput } from '@fullcalendar/core';

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    amount: number;
    type: 'Expense' | 'Income';
  };
}

interface ViewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
}

const ViewEventModal: React.FC<ViewEventModalProps> = ({ isOpen, onClose, event }) => {
  if (!event) return null;

  const { title, start, extendedProps } = event;
  const { amount, type } = extendedProps;

  const formattedAmount = (amount / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

  const eventTypeClass = type === 'Income' ? 'text-success-500' : 'text-danger-500';
  const eventTypeBgClass = type === 'Income' ? 'bg-success-50' : 'bg-danger-50';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Evento">
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(start as string).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tipo:</span>
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${eventTypeBgClass} ${eventTypeClass}`}>
              {type === 'Income' ? 'Ingresso' : 'Despesa'}
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Monto:</span>
            <span className={`font-semibold ${eventTypeClass}`}>{formattedAmount}</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <button
          onClick={onClose}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors bg-white rounded-lg text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
};

export default ViewEventModal;
