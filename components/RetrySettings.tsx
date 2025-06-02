'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getErrorHandler, RetryConfig, ErrorType, DEFAULT_RETRY_CONFIG } from '@/lib/errorHandling';
import { useNotifications } from '@/contexts/NotificationContext';

interface RetrySettingsProps {
  className?: string;
}

const RetrySettings: React.FC<RetrySettingsProps> = ({ className }) => {
  const [config, setConfig] = useState<RetryConfig>(DEFAULT_RETRY_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const errorHandler = getErrorHandler();
  const notifications = useNotifications();

  useEffect(() => {
    // Load current config
    const currentConfig = (errorHandler as any).retryConfig || DEFAULT_RETRY_CONFIG;
    setConfig(currentConfig);
  }, []);

  const handleConfigChange = (field: keyof RetryConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleRetryableErrorToggle = (errorType: ErrorType) => {
    const newRetryableErrors = config.retryableErrors.includes(errorType)
      ? config.retryableErrors.filter(type => type !== errorType)
      : [...config.retryableErrors, errorType];
    
    handleConfigChange('retryableErrors', newRetryableErrors);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      errorHandler.updateRetryConfig(config);
      notifications.showSuccess('Retry settings saved successfully', 'Settings Updated');
      setHasChanges(false);
    } catch (error) {
      notifications.showError('Failed to save retry settings', 'Save Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_RETRY_CONFIG);
    setHasChanges(true);
  };

  const formatDelay = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${Math.round(milliseconds / 1000)}s`;
    return `${Math.round(milliseconds / 60000)}m`;
  };

  const getErrorTypeDescription = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Connection issues, timeouts';
      case ErrorType.AUTHENTICATION:
        return 'Invalid credentials, expired tokens';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests, API limits';
      case ErrorType.CONTENT_VIOLATION:
        return 'Policy violations, inappropriate content';
      case ErrorType.DUPLICATE:
        return 'Duplicate tweets, already posted';
      case ErrorType.SERVER_ERROR:
        return 'Twitter server issues, 5xx errors';
      case ErrorType.UNKNOWN:
        return 'Unclassified errors';
      default:
        return '';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Retry Settings</span>
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <span className="text-xs text-orange-600">Unsaved changes</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="text-xs"
            >
              🔄 Reset
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Auto-retry Toggle */}
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Automatic Retry
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Automatically retry failed tweets based on error type
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableAutoRetry}
              onChange={(e) => handleConfigChange('enableAutoRetry', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Retry Limits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Retry Attempts
            </label>
            <input
              type="number"
              min="0"
              max="10"
              value={config.maxRetries}
              onChange={(e) => handleConfigChange('maxRetries', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum number of retry attempts per tweet
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exponential Base
            </label>
            <input
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={config.exponentialBase}
              onChange={(e) => handleConfigChange('exponentialBase', parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Multiplier for exponential backoff
            </p>
          </div>
        </div>

        {/* Delay Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Delay ({formatDelay(config.baseDelay)})
            </label>
            <input
              type="range"
              min="1000"
              max="30000"
              step="1000"
              value={config.baseDelay}
              onChange={(e) => handleConfigChange('baseDelay', parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Initial delay before first retry
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Delay ({formatDelay(config.maxDelay)})
            </label>
            <input
              type="range"
              min="60000"
              max="1800000"
              step="60000"
              value={config.maxDelay}
              onChange={(e) => handleConfigChange('maxDelay', parseInt(e.target.value))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum delay between retries
            </p>
          </div>
        </div>

        {/* Retryable Error Types */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Retryable Error Types
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Select which types of errors should be automatically retried
          </p>
          
          <div className="space-y-2">
            {Object.values(ErrorType).map((errorType) => (
              <label
                key={errorType}
                className="flex items-center space-x-3 p-2 border border-border rounded-lg hover:bg-muted cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={config.retryableErrors.includes(errorType)}
                  onChange={() => handleRetryableErrorToggle(errorType)}
                  className="w-4 h-4 text-blue-600 bg-background border-border rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-card-foreground capitalize">
                    {errorType.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getErrorTypeDescription(errorType)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Retry Preview */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Retry Schedule Preview
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            {Array.from({ length: Math.min(config.maxRetries, 3) }, (_, i) => {
              const delay = Math.min(
                config.baseDelay * Math.pow(config.exponentialBase, i),
                config.maxDelay
              );
              return (
                <div key={i}>
                  Retry {i + 1}: {formatDelay(delay)} delay
                </div>
              );
            })}
            {config.maxRetries > 3 && (
              <div className="text-gray-500">
                ... and {config.maxRetries - 3} more attempts
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-2">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={!hasChanges || isLoading}
            className="px-6"
          >
            💾 Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export { RetrySettings };
