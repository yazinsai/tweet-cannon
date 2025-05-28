'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { TweetInput } from '@/components/TweetInput';
import { TweetQueue } from '@/components/TweetQueue';
import { QueueStats } from '@/components/QueueStats';
import { PostingSettings } from '@/components/PostingSettings';
import { AuthSettings } from '@/components/AuthSettings';
import { SchedulerControls } from '@/components/SchedulerControls';
import { StatusMonitor } from '@/components/StatusMonitor';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ErrorDashboard } from '@/components/ErrorDashboard';
import { RetrySettings } from '@/components/RetrySettings';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tweet, PostingConfig, UserSession } from '@/lib/types';
import { getTweets, getUserSession, getPostingConfig } from '@/lib/storage';

const DashboardPage: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [config, setConfig] = useState<PostingConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduler' | 'monitor' | 'errors' | 'settings'>('queue');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load tweets
      const storedTweets = getTweets();
      setTweets(storedTweets);

      // Load session
      const currentSession = await getUserSession();
      setSession(currentSession);

      // Load config
      const currentConfig = getPostingConfig();
      setConfig(currentConfig);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTweetAdded = (newTweet: Tweet) => {
    setTweets(prev => [newTweet, ...prev]);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTweetUpdated = (updatedTweet: Tweet) => {
    setTweets(prev =>
      prev.map(tweet =>
        tweet.id === updatedTweet.id ? updatedTweet : tweet
      )
    );
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTweetDeleted = (tweetId: string) => {
    setTweets(prev => prev.filter(tweet => tweet.id !== tweetId));
    setRefreshTrigger(prev => prev + 1);
  };

  const handleConfigUpdated = (newConfig: PostingConfig) => {
    setConfig(newConfig);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAuthUpdated = (newSession: UserSession | null) => {
    setSession(newSession);
  };

  const handleSchedulerTweetPosted = () => {
    // Refresh tweets and stats when scheduler posts a tweet
    loadData();
    setRefreshTrigger(prev => prev + 1);
  };

  const tabs = [
    { id: 'queue' as const, label: 'Tweet Queue', icon: '📝' },
    { id: 'scheduler' as const, label: 'Scheduler', icon: '🤖' },
    { id: 'monitor' as const, label: 'Monitor', icon: '📊' },
    { id: 'errors' as const, label: 'Errors', icon: '🚨' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Manage your tweet queue and posting settings
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <StatusMonitor compact />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <QueueStats refreshTrigger={refreshTrigger} />
          </div>
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('queue')}
                  variant={activeTab === 'queue' ? 'primary' : 'secondary'}
                >
                  📝 Manage Queue
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('scheduler')}
                  variant={activeTab === 'scheduler' ? 'primary' : 'secondary'}
                >
                  🤖 Scheduler
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('monitor')}
                  variant={activeTab === 'monitor' ? 'primary' : 'secondary'}
                >
                  📊 Monitor
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('errors')}
                  variant={activeTab === 'errors' ? 'primary' : 'secondary'}
                >
                  🚨 Errors
                </Button>
                <Button
                  className="w-full"
                  onClick={() => setActiveTab('settings')}
                  variant={activeTab === 'settings' ? 'primary' : 'secondary'}
                >
                  ⚙️ Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tweet Input */}
            <div className="lg:col-span-1">
              <TweetInput onTweetAdded={handleTweetAdded} />
            </div>

            {/* Tweet Queue */}
            <div className="lg:col-span-2">
              <TweetQueue
                tweets={tweets}
                onTweetUpdated={handleTweetUpdated}
                onTweetDeleted={handleTweetDeleted}
              />
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scheduler Controls */}
            <SchedulerControls
              config={config || { enabled: false, cadence: 'daily', interval: 24, randomWindow: 30 }}
              session={session}
              onConfigChange={handleConfigUpdated}
              onTweetPosted={handleSchedulerTweetPosted}
            />

            {/* Scheduler Info */}
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>
                    🤖 The automated scheduler runs in the background using Web Workers
                  </p>
                  <p>
                    ⏰ Posts tweets from your queue at the configured intervals
                  </p>
                  <p>
                    🎲 Adds randomization to posting times to appear more natural
                  </p>
                  <p>
                    📊 Automatically updates tweet statuses and provides real-time feedback
                  </p>
                  <p>
                    ⚡ Continues running even when you close the browser tab
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-1">
                    💡 Pro Tip
                  </p>
                  <p className="text-xs text-blue-600">
                    Keep this tab open for the best experience. The scheduler will continue
                    running in the background, but you'll get real-time updates here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Monitor */}
            <StatusMonitor />

            {/* Activity Feed */}
            <ActivityFeed />
          </div>
        )}

        {activeTab === 'errors' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Dashboard */}
            <ErrorDashboard />

            {/* Retry Settings */}
            <RetrySettings />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Authentication Settings */}
            <AuthSettings onAuthUpdated={handleAuthUpdated} />

            {/* Posting Settings */}
            <PostingSettings onConfigUpdated={handleConfigUpdated} />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DashboardPage;
