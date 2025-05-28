'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastProps } from '@/components/ui/Toast';
import { generateId } from '@/lib/utils';

interface NotificationContextType {
  showNotification: (notification: Omit<ToastProps, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  showSuccess: (message: string, title?: string) => string;
  showError: (message: string, title?: string) => string;
  showWarning: (message: string, title?: string) => string;
  showInfo: (message: string, title?: string) => string;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showNotification = useCallback((notification: Omit<ToastProps, 'id'>) => {
    const id = generateId();
    const newToast: ToastProps = {
      id,
      ...notification,
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, title?: string) => {
    return showNotification({
      type: 'success',
      title,
      message,
      duration: 4000,
    });
  }, [showNotification]);

  const showError = useCallback((message: string, title?: string) => {
    return showNotification({
      type: 'error',
      title,
      message,
      duration: 6000, // Longer duration for errors
    });
  }, [showNotification]);

  const showWarning = useCallback((message: string, title?: string) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      duration: 5000,
    });
  }, [showNotification]);

  const showInfo = useCallback((message: string, title?: string) => {
    return showNotification({
      type: 'info',
      title,
      message,
      duration: 4000,
    });
  }, [showNotification]);

  const value: NotificationContextType = {
    showNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Hook for scheduler-specific notifications
export const useSchedulerNotifications = () => {
  const notifications = useNotifications();

  return {
    ...notifications,
    notifyTweetPosted: (tweetContent: string) => {
      notifications.showSuccess(
        `"${tweetContent.slice(0, 50)}${tweetContent.length > 50 ? '...' : ''}"`,
        'Tweet Posted Successfully!'
      );
    },
    notifyTweetFailed: (tweetContent: string, error: string) => {
      notifications.showError(
        `Failed to post: "${tweetContent.slice(0, 30)}..." - ${error}`,
        'Tweet Failed'
      );
    },
    notifySchedulerStarted: () => {
      notifications.showSuccess(
        'Automated posting is now active',
        'Scheduler Started'
      );
    },
    notifySchedulerStopped: () => {
      notifications.showInfo(
        'Automated posting has been stopped',
        'Scheduler Stopped'
      );
    },
    notifySchedulerPaused: () => {
      notifications.showWarning(
        'Automated posting is paused',
        'Scheduler Paused'
      );
    },
    notifySchedulerResumed: () => {
      notifications.showSuccess(
        'Automated posting has resumed',
        'Scheduler Resumed'
      );
    },
    notifyAuthenticationError: () => {
      notifications.showError(
        'Please check your authentication settings',
        'Authentication Failed'
      );
    },
    notifyQueueEmpty: () => {
      notifications.showWarning(
        'Add some tweets to your queue to continue posting',
        'Queue is Empty'
      );
    },
  };
};
