'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PostingConfig, UserSession } from '@/lib/types';
import { getScheduler, SchedulerState } from '@/lib/scheduler';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useSchedulerNotifications } from '@/contexts/NotificationContext';
import {
  addSchedulerStartedActivity,
  addSchedulerStoppedActivity,
  addTweetPostedActivity,
  addTweetFailedActivity
} from '@/components/ActivityFeed';
import { getErrorHandler } from '@/lib/errorHandling';

interface SchedulerControlsProps {
  config: PostingConfig;
  session: UserSession | null;
  onConfigChange?: (config: PostingConfig) => void;
  onTweetPosted?: () => void;
  className?: string;
}

const SchedulerControls: React.FC<SchedulerControlsProps> = ({
  config,
  session,
  onConfigChange,
  onTweetPosted,
  className,
}) => {
  const [schedulerState, setSchedulerState] = useState<SchedulerState>({
    isRunning: false,
    isPaused: false,
    nextPostTime: null,
    lastPostTime: null,
    stats: {
      totalPosted: 0,
      totalFailed: 0,
      lastError: null,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const scheduler = getScheduler();
  const notifications = useSchedulerNotifications();
  const errorHandler = getErrorHandler();

  useEffect(() => {
    // Set up event listeners
    const handleSchedulerEvent = (data: any) => {
      setSchedulerState(scheduler.getState());
    };

    const handleTweetPosted = (data: any) => {
      setSchedulerState(scheduler.getState());
      onTweetPosted?.();

      // Add notifications and activity
      if (data.success) {
        notifications.notifyTweetPosted(data.tweet?.content || 'Tweet');
        addTweetPostedActivity(data.tweet?.content || 'Tweet', data.tweet?.id || '');
      } else {
        // Record the error in the error handling system
        const error = {
          message: data.error || 'Unknown error',
          code: data.errorCode
        };

        errorHandler.recordError(
          data.tweetId || data.tweet?.id || 'unknown',
          data.tweet?.content || 'Tweet content unavailable',
          error,
          undefined
        );

        notifications.notifyTweetFailed(data.tweet?.content || 'Tweet', data.error || 'Unknown error');
        addTweetFailedActivity(data.tweet?.content || 'Tweet', data.error || 'Unknown error', data.tweet?.id || '');
      }
    };

    const handleError = (data: any) => {
      setError(data.error);
      setSchedulerState(scheduler.getState());
    };

    const handleAutoRestart = (data: any) => {
      notifications.showInfo(
        'Scheduler was automatically restarted after page reload',
        'Auto-restart'
      );
      setSchedulerState(scheduler.getState());
    };

    scheduler.on('started', handleSchedulerEvent);
    scheduler.on('stopped', handleSchedulerEvent);
    scheduler.on('paused', handleSchedulerEvent);
    scheduler.on('resumed', handleSchedulerEvent);
    scheduler.on('nextPostScheduled', handleSchedulerEvent);
    scheduler.on('tweetPosted', handleTweetPosted);
    scheduler.on('error', handleError);
    scheduler.on('autoRestart', handleAutoRestart);

    // Get initial state
    setSchedulerState(scheduler.getState());

    return () => {
      scheduler.off('started', handleSchedulerEvent);
      scheduler.off('stopped', handleSchedulerEvent);
      scheduler.off('paused', handleSchedulerEvent);
      scheduler.off('resumed', handleSchedulerEvent);
      scheduler.off('nextPostScheduled', handleSchedulerEvent);
      scheduler.off('tweetPosted', handleTweetPosted);
      scheduler.off('error', handleError);
      scheduler.off('autoRestart', handleAutoRestart);
    };
  }, [scheduler, onTweetPosted]);

  const handleStart = async () => {
    if (!session?.isValid) {
      setError('Authentication required to start scheduler');
      return;
    }

    if (!config.enabled) {
      setError('Auto-posting must be enabled in settings');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      scheduler.start(config);
      notifications.notifySchedulerStarted();
      addSchedulerStartedActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scheduler');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setError('');

    try {
      scheduler.stop();
      notifications.notifySchedulerStopped();
      addSchedulerStoppedActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scheduler');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    setError('');

    try {
      scheduler.pause();
      notifications.notifySchedulerPaused();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause scheduler');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    setError('');

    try {
      scheduler.resume();
      notifications.notifySchedulerResumed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume scheduler');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (schedulerState.isRunning && !schedulerState.isPaused) {
      return <Badge variant="success">🟢 Running</Badge>;
    } else if (schedulerState.isRunning && schedulerState.isPaused) {
      return <Badge variant="warning">⏸️ Paused</Badge>;
    } else {
      return <Badge variant="default">⚪ Stopped</Badge>;
    }
  };

  const canStart = !schedulerState.isRunning && session?.isValid && config.enabled;
  const canStop = schedulerState.isRunning;
  const canPause = schedulerState.isRunning && !schedulerState.isPaused;
  const canResume = schedulerState.isRunning && schedulerState.isPaused;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Automated Scheduler</span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Control Buttons */}
        <div className="flex space-x-2">
          {canStart && (
            <Button
              onClick={handleStart}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              ▶️ Start
            </Button>
          )}

          {canStop && (
            <Button
              variant="danger"
              onClick={handleStop}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              ⏹️ Stop
            </Button>
          )}

          {canPause && (
            <Button
              variant="secondary"
              onClick={handlePause}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              ⏸️ Pause
            </Button>
          )}

          {canResume && (
            <Button
              onClick={handleResume}
              loading={isLoading}
              disabled={isLoading}
              className="flex-1"
            >
              ▶️ Resume
            </Button>
          )}
        </div>

        {/* Status Information */}
        <div className="space-y-3">
          {/* Next Post Time */}
          {schedulerState.nextPostTime && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg">⏰</span>
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Next Post Scheduled
                  </p>
                  <p className="text-xs text-blue-600">
                    {formatDate(schedulerState.nextPostTime)}
                    <span className="ml-1">
                      ({formatRelativeTime(schedulerState.nextPostTime)})
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Post Time */}
          {schedulerState.lastPostTime && (
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg">✅</span>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Last Post
                  </p>
                  <p className="text-xs text-green-600">
                    {formatRelativeTime(schedulerState.lastPostTime)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-lg font-bold text-green-600">
                {schedulerState.stats.totalPosted}
              </p>
              <p className="text-xs text-gray-600">Posted</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-lg font-bold text-red-600">
                {schedulerState.stats.totalFailed}
              </p>
              <p className="text-xs text-gray-600">Failed</p>
            </div>
          </div>

          {/* Current Configuration */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">
              Current Schedule
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>
                <strong>Frequency:</strong> Every {config.interval} hour{config.interval !== 1 ? 's' : ''}
              </p>
              {config.randomWindow > 0 && (
                <p>
                  <strong>Randomization:</strong> ±{config.randomWindow} minutes
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Last Error */}
        {schedulerState.stats.lastError && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-1">
              Last Error
            </p>
            <p className="text-xs text-yellow-600">
              {schedulerState.stats.lastError}
            </p>
          </div>
        )}

        {/* Auto-restart Info */}
        {schedulerState.isRunning && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Persistence:</strong> The scheduler will automatically restart when you return to this page
            </p>
          </div>
        )}

        {/* Requirements Check */}
        {!session?.isValid && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Authentication required to start scheduler
            </p>
          </div>
        )}

        {!config.enabled && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Auto-posting must be enabled in settings
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { SchedulerControls };
