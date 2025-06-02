'use client';

import { useState, useEffect, useCallback } from 'react';
import { Tweet, CreateTweetData, UpdateTweetData } from '@/lib/types';
import { getTweets, addTweet, updateTweet, deleteTweet } from '@/lib/storage';

interface UseTweetsReturn {
  tweets: Tweet[];
  isLoading: boolean;
  error: string | null;
  addNewTweet: (data: CreateTweetData, enableThreading?: boolean) => Promise<Tweet>;
  updateExistingTweet: (id: string, data: Partial<UpdateTweetData>) => Promise<Tweet>;
  removeExistingTweet: (id: string) => Promise<void>;
  refreshTweets: () => Promise<void>;
  queuedTweets: Tweet[];
  postedTweets: Tweet[];
}

export function useTweets(): UseTweetsReturn {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshTweets = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const storedTweets = getTweets();
      setTweets(storedTweets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tweets';
      setError(errorMessage);
      console.error('Failed to refresh tweets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addNewTweet = useCallback(async (data: CreateTweetData, enableThreading: boolean = true): Promise<Tweet> => {
    try {
      setError(null);
      const newTweet = addTweet(data, enableThreading);
      setTweets(prev => [newTweet, ...prev]);
      return newTweet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add tweet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateExistingTweet = useCallback(async (id: string, data: Partial<UpdateTweetData>): Promise<Tweet> => {
    try {
      setError(null);
      const updatedTweet = updateTweet({ id, ...data });
      setTweets(prev =>
        prev.map(tweet =>
          tweet.id === id ? updatedTweet : tweet
        )
      );
      return updatedTweet;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update tweet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const removeExistingTweet = useCallback(async (id: string): Promise<void> => {
    try {
      setError(null);
      deleteTweet(id);
      setTweets(prev => prev.filter(tweet => tweet.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete tweet';
      setError(errorMessage);
      throw err;
    }
  }, []);

  useEffect(() => {
    // Initial load only - don't depend on refreshTweets to avoid circular updates
    const initialLoad = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const storedTweets = getTweets();
        setTweets(storedTweets);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load tweets';
        setError(errorMessage);
        console.error('Failed to refresh tweets:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initialLoad();
  }, []); // Empty dependency array for mount only

  const queuedTweets = tweets.filter(tweet => tweet.status === 'queued');
  const postedTweets = tweets.filter(tweet => tweet.status === 'posted');

  return {
    tweets,
    isLoading,
    error,
    addNewTweet,
    updateExistingTweet,
    removeExistingTweet,
    refreshTweets,
    queuedTweets,
    postedTweets,
  };
}
