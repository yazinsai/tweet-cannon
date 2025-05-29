'use client';

import { useState, useEffect, useCallback } from 'react';
import { PostingConfig } from '@/lib/types';
import { getPostingConfig } from '@/lib/storage';
import { useAuth } from './useAuth';
import { useTweets } from './useTweets';

interface UseAppDataReturn {
  isLoading: boolean;
  config: PostingConfig | null;
  schedulerEnabled: boolean;
  refreshAll: () => Promise<void>;
  updateConfig: (newConfig: PostingConfig) => void;
  // Re-export auth and tweets data for convenience
  session: ReturnType<typeof useAuth>['session'];
  isAuthenticated: boolean;
  tweets: ReturnType<typeof useTweets>['tweets'];
  queuedTweets: ReturnType<typeof useTweets>['queuedTweets'];
  postedTweets: ReturnType<typeof useTweets>['postedTweets'];
  addNewTweet: ReturnType<typeof useTweets>['addNewTweet'];
  updateExistingTweet: ReturnType<typeof useTweets>['updateExistingTweet'];
  removeExistingTweet: ReturnType<typeof useTweets>['removeExistingTweet'];
  checkSession: ReturnType<typeof useAuth>['checkSession'];
  logout: ReturnType<typeof useAuth>['logout'];
}

export function useAppData(): UseAppDataReturn {
  const [config, setConfig] = useState<PostingConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const auth = useAuth();
  const tweets = useTweets();

  const loadConfig = useCallback(async () => {
    try {
      const currentConfig = getPostingConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        auth.checkSession(),
        tweets.refreshTweets(),
        loadConfig(),
      ]);
    } catch (error) {
      console.error('Failed to refresh app data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth.checkSession, tweets.refreshTweets, loadConfig]);

  const updateConfig = useCallback((newConfig: PostingConfig) => {
    setConfig(newConfig);
  }, []);

  useEffect(() => {
    // Only run on mount, not when refreshAll changes
    const initialLoad = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          auth.checkSession(),
          tweets.refreshTweets(),
          loadConfig(),
        ]);
      } catch (error) {
        console.error('Failed to refresh app data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();
  }, []); // Empty dependency array for mount only

  // Determine loading state - we're loading if any individual hook is loading
  const combinedIsLoading = isLoading || auth.isLoading || tweets.isLoading;

  return {
    isLoading: combinedIsLoading,
    config,
    schedulerEnabled: config?.enabled || false,
    refreshAll,
    updateConfig,
    // Re-export auth data
    session: auth.session,
    isAuthenticated: auth.isAuthenticated,
    checkSession: auth.checkSession,
    logout: auth.logout,
    // Re-export tweets data
    tweets: tweets.tweets,
    queuedTweets: tweets.queuedTweets,
    postedTweets: tweets.postedTweets,
    addNewTweet: tweets.addNewTweet,
    updateExistingTweet: tweets.updateExistingTweet,
    removeExistingTweet: tweets.removeExistingTweet,
  };
}
