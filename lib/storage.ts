/**
 * Local storage utilities for Tweet Cannon
 * Handles data persistence with encryption for sensitive data
 */

import {
  Tweet,
  PostingConfig,
  UserSession,
  StorageData,
  CreateTweetData,
  UpdateTweetData,
  DEFAULT_POSTING_CONFIG
} from './types';
import { STORAGE_KEYS, ERROR_MESSAGES, LIMITS } from './constants';
import {
  generateKey,
  exportKey,
  importKey,
  encryptData,
  decryptData,
  isCryptoAvailable
} from './crypto';
import {
  validateTweet,
  validatePostingConfig,
  validateUserSession,
  validateCreateTweetData,
  validateUpdateTweetData
} from './validation';

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create encryption key
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  if (!isCryptoAvailable()) {
    throw new Error('Web Crypto API not available');
  }

  const storedKey = localStorage.getItem(STORAGE_KEYS.ENCRYPTION_KEY);

  if (storedKey) {
    try {
      const keyData = new Uint8Array(
        atob(storedKey)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      return await importKey(keyData.buffer);
    } catch (error) {
      console.warn('Failed to import stored key, generating new one');
    }
  }

  // Generate new key
  const key = await generateKey();
  const keyData = await exportKey(key);
  const keyString = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(keyData))));
  localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, keyString);

  return key;
}

/**
 * Safely parse JSON with error handling
 */
function safeJsonParse<T>(data: string | null, fallback: T): T {
  if (!data) return fallback;

  try {
    return JSON.parse(data);
  } catch {
    return fallback;
  }
}

/**
 * Convert date strings back to Date objects
 */
function reviveDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      const date = new Date(obj);
      return isNaN(date.getTime()) ? obj : date;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(reviveDates);
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = reviveDates(value);
    }
    return result;
  }

  return obj;
}

// Tweet Management Functions

/**
 * Get all tweets from storage
 */
export function getTweets(): Tweet[] {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const data = localStorage.getItem(STORAGE_KEYS.TWEETS);
  const tweets = safeJsonParse(data, []);
  return reviveDates(tweets);
}

/**
 * Save tweets to storage (with threading support)
 */
export function saveTweets(tweets: Tweet[], enableThreading: boolean = true): void {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  // Validate all tweets with threading support
  for (const tweet of tweets) {
    const validation = validateTweet(tweet, enableThreading);
    if (!validation.isValid) {
      throw new Error(`Invalid tweet: ${validation.errors.join(', ')}`);
    }
  }

  localStorage.setItem(STORAGE_KEYS.TWEETS, JSON.stringify(tweets));
}

/**
 * Add a new tweet to the queue (with threading support)
 */
export function addTweet(data: CreateTweetData, enableThreading: boolean = true): Tweet {
  const validation = validateCreateTweetData(data, enableThreading);
  if (!validation.isValid) {
    throw new Error(`Invalid tweet data: ${validation.errors.join(', ')}`);
  }

  const tweets = getTweets();

  if (tweets.length >= LIMITS.MAX_QUEUE_SIZE) {
    throw new Error(ERROR_MESSAGES.QUEUE_FULL);
  }

  const tweet: Tweet = {
    id: crypto.randomUUID(),
    content: data.content.trim(),
    status: 'queued',
    createdAt: new Date(),
    scheduledFor: data.scheduledFor,
  };

  tweets.push(tweet);
  saveTweets(tweets, enableThreading);

  return tweet;
}

/**
 * Update an existing tweet (with threading support)
 */
export function updateTweet(data: UpdateTweetData, enableThreading: boolean = true): Tweet {
  const validation = validateUpdateTweetData(data, enableThreading);
  if (!validation.isValid) {
    throw new Error(`Invalid update data: ${validation.errors.join(', ')}`);
  }

  const tweets = getTweets();
  const index = tweets.findIndex(t => t.id === data.id);

  if (index === -1) {
    throw new Error(ERROR_MESSAGES.TWEET_NOT_FOUND);
  }

  const tweet = tweets[index];

  // Update fields
  if (data.content !== undefined) tweet.content = data.content.trim();
  if (data.status !== undefined) tweet.status = data.status;
  if (data.scheduledFor !== undefined) tweet.scheduledFor = data.scheduledFor;
  if (data.error !== undefined) tweet.error = data.error;

  // Set postedAt if status changed to posted
  if (data.status === 'posted' && !tweet.postedAt) {
    tweet.postedAt = new Date();
  }

  tweets[index] = tweet;
  saveTweets(tweets, enableThreading);

  return tweet;
}

/**
 * Delete a tweet
 */
export function deleteTweet(id: string, enableThreading: boolean = true): boolean {
  const tweets = getTweets();
  const index = tweets.findIndex(t => t.id === id);

  if (index === -1) {
    return false;
  }

  tweets.splice(index, 1);
  saveTweets(tweets, enableThreading);

  return true;
}

/**
 * Get a specific tweet by ID
 */
export function getTweet(id: string): Tweet | null {
  const tweets = getTweets();
  return tweets.find(t => t.id === id) || null;
}

/**
 * Reorder tweets in the queue
 */
export function reorderTweets(fromIndex: number, toIndex: number): Tweet[] {
  const tweets = getTweets();

  if (fromIndex < 0 || fromIndex >= tweets.length || toIndex < 0 || toIndex >= tweets.length) {
    throw new Error('Invalid reorder indices');
  }

  // Remove the tweet from its current position
  const [movedTweet] = tweets.splice(fromIndex, 1);

  // Insert it at the new position
  tweets.splice(toIndex, 0, movedTweet);

  saveTweets(tweets);
  return tweets;
}

/**
 * Move a tweet to a specific position
 */
export function moveTweet(tweetId: string, newIndex: number): Tweet[] {
  const tweets = getTweets();
  const currentIndex = tweets.findIndex(t => t.id === tweetId);

  if (currentIndex === -1) {
    throw new Error(ERROR_MESSAGES.TWEET_NOT_FOUND);
  }

  if (newIndex < 0 || newIndex >= tweets.length) {
    throw new Error('Invalid target position');
  }

  return reorderTweets(currentIndex, newIndex);
}

/**
 * Bulk update tweet statuses
 */
export function bulkUpdateTweetStatus(tweetIds: string[], status: Tweet['status']): Tweet[] {
  const tweets = getTweets();
  let updated = false;

  tweets.forEach(tweet => {
    if (tweetIds.includes(tweet.id)) {
      tweet.status = status;
      if (status === 'posted' && !tweet.postedAt) {
        tweet.postedAt = new Date();
      }
      updated = true;
    }
  });

  if (updated) {
    saveTweets(tweets);
  }

  return tweets;
}

/**
 * Bulk delete tweets
 */
export function bulkDeleteTweets(tweetIds: string[]): boolean {
  const tweets = getTweets();
  const initialLength = tweets.length;

  const filteredTweets = tweets.filter(tweet => !tweetIds.includes(tweet.id));

  if (filteredTweets.length !== initialLength) {
    saveTweets(filteredTweets);
    return true;
  }

  return false;
}

// Configuration Management

/**
 * Get posting configuration
 */
export function getPostingConfig(): PostingConfig {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
  const config = safeJsonParse(data, DEFAULT_POSTING_CONFIG);
  return reviveDates(config);
}

/**
 * Save posting configuration
 */
export function savePostingConfig(config: PostingConfig): void {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const validation = validatePostingConfig(config);
  if (!validation.isValid) {
    throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
  }

  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

// Session Management (with encryption)

/**
 * Get user session (decrypted)
 */
export async function getUserSession(): Promise<UserSession | null> {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const encryptedData = localStorage.getItem(STORAGE_KEYS.SESSION);
  if (!encryptedData) {
    return null;
  }

  try {
    const key = await getEncryptionKey();
    const decryptedData = await decryptData(encryptedData, key);
    const session = safeJsonParse(decryptedData, null);
    return reviveDates(session);
  } catch (error) {
    console.error('Failed to decrypt session:', error);
    // Clear corrupted session data
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    return null;
  }
}

/**
 * Save user session (encrypted)
 */
export async function saveUserSession(session: UserSession): Promise<void> {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const validation = validateUserSession(session);
  if (!validation.isValid) {
    throw new Error(`Invalid session: ${validation.errors.join(', ')}`);
  }

  try {
    const key = await getEncryptionKey();
    const sessionData = JSON.stringify(session);
    const encryptedData = await encryptData(sessionData, key);
    localStorage.setItem(STORAGE_KEYS.SESSION, encryptedData);
  } catch (error) {
    console.error('Failed to encrypt session:', error);
    throw new Error(ERROR_MESSAGES.ENCRYPTION_FAILED);
  }
}

/**
 * Clear user session
 */
export function clearUserSession(): void {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

// Utility Functions

/**
 * Clear all application data
 */
export function clearAllData(): void {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Get storage usage statistics
 */
export function getStorageStats() {
  if (!isStorageAvailable()) {
    throw new Error(ERROR_MESSAGES.STORAGE_NOT_AVAILABLE);
  }

  const tweets = getTweets();
  const config = getPostingConfig();

  return {
    totalTweets: tweets.length,
    queuedTweets: tweets.filter(t => t.status === 'queued').length,
    postedTweets: tweets.filter(t => t.status === 'posted').length,
    failedTweets: tweets.filter(t => t.status === 'failed').length,
    postingEnabled: config.enabled,
    nextPostTime: config.nextPostTime,
  };
}

/**
 * Export all data for backup
 */
export async function exportData(): Promise<StorageData> {
  const tweets = getTweets();
  const config = getPostingConfig();
  const session = await getUserSession();

  return {
    tweets,
    config,
    session,
  };
}

/**
 * Import data from backup
 */
export async function importData(data: StorageData): Promise<void> {
  // Validate data structure
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }

  // Import tweets
  if (data.tweets && Array.isArray(data.tweets)) {
    saveTweets(data.tweets);
  }

  // Import config
  if (data.config) {
    savePostingConfig(data.config);
  }

  // Import session
  if (data.session) {
    await saveUserSession(data.session);
  }
}
