'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

import { Tweet, PostingConfig, UserSession } from '@/lib/types';
import { getTweets, getUserSession, getPostingConfig } from '@/lib/storage';

const DashboardPage: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [config, setConfig] = useState<PostingConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'scheduler' | 'settings'>('queue');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    { id: 'scheduler' as const, label: 'Automation', icon: '🤖' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mr-4">
                <span className="text-2xl">🚀</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Tweet Cannon Dashboard</h1>
                <p className="text-gray-600">
                  Manage your tweets and automation
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <StatusMonitor compact />
              <Link
                href="/simple-dashboard"
                className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="mr-1">📱</span>
                Simple View
              </Link>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="mb-8">
          <QueueStats refreshTrigger={refreshTrigger} />
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-2">
            <nav className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'queue' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tweet Input */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <TweetInput onTweetAdded={handleTweetAdded} />
              </div>
            </div>

            {/* Tweet Queue */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <TweetQueue
                  tweets={tweets}
                  onTweetUpdated={handleTweetUpdated}
                  onTweetDeleted={handleTweetDeleted}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <div className="space-y-8">
            {/* Scheduler Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <SchedulerControls
                config={config || { enabled: false, cadence: 'daily', interval: 24, randomWindow: 30 }}
                session={session}
                onConfigChange={handleConfigUpdated}
                onTweetPosted={handleSchedulerTweetPosted}
              />
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">💡</span>
                How Automation Works
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-sm">🤖</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Smart Scheduling</h4>
                      <p className="text-sm text-gray-600">Automatically posts tweets from your queue at optimal times</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-sm">🎲</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Natural Timing</h4>
                      <p className="text-sm text-gray-600">Adds randomization to appear more human-like</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-sm">⚡</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Background Operation</h4>
                      <p className="text-sm text-gray-600">Continues working even when you close the browser</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-sm">📊</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Real-time Updates</h4>
                      <p className="text-sm text-gray-600">Get instant feedback on posting status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Main Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <AuthSettings onAuthUpdated={handleAuthUpdated} />
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <PostingSettings onConfigUpdated={handleConfigUpdated} />
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-8">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔧</span>
                    Advanced Features
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <StatusMonitor />
                    </div>
                    <div>
                      <ActivityFeed />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <ErrorDashboard />
                  </div>
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <RetrySettings />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
