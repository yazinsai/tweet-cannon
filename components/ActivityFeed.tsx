'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'tweet_posted' | 'tweet_failed' | 'scheduler_started' | 'scheduler_stopped' | 'scheduler_paused' | 'scheduler_resumed' | 'tweet_added' | 'tweet_deleted' | 'auth_updated' | 'config_updated';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    tweetId?: string;
    tweetContent?: string;
    error?: string;
    username?: string;
  };
}

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
  showClearButton?: boolean;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  className, 
  maxItems = 20,
  showClearButton = true 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Load activities from localStorage on mount
  useEffect(() => {
    const savedActivities = localStorage.getItem('tweet_cannon_activities');
    if (savedActivities) {
      try {
        const parsed = JSON.parse(savedActivities);
        const activitiesWithDates = parsed.map((activity: {
          id: string;
          type: ActivityItem['type'];
          title: string;
          description: string;
          timestamp: string;
          metadata?: ActivityItem['metadata'];
        }) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        }));
        setActivities(activitiesWithDates);
      } catch (error) {
        console.error('Failed to load activities:', error);
      }
    }
  }, []);

  // Save activities to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tweet_cannon_activities', JSON.stringify(activities));
  }, [activities]);

  const addActivity = useCallback((activity: Omit<ActivityItem, 'id' | 'timestamp'>) => {
    const newActivity: ActivityItem = {
      ...activity,
      id: `activity_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date(),
    };

    setActivities(prev => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, maxItems); // Keep only the most recent items
    });
  }, [maxItems]);

  const clearActivities = () => {
    setActivities([]);
  };

  // Expose addActivity function globally for other components to use
  useEffect(() => {
    (window as Window & { addActivity?: typeof addActivity }).addActivity = addActivity;
    return () => {
      delete (window as Window & { addActivity?: typeof addActivity }).addActivity;
    };
  }, [addActivity]);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'tweet_posted': return '✅';
      case 'tweet_failed': return '❌';
      case 'scheduler_started': return '▶️';
      case 'scheduler_stopped': return '⏹️';
      case 'scheduler_paused': return '⏸️';
      case 'scheduler_resumed': return '▶️';
      case 'tweet_added': return '📝';
      case 'tweet_deleted': return '🗑️';
      case 'auth_updated': return '🔐';
      case 'config_updated': return '⚙️';
      default: return 'ℹ️';
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'tweet_posted':
      case 'scheduler_started':
      case 'scheduler_resumed':
      case 'auth_updated':
        return 'success';
      case 'tweet_failed':
        return 'danger';
      case 'scheduler_stopped':
      case 'scheduler_paused':
      case 'tweet_deleted':
        return 'warning';
      case 'tweet_added':
      case 'config_updated':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Activity Feed</span>
          <div className="flex items-center space-x-2">
            <Badge variant="info" size="sm">
              {activities.length} event{activities.length !== 1 ? 's' : ''}
            </Badge>
            {showClearButton && activities.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearActivities}
                className="text-xs"
              >
                🗑️ Clear
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground text-4xl mb-2">📋</div>
            <p className="text-muted-foreground">No recent activity</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Activity will appear here as you use Tweet Cannon
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <div className="flex-shrink-0 text-lg">
                  {getActivityIcon(activity.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-card-foreground truncate">
                      {activity.title}
                    </p>
                    <Badge
                      variant={getActivityColor(activity.type)}
                      size="sm"
                      className="ml-2 flex-shrink-0"
                    >
                      {formatRelativeTime(activity.timestamp)}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  
                  {/* Additional metadata */}
                  {activity.metadata?.tweetContent && (
                    <div className="mt-2 p-2 bg-card rounded border border-border text-xs text-card-foreground">
                      &quot;{activity.metadata.tweetContent.slice(0, 100)}
                      {activity.metadata.tweetContent.length > 100 ? '...' : ''}&quot;
                    </div>
                  )}

                  {activity.metadata?.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                      Error: {activity.metadata.error}
                    </div>
                  )}

                  {activity.metadata?.username && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      User: @{activity.metadata.username}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper functions for adding activities
type WindowWithAddActivity = Window & { addActivity?: (activity: Omit<ActivityItem, 'id' | 'timestamp'>) => void };

export const addTweetPostedActivity = (tweetContent: string, tweetId: string) => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'tweet_posted',
      title: 'Tweet Posted Successfully',
      description: 'Automated scheduler posted a tweet',
      metadata: { tweetContent, tweetId },
    });
  }
};

export const addTweetFailedActivity = (tweetContent: string, error: string, tweetId: string) => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'tweet_failed',
      title: 'Tweet Failed to Post',
      description: 'Automated scheduler failed to post a tweet',
      metadata: { tweetContent, error, tweetId },
    });
  }
};

export const addSchedulerStartedActivity = () => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'scheduler_started',
      title: 'Scheduler Started',
      description: 'Automated posting scheduler has been started',
    });
  }
};

export const addSchedulerStoppedActivity = () => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'scheduler_stopped',
      title: 'Scheduler Stopped',
      description: 'Automated posting scheduler has been stopped',
    });
  }
};

export const addTweetAddedActivity = (tweetContent: string) => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'tweet_added',
      title: 'Tweet Added to Queue',
      description: 'New tweet added to the posting queue',
      metadata: { tweetContent },
    });
  }
};

export const addAuthUpdatedActivity = (username?: string) => {
  const windowWithActivity = window as WindowWithAddActivity;
  if (windowWithActivity.addActivity) {
    windowWithActivity.addActivity({
      type: 'auth_updated',
      title: 'Authentication Updated',
      description: 'Twitter authentication credentials have been updated',
      metadata: { username },
    });
  }
};

export { ActivityFeed };
