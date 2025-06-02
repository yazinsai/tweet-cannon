'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  id: string;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface ToastComponentProps extends ToastProps {
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastComponentProps> = ({
  id,
  title,
  message,
  type = 'info',
  duration = 5000,
  action,
  onClose,
  onRemove,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose?.();
      onRemove(id);
    }, 300);
  };

  const typeStyles = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
      icon: '✅',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-800 dark:text-emerald-300',
      messageColor: 'text-emerald-700 dark:text-emerald-400',
    },
    error: {
      bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: '❌',
      iconColor: 'text-red-600 dark:text-red-400',
      titleColor: 'text-red-800 dark:text-red-300',
      messageColor: 'text-red-700 dark:text-red-400',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
      icon: '⚠️',
      iconColor: 'text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-800 dark:text-amber-300',
      messageColor: 'text-amber-700 dark:text-amber-400',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: 'ℹ️',
      iconColor: 'text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-800 dark:text-blue-300',
      messageColor: 'text-blue-700 dark:text-blue-400',
    },
  };

  const styles = typeStyles[type];

  return (
    <div
      className={cn(
        'max-w-sm w-full border rounded-lg shadow-lg p-4 transition-all duration-300 ease-in-out transform',
        styles.bg,
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0',
        isLeaving && 'translate-x-full opacity-0'
      )}
    >
      <div className="flex items-start">
        <div className={cn('flex-shrink-0 text-lg', styles.iconColor)}>
          {styles.icon}
        </div>

        <div className="ml-3 w-0 flex-1">
          {title && (
            <p className={cn('text-sm font-medium', styles.titleColor)}>
              {title}
            </p>
          )}
          <p className={cn('text-sm', styles.messageColor, title && 'mt-1')}>
            {message}
          </p>

          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={cn(
                  'text-sm font-medium underline hover:no-underline',
                  styles.titleColor
                )}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={handleClose}
            className={cn(
              'inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition ease-in-out duration-150',
              styles.iconColor
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer };
export type { ToastComponentProps };
