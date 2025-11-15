import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const baseClasses = 'relative w-full max-w-sm rounded-md p-4 text-white shadow-lg';
  const typeClasses = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <p>{message}</p>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white hover:text-gray-200"
        aria-label="Close"
      >
        <XMarkIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default Notification;
