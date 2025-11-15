import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import { Close, InfoHexa, CheckCircle, InfoError } from '../../icons';

const GlobalAlerts: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  if (!notifications.length) {
    return null;
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <InfoError className="h-6 w-6 text-red-500" />;
      case 'info':
      default:
        return <InfoHexa className="h-6 w-6 text-blue-500" />;
    }
  };

  const getTitle = (type: string) => {
    switch (type) {
      case 'success':
        return 'Sucesso!';
      case 'error':
        return 'Ocorreu um erro!';
      case 'info':
      default:
        return 'Informativo';
    }
  };

  return (
    <div className="fixed top-24 right-5 z-50 w-full max-w-sm">
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`relative flex items-start rounded-lg border p-4 shadow-lg
              ${notification.type === 'success' && 'border-green-400 bg-green-50'}
              ${notification.type === 'error' && 'border-red-400 bg-red-50'}
              ${notification.type === 'info' && 'border-blue-400 bg-blue-50'}
            `}
          >
            <div className="flex-shrink-0">{getIcon(notification.type)}</div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-semibold
                ${notification.type === 'success' && 'text-green-800'}
                ${notification.type === 'error' && 'text-red-800'}
                ${notification.type === 'info' && 'text-blue-800'}
              `}>
                {getTitle(notification.type)}
              </p>
              <p className={`mt-1 text-sm
                ${notification.type === 'success' && 'text-green-700'}
                ${notification.type === 'error' && 'text-red-700'}
                ${notification.type === 'info' && 'text-blue-700'}
              `}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <Close className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalAlerts;
