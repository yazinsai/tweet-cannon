'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getStorageStats, getPostingConfig } from '@/lib/storage';
import { formatDate } from '@/lib/utils';

interface QueueStatsProps {
  className?: string;
  refreshTrigger?: number; // Used to trigger refresh from parent
}

interface Stats {
  totalTweets: number;
  queuedTweets: number;
  postedTweets: number;
  failedTweets: number;
  postingEnabled: boolean;
  nextPostTime?: Date;
}

const QueueStats: React.FC<QueueStatsProps> = ({ className, refreshTrigger }) => {
  const [stats, setStats] = useState<Stats>({
    totalTweets: 0,
    queuedTweets: 0,
    postedTweets: 0,
    failedTweets: 0,
    postingEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const storageStats = getStorageStats();
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Total Tweets',
      value: stats.totalTweets,
      icon: '📊',
      variant: 'default' as const,
    },
    {
      label: 'Queued',
      value: stats.queuedTweets,
      icon: '⏳',
      variant: 'default' as const,
    },
    {
      label: 'Posted',
      value: stats.postedTweets,
      icon: '✅',
      variant: 'success' as const,
    },
    {
      label: 'Failed',
      value: stats.failedTweets,
      icon: '❌',
      variant: 'danger' as const,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Queue Statistics</span>
          <Badge variant={stats.postingEnabled ? 'success' : 'default'}>
            {stats.postingEnabled ? '🟢 Auto-posting ON' : '⚪ Auto-posting OFF'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {statItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {item.label}
                </span>
              </div>
              <Badge variant={item.variant} size="sm">
                {item.value}
              </Badge>
            </div>
          ))}
        </div>

        {/* Next Post Time */}
        {stats.postingEnabled && stats.nextPostTime && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-2">
              <span className="text-lg">⏰</span>
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Next Scheduled Post
                </p>
                <p className="text-xs text-blue-600">
                  {formatDate(stats.nextPostTime)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Success Rate: {
                stats.totalTweets > 0 
                  ? Math.round((stats.postedTweets / stats.totalTweets) * 100)
                  : 0
              }%
            </span>
            <span>
              Queue Health: {
                stats.failedTweets === 0 
                  ? '🟢 Good'
                  : stats.failedTweets < 3
                  ? '🟡 Fair'
                  : '🔴 Poor'
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { QueueStats };
