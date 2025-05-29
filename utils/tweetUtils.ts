/**
 * Utility functions for tweet operations
 */

import { Tweet, MediaAttachment } from '@/lib/types';

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
    posted: { label: 'Posted', color: 'green', icon: '✅' },
    failed: { label: 'Failed', color: 'red', icon: '❌' },
    'in-progress': { label: 'Posting...', color: 'yellow', icon: '🔄' },
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
  return tweet.status !== 'in-progress';
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
 * Get tweet character count info
 */
export function getCharacterCountInfo(content: string) {
  const length = content.length;
  const maxLength = 280;
  const remaining = maxLength - length;
  const isOverLimit = length > maxLength;
  const isNearLimit = remaining <= 20 && !isOverLimit;

  return {
    current: length,
    max: maxLength,
    remaining,
    isOverLimit,
    isNearLimit,
    percentage: (length / maxLength) * 100,
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
