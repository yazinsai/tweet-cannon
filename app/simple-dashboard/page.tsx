'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tweet, PostingConfig, UserSession } from '@/lib/types';
import { getTweets, getUserSession, getPostingConfig, addTweet, updateTweet, deleteTweet } from '@/lib/storage';

const SimpleDashboard: React.FC = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newTweet, setNewTweet] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [schedulerEnabled, setSchedulerEnabled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load tweets
      const storedTweets = getTweets();
      setTweets(storedTweets);

      // Check authentication
      const session = await getUserSession();
      setIsAuthenticated(session?.isValid || false);

      // Check scheduler status
      const config = getPostingConfig();
      setSchedulerEnabled(config?.enabled || false);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTweet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTweet.trim()) return;

    try {
      const tweet = addTweet({
        content: newTweet.trim(),
        scheduledFor: null,
      });

      setTweets(prev => [tweet, ...prev]);
      setNewTweet('');
    } catch (error) {
      console.error('Failed to add tweet:', error);
    }
  };

  const handleDeleteTweet = (tweetId: string) => {
    try {
      deleteTweet(tweetId);
      setTweets(prev => prev.filter(t => t.id !== tweetId));
    } catch (error) {
      console.error('Failed to delete tweet:', error);
    }
  };

  const queuedTweets = tweets.filter(t => t.status === 'queued');
  const postedTweets = tweets.filter(t => t.status === 'posted');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Connect to Twitter First</h1>
          <p className="text-gray-600 mb-6">You need to connect your Twitter account to use the dashboard.</p>
          <Link
            href="/tweet"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">🔗</span>
            Connect Twitter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-xl">🚀</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tweet Cannon</h1>
                <p className="text-sm text-gray-600">Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm">
                <div className={`w-2 h-2 rounded-full mr-2 ${schedulerEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-gray-600">
                  Scheduler {schedulerEnabled ? 'On' : 'Off'}
                </span>
              </div>

              <Link
                href="/tweet"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span className="mr-1">✍️</span>
                Quick Tweet
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Add Tweet Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                Add to Queue
              </h2>

              <form onSubmit={handleAddTweet} className="space-y-4">
                <div>
                  <textarea
                    value={newTweet}
                    onChange={(e) => setNewTweet(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={4}
                    maxLength={280}
                  />
                  <div className="text-right text-sm text-gray-500 mt-1">
                    {newTweet.length}/280
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!newTweet.trim()}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Add to Queue
                </button>
              </form>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📊</span>
                Quick Stats
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{queuedTweets.length}</div>
                  <div className="text-sm text-gray-600">In Queue</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{postedTweets.length}</div>
                  <div className="text-sm text-gray-600">Posted</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tweet Queue */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <span className="mr-2">📋</span>
                  Tweet Queue
                </h2>

                {queuedTweets.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {queuedTweets.length} tweet{queuedTweets.length !== 1 ? 's' : ''} ready
                  </span>
                )}
              </div>

              {queuedTweets.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No tweets in queue</h3>
                  <p className="text-gray-600">Add some tweets to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queuedTweets.map((tweet) => (
                    <div key={tweet.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 mb-2">{tweet.content}</p>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="mr-4">
                              Added {new Date(tweet.createdAt).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              Queued
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTweet(tweet.id)}
                          className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
