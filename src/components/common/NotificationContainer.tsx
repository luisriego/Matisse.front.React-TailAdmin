import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import Alert from '../ui/alert/Alert';

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-25 right-5 z-50 w-full max-w-sm">
      <div className="space-y-3">
        {notifications.map(notification => (
          <Alert
            key={notification.id}
            variant={notification.type}
            title={notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
            showLink={false}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;
