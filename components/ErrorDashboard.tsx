'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getErrorHandler, TweetError, ErrorType } from '@/lib/errorHandling';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';

interface ErrorDashboardProps {
  className?: string;
}

const ErrorDashboard: React.FC<ErrorDashboardProps> = ({ className }) => {
  const [errors, setErrors] = useState<TweetError[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [selectedType, setSelectedType] = useState<ErrorType | 'all'>('all');
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const errorHandler = getErrorHandler();
  const notifications = useNotifications();

  const loadErrors = () => {
    const filterOptions = {
      resolved: filter === 'resolved' ? true : filter === 'pending' ? false : undefined,
      errorType: selectedType !== 'all' ? selectedType : undefined,
    };

    const filteredErrors = errorHandler.getErrors(filterOptions);
    setErrors(filteredErrors);
    setStats(errorHandler.getErrorStats());
  };

  useEffect(() => {
    loadErrors();
    
    // Set up retry event listener
    const handleRetryEvent = (event: CustomEvent) => {
      loadErrors(); // Refresh when retries happen
    };

    window.addEventListener('tweetRetry', handleRetryEvent as EventListener);
    
    // Refresh every 30 seconds
    const interval = setInterval(loadErrors, 30000);

    return () => {
      window.removeEventListener('tweetRetry', handleRetryEvent as EventListener);
      clearInterval(interval);
    };
  }, [filter, selectedType]);

  const handleManualRetry = async (errorId: string) => {
    setIsLoading(true);
    try {
      const success = await errorHandler.manualRetry(errorId);
      if (success) {
        notifications.showSuccess('Retry initiated successfully', 'Manual Retry');
      } else {
        notifications.showError('Failed to initiate retry', 'Retry Failed');
      }
      loadErrors();
    } catch (error) {
      notifications.showError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        'Retry Failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveError = (errorId: string) => {
    errorHandler.resolveError(errorId);
    notifications.showSuccess('Error marked as resolved', 'Error Resolved');
    loadErrors();
  };

  const handleClearOldErrors = () => {
    const cleared = errorHandler.clearOldErrors(7);
    notifications.showSuccess(
      `Cleared ${cleared} old resolved errors`,
      'Cleanup Complete'
    );
    loadErrors();
  };

  const getErrorTypeColor = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return 'warning';
      case ErrorType.AUTHENTICATION:
        return 'danger';
      case ErrorType.RATE_LIMIT:
        return 'info';
      case ErrorType.CONTENT_VIOLATION:
        return 'danger';
      case ErrorType.DUPLICATE:
        return 'warning';
      case ErrorType.SERVER_ERROR:
        return 'danger';
      default:
        return 'default';
    }
  };

  const getErrorTypeIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.NETWORK:
        return '🌐';
      case ErrorType.AUTHENTICATION:
        return '🔐';
      case ErrorType.RATE_LIMIT:
        return '⏱️';
      case ErrorType.CONTENT_VIOLATION:
        return '⚠️';
      case ErrorType.DUPLICATE:
        return '📋';
      case ErrorType.SERVER_ERROR:
        return '🔥';
      default:
        return '❓';
    }
  };

  const getRetryStatusText = (error: TweetError) => {
    if (error.resolved) {
      return error.retryCount > 0 ? `Resolved after ${error.retryCount} retries` : 'Resolved';
    }
    
    if (error.nextRetryAt && error.nextRetryAt > new Date()) {
      return `Next retry ${formatRelativeTime(error.nextRetryAt)}`;
    }
    
    if (error.retryCount >= error.maxRetries) {
      return 'Max retries reached';
    }
    
    return `${error.retryCount}/${error.maxRetries} retries`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Error Dashboard</span>
          <div className="flex items-center space-x-2">
            <Badge variant="info" size="sm">
              {stats.pending || 0} pending
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearOldErrors}
              className="text-xs"
            >
              🗑️ Clean Up
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-lg font-bold text-card-foreground">{stats.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Errors</div>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <div className="text-lg font-bold text-green-600">{stats.resolved || 0}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-600">{stats.pending || 0}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-600">{stats.retrySuccess || 0}</div>
            <div className="text-xs text-muted-foreground">Auto-Fixed</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          {['all', 'pending', 'resolved'].map((filterOption) => (
            <Button
              key={filterOption}
              size="sm"
              variant={filter === filterOption ? 'primary' : 'ghost'}
              onClick={() => setFilter(filterOption as any)}
              className="text-xs capitalize"
            >
              {filterOption}
            </Button>
          ))}

          <span className="text-sm text-muted-foreground ml-4">Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-xs border border-border bg-background text-foreground rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            {Object.values(ErrorType).map((type) => (
              <option key={type} value={type}>
                {getErrorTypeIcon(type)} {type.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Error List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {errors.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground text-4xl mb-2">✅</div>
              <p className="text-muted-foreground">
                {filter === 'pending' ? 'No pending errors' : 'No errors found'}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {filter === 'pending'
                  ? 'All systems are running smoothly!'
                  : 'Try adjusting your filters'
                }
              </p>
            </div>
          ) : (
            errors.map((error) => (
              <div
                key={error.id}
                className={`p-4 border rounded-lg ${
                  error.resolved
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getErrorTypeIcon(error.errorType)}</span>
                      <Badge variant={getErrorTypeColor(error.errorType)} size="sm">
                        {error.errorType.replace('_', ' ')}
                      </Badge>
                      {error.errorCode && (
                        <Badge variant="default" size="sm">
                          {error.errorCode}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(error.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-card-foreground mb-1">
                      {error.message}
                    </p>

                    <p className="text-xs text-muted-foreground mb-2">
                      Tweet: "{error.tweetContent}..."
                    </p>

                    <p className="text-xs text-muted-foreground/70">
                      {getRetryStatusText(error)}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-1 ml-4">
                    {!error.resolved && error.retryCount < error.maxRetries && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleManualRetry(error.id)}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        🔄 Retry
                      </Button>
                    )}
                    
                    {!error.resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolveError(error.id)}
                        className="text-xs"
                      >
                        ✅ Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export { ErrorDashboard };
