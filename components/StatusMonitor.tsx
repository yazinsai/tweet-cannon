'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getScheduler, SchedulerState } from '@/lib/scheduler';
import { getUserSession, getTweets, getPostingConfig } from '@/lib/storage';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { UserSession, PostingConfig, Tweet } from '@/lib/types';

interface SystemStatus {
  scheduler: SchedulerState;
  authentication: {
    isValid: boolean;
    username?: string;
    lastValidated?: Date;
  };
  queue: {
    total: number;
    queued: number;
    posted: number;
    failed: number;
  };
  config: PostingConfig;
  lastUpdate: Date;
}

interface StatusMonitorProps {
  className?: string;
  compact?: boolean;
}

const StatusMonitor: React.FC<StatusMonitorProps> = ({ className, compact = false }) => {
  const [status, setStatus] = useState<SystemStatus>({
    scheduler: {
      isRunning: false,
      isPaused: false,
      nextPostTime: null,
      lastPostTime: null,
      stats: { totalPosted: 0, totalFailed: 0, lastError: null },
    },
    authentication: { isValid: false },
    queue: { total: 0, queued: 0, posted: 0, failed: 0 },
    config: { enabled: false, cadence: 'daily', interval: 24, randomWindow: 30 },
    lastUpdate: new Date(),
  });
  const [isOnline, setIsOnline] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const scheduler = getScheduler();

  const updateStatus = async () => {
    try {
      // Get scheduler state
      const schedulerState = scheduler.getState();
      
      // Get authentication status
      const session = await getUserSession();
      const authStatus = {
        isValid: session?.isValid || false,
        username: session?.username,
        lastValidated: session?.lastValidated,
      };
      
      // Get queue statistics
      const tweets = getTweets();
      const queueStats = {
        total: tweets.length,
        queued: tweets.filter(t => t.status === 'queued').length,
        posted: tweets.filter(t => t.status === 'posted').length,
        failed: tweets.filter(t => t.status === 'failed').length,
      };
      
      // Get posting config
      const config = getPostingConfig();
      
      setStatus({
        scheduler: schedulerState,
        authentication: authStatus,
        queue: queueStats,
        config,
        lastUpdate: new Date(),
      });
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  useEffect(() => {
    // Initial status update
    updateStatus();
    
    // Set up periodic updates
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds
    setRefreshInterval(interval);
    
    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for scheduler events
    const handleSchedulerEvent = () => updateStatus();
    
    scheduler.on('started', handleSchedulerEvent);
    scheduler.on('stopped', handleSchedulerEvent);
    scheduler.on('paused', handleSchedulerEvent);
    scheduler.on('resumed', handleSchedulerEvent);
    scheduler.on('tweetPosted', handleSchedulerEvent);
    scheduler.on('nextPostScheduled', handleSchedulerEvent);
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      scheduler.off('started', handleSchedulerEvent);
      scheduler.off('stopped', handleSchedulerEvent);
      scheduler.off('paused', handleSchedulerEvent);
      scheduler.off('resumed', handleSchedulerEvent);
      scheduler.off('tweetPosted', handleSchedulerEvent);
      scheduler.off('nextPostScheduled', handleSchedulerEvent);
    };
  }, [scheduler]);

  const getSystemHealthStatus = () => {
    const issues = [];
    
    if (!isOnline) issues.push('Offline');
    if (!status.authentication.isValid) issues.push('Authentication');
    if (!status.config.enabled) issues.push('Auto-posting disabled');
    if (status.queue.queued === 0 && status.scheduler.isRunning) issues.push('Empty queue');
    if (status.scheduler.stats.lastError) issues.push('Recent errors');
    
    if (issues.length === 0) {
      return { status: 'healthy', label: '🟢 All Systems Operational', color: 'success' as const };
    } else if (issues.length <= 2) {
      return { status: 'warning', label: '🟡 Minor Issues', color: 'warning' as const };
    } else {
      return { status: 'error', label: '🔴 System Issues', color: 'danger' as const };
    }
  };

  const systemHealth = getSystemHealthStatus();

  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <Badge variant={systemHealth.color} size="sm">
          {systemHealth.label}
        </Badge>
        {status.scheduler.isRunning && status.scheduler.nextPostTime && (
          <span className="text-xs text-gray-500">
            Next: {formatRelativeTime(status.scheduler.nextPostTime)}
          </span>
        )}
        <span className="text-xs text-gray-400">
          Updated {formatRelativeTime(status.lastUpdate)}
        </span>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>System Status</span>
          <div className="flex items-center space-x-2">
            <Badge variant={systemHealth.color}>
              {systemHealth.label}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={updateStatus}
              className="text-xs"
            >
              🔄 Refresh
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{isOnline ? '🌐' : '📡'}</span>
            <span className="text-sm font-medium text-gray-700">
              Connection
            </span>
          </div>
          <Badge variant={isOnline ? 'success' : 'danger'} size="sm">
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>

        {/* Scheduler Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🤖</span>
            <span className="text-sm font-medium text-gray-700">
              Scheduler
            </span>
          </div>
          <Badge 
            variant={
              status.scheduler.isRunning && !status.scheduler.isPaused 
                ? 'success' 
                : status.scheduler.isPaused 
                ? 'warning' 
                : 'default'
            } 
            size="sm"
          >
            {status.scheduler.isRunning && !status.scheduler.isPaused 
              ? 'Running' 
              : status.scheduler.isPaused 
              ? 'Paused' 
              : 'Stopped'
            }
          </Badge>
        </div>

        {/* Authentication Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔐</span>
            <span className="text-sm font-medium text-gray-700">
              Authentication
            </span>
          </div>
          <Badge variant={status.authentication.isValid ? 'success' : 'danger'} size="sm">
            {status.authentication.isValid ? 'Valid' : 'Invalid'}
          </Badge>
        </div>

        {/* Queue Status */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📝</span>
              <span className="text-sm font-medium text-gray-700">
                Queue Status
              </span>
            </div>
            <Badge variant="info" size="sm">
              {status.queue.total} Total
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="font-bold text-blue-600">{status.queue.queued}</div>
              <div className="text-gray-500">Queued</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">{status.queue.posted}</div>
              <div className="text-gray-500">Posted</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-red-600">{status.queue.failed}</div>
              <div className="text-gray-500">Failed</div>
            </div>
          </div>
        </div>

        {/* Next Post Time */}
        {status.scheduler.nextPostTime && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Next Post
                </p>
                <p className="text-xs text-blue-600">
                  {formatDate(status.scheduler.nextPostTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-center text-xs text-gray-500">
          Last updated {formatRelativeTime(status.lastUpdate)}
        </div>
      </CardContent>
    </Card>
  );
};

export { StatusMonitor };
