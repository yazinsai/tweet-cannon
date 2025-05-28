'use client';

import { useState, useEffect } from 'react';
import { 
  addTweet, 
  getTweets, 
  updateTweet, 
  deleteTweet,
  getPostingConfig,
  savePostingConfig,
  getStorageStats,
  clearAllData,
  validateTweetContent
} from '@/lib';
import type { Tweet, PostingConfig } from '@/lib';

export default function TestStoragePage() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [config, setConfig] = useState<PostingConfig | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [newTweetContent, setNewTweetContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    try {
      const loadedTweets = getTweets();
      const loadedConfig = getPostingConfig();
      const loadedStats = getStorageStats();
      
      setTweets(loadedTweets);
      setConfig(loadedConfig);
      setStats(loadedStats);
      setError(null);
    } catch (err) {
      setError(`Failed to load data: ${(err as Error).message}`);
    }
  };

  const handleAddTweet = () => {
    try {
      const validation = validateTweetContent(newTweetContent);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        return;
      }

      const tweet = addTweet({ content: newTweetContent });
      setNewTweetContent('');
      setSuccess(`Tweet added: ${tweet.id}`);
      loadData();
    } catch (err) {
      setError(`Failed to add tweet: ${(err as Error).message}`);
    }
  };

  const handleUpdateTweetStatus = (id: string, status: Tweet['status']) => {
    try {
      updateTweet({ id, status });
      setSuccess(`Tweet ${id} status updated to ${status}`);
      loadData();
    } catch (err) {
      setError(`Failed to update tweet: ${(err as Error).message}`);
    }
  };

  const handleDeleteTweet = (id: string) => {
    try {
      const deleted = deleteTweet(id);
      if (deleted) {
        setSuccess(`Tweet ${id} deleted`);
        loadData();
      } else {
        setError('Tweet not found');
      }
    } catch (err) {
      setError(`Failed to delete tweet: ${(err as Error).message}`);
    }
  };

  const handleTogglePosting = () => {
    if (!config) return;
    
    try {
      const newConfig = { ...config, enabled: !config.enabled };
      savePostingConfig(newConfig);
      setSuccess(`Posting ${newConfig.enabled ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (err) {
      setError(`Failed to update config: ${(err as Error).message}`);
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      try {
        clearAllData();
        setSuccess('All data cleared');
        loadData();
      } catch (err) {
        setError(`Failed to clear data: ${(err as Error).message}`);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Tweet Cannon Storage Test</h1>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Add Tweet Section */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Add New Tweet</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTweetContent}
            onChange={(e) => setNewTweetContent(e.target.value)}
            placeholder="Enter tweet content..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
            maxLength={280}
          />
          <button
            onClick={handleAddTweet}
            disabled={!newTweetContent.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Add Tweet
          </button>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {newTweetContent.length}/280 characters
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Storage Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalTweets}</div>
              <div className="text-sm text-gray-600">Total Tweets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.queuedTweets}</div>
              <div className="text-sm text-gray-600">Queued</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.postedTweets}</div>
              <div className="text-sm text-gray-600">Posted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failedTweets}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Config Section */}
      {config && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-3">Posting Configuration</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                Status: {config.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-sm text-gray-600">
                Interval: {config.interval} hours, Random window: {config.randomWindow} minutes
              </div>
            </div>
            <button
              onClick={handleTogglePosting}
              className={`px-4 py-2 rounded ${
                config.enabled 
                  ? 'bg-red-500 text-white' 
                  : 'bg-green-500 text-white'
              }`}
            >
              {config.enabled ? 'Disable' : 'Enable'} Posting
            </button>
          </div>
        </div>
      )}

      {/* Tweets List */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold mb-3">Tweet Queue ({tweets.length})</h2>
        {tweets.length === 0 ? (
          <p className="text-gray-500">No tweets in queue</p>
        ) : (
          <div className="space-y-3">
            {tweets.map((tweet) => (
              <div key={tweet.id} className="border border-gray-200 rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium">{tweet.content}</div>
                    <div className="text-sm text-gray-500">
                      ID: {tweet.id} | Status: {tweet.status} | Created: {tweet.createdAt.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <select
                      value={tweet.status}
                      onChange={(e) => handleUpdateTweetStatus(tweet.id, e.target.value as Tweet['status'])}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="queued">Queued</option>
                      <option value="posting">Posting</option>
                      <option value="posted">Posted</option>
                      <option value="failed">Failed</option>
                    </select>
                    <button
                      onClick={() => handleDeleteTweet(tweet.id)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={loadData}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Refresh Data
        </button>
        <button
          onClick={handleClearAll}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}
