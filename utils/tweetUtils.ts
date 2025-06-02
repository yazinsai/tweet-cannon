/**
 * Utility functions for tweet operations
 */

import { Tweet, MediaAttachment } from '@/lib/types';
import { getThreadPreview } from './tweetThreading';

/**
 * Format tweet content for display
 */
export function formatTweetContent(content: string, maxLength: number = 100): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

/**
 * Get tweet status display info
 */
export function getTweetStatusInfo(tweet: Tweet) {
  const statusConfig = {
    queued: { label: 'Queued', color: 'blue', icon: '⏳' },
    posting: { label: 'Posting...', color: 'yellow', icon: '🔄' },
    posted: { label: 'Posted', color: 'green', icon: '✅' },
    failed: { label: 'Failed', color: 'red', icon: '❌' },
  };

  return statusConfig[tweet.status] || statusConfig.queued;
}

/**
 * Check if tweet can be edited
 */
export function canEditTweet(tweet: Tweet): boolean {
  return tweet.status === 'queued';
}

/**
 * Check if tweet can be deleted
 */
export function canDeleteTweet(tweet: Tweet): boolean {
  return tweet.status !== 'posting';
}

/**
 * Get tweet scheduling info
 */
export function getTweetSchedulingInfo(tweet: Tweet) {
  if (!tweet.scheduledFor) {
    return { isScheduled: false, displayText: 'Post immediately' };
  }

  const scheduledDate = new Date(tweet.scheduledFor);
  const now = new Date();
  const isOverdue = scheduledDate < now;

  return {
    isScheduled: true,
    isOverdue,
    scheduledDate,
    displayText: isOverdue
      ? `Overdue (${scheduledDate.toLocaleString()})`
      : `Scheduled for ${scheduledDate.toLocaleString()}`,
  };
}

/**
 * Validate tweet content
 */
export function validateTweetContent(content: string, media: MediaAttachment[] = []): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if content or media is provided
  if (!content.trim() && media.length === 0) {
    errors.push('Tweet must have content or media');
  }

  // Check content length
  if (content.length > 280) {
    errors.push('Tweet content exceeds 280 characters');
  }

  // Check media count
  if (media.length > 4) {
    errors.push('Maximum 4 images allowed per tweet');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get tweet character count info with threading support
 */
export function getCharacterCountInfo(content: string, enableThreading: boolean = true) {
  const length = content.length;
  const maxLength = 280;
  const remaining = maxLength - length;
  const isOverLimit = length > maxLength;
  const isNearLimit = remaining <= 20 && !isOverLimit;

  // Get thread info if content is long
  const threadInfo = enableThreading ? getThreadPreview(content, maxLength) : null;

  return {
    current: length,
    max: maxLength,
    remaining,
    isOverLimit: isOverLimit && !enableThreading,
    isNearLimit,
    percentage: (length / maxLength) * 100,
    // Threading info
    needsThreading: threadInfo?.needsThreading || false,
    threadParts: threadInfo?.partCount || 1,
    firstPartLength: threadInfo?.firstPart?.length || length,
    enableThreading
  };
}

/**
 * Get thread-aware validation for tweet content
 */
export function validateTweetContentWithThreading(
  content: string,
  media: MediaAttachment[] = [],
  enableThreading: boolean = true
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if content or media is provided
  if (!content.trim() && media.length === 0) {
    errors.push('Tweet must have content or media');
  }

  // Check content length with threading consideration
  if (content.length > 280) {
    if (enableThreading) {
      const threadInfo = getThreadPreview(content);
      warnings.push(`Long tweet will be split into ${threadInfo.partCount} parts`);

      // Validate that threading will work properly
      if (threadInfo.partCount > 25) { // Twitter's thread limit
        errors.push('Tweet is too long even for threading (max 25 parts)');
      }
    } else {
      errors.push('Tweet content exceeds 280 characters');
    }
  }

  // Check media count
  if (media.length > 4) {
    errors.push('Maximum 4 images allowed per tweet');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sort tweets by priority (scheduled first, then by creation date)
 */
export function sortTweetsByPriority(tweets: Tweet[]): Tweet[] {
  return [...tweets].sort((a, b) => {
    // Scheduled tweets first
    if (a.scheduledFor && !b.scheduledFor) return -1;
    if (!a.scheduledFor && b.scheduledFor) return 1;

    // If both scheduled, sort by scheduled time
    if (a.scheduledFor && b.scheduledFor) {
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime();
    }

    // Otherwise sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Filter tweets by status
 */
export function filterTweetsByStatus(tweets: Tweet[], status: Tweet['status']): Tweet[] {
  return tweets.filter(tweet => tweet.status === status);
}

/**
 * Get next scheduled tweet
 */
export function getNextScheduledTweet(tweets: Tweet[]): Tweet | null {
  const scheduledTweets = tweets
    .filter(tweet => tweet.status === 'queued' && tweet.scheduledFor)
    .sort((a, b) =>
      new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime()
    );

  return scheduledTweets[0] || null;
}
