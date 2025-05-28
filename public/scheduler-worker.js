/**
 * Tweet Cannon Scheduler Web Worker
 * Handles background tweet posting with randomization
 */

let schedulerState = {
  isRunning: false,
  isPaused: false,
  currentTimeout: null,
  config: {
    enabled: false,
    cadence: 'daily',
    interval: 24, // hours
    randomWindow: 30, // minutes
  },
  lastPostTime: null,
  nextPostTime: null,
  stats: {
    totalPosted: 0,
    totalFailed: 0,
    lastError: null,
  }
};

// Utility functions
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[Scheduler Worker ${timestamp}] ${message}`, data || '');

  // Send log to main thread
  self.postMessage({
    type: 'LOG',
    payload: { message, data, timestamp }
  });
}

function calculateNextPostTime(config) {
  const now = new Date();
  const intervalMs = config.interval * 60 * 60 * 1000; // Convert hours to milliseconds

  // Add randomization (±randomWindow minutes)
  const randomMs = (Math.random() - 0.5) * 2 * config.randomWindow * 60 * 1000;

  const nextTime = new Date(now.getTime() + intervalMs + randomMs);

  log(`Next post calculated for: ${nextTime.toISOString()}`);
  return nextTime;
}

function scheduleNextPost(specificTime = null) {
  if (!schedulerState.isRunning || schedulerState.isPaused) {
    return;
  }

  // Clear any existing timeout
  if (schedulerState.currentTimeout) {
    clearTimeout(schedulerState.currentTimeout);
  }

  let nextPostTime;

  if (specificTime) {
    // Use the specific time provided (for scheduled tweets)
    nextPostTime = new Date(specificTime);
    log(`Scheduling specific post for: ${nextPostTime.toISOString()}`);
  } else {
    // Use the regular interval-based scheduling
    nextPostTime = calculateNextPostTime(schedulerState.config);
    log(`Scheduling next post based on interval: ${nextPostTime.toISOString()}`);
  }

  schedulerState.nextPostTime = nextPostTime;

  const delay = nextPostTime.getTime() - Date.now();

  // Ensure delay is not negative
  if (delay <= 0) {
    log('Scheduled time is in the past, posting immediately');
    processQueue();
    return;
  }

  log(`Scheduling next post in ${Math.round(delay / 1000 / 60)} minutes`);

  schedulerState.currentTimeout = setTimeout(() => {
    processQueue();
  }, delay);

  // Notify main thread of next post time
  self.postMessage({
    type: 'NEXT_POST_SCHEDULED',
    payload: { nextPostTime: nextPostTime.toISOString() }
  });
}

function checkForScheduledTweets() {
  if (!schedulerState.isRunning || schedulerState.isPaused) {
    return;
  }

  log('Checking for scheduled tweets...');

  // Request queue data to check for scheduled tweets
  self.postMessage({
    type: 'REQUEST_QUEUE_DATA',
    payload: {}
  });
}

async function processQueue() {
  if (!schedulerState.isRunning || schedulerState.isPaused) {
    return;
  }

  log('Processing tweet queue...');

  try {
    // Request queue data from main thread
    self.postMessage({
      type: 'REQUEST_QUEUE_DATA',
      payload: {}
    });

  } catch (error) {
    log('Error processing queue:', error.message);
    schedulerState.stats.lastError = error.message;
    schedulerState.stats.totalFailed++;

    // Notify main thread of error
    self.postMessage({
      type: 'SCHEDULER_ERROR',
      payload: { error: error.message }
    });

    // Schedule next attempt
    scheduleNextPost();
  }
}

async function postTweet(tweet, session) {
  log(`Posting tweet: ${tweet.id}`);

  try {
    // Since we're in a worker, we need to use fetch directly
    const response = await fetch('/api/tweet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: tweet.content,
        cookies: session.cookies,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      log(`Tweet posted successfully: ${tweet.id}`);
      schedulerState.stats.totalPosted++;
      schedulerState.lastPostTime = new Date();

      // Notify main thread of successful post with enhanced data
      self.postMessage({
        type: 'TWEET_POSTED',
        payload: {
          tweetId: tweet.id,
          success: true,
          tweet: {
            id: tweet.id,
            content: tweet.content
          }
        }
      });

      return { success: true };
    } else {
      // Enhanced error handling with classification
      const errorInfo = {
        message: data.error || 'Failed to post tweet',
        code: data.code || response.status.toString(),
        retryable: data.retryable || false,
        timestamp: data.timestamp || new Date().toISOString(),
        details: data.details
      };

      log(`Tweet failed with error: ${errorInfo.message} (Code: ${errorInfo.code})`);
      schedulerState.stats.totalFailed++;
      schedulerState.stats.lastError = errorInfo.message;

      // Notify main thread of failed post with detailed error info
      self.postMessage({
        type: 'TWEET_POSTED',
        payload: {
          tweetId: tweet.id,
          success: false,
          error: errorInfo.message,
          errorCode: errorInfo.code,
          retryable: errorInfo.retryable,
          tweet: {
            id: tweet.id,
            content: tweet.content
          }
        }
      });

      return { success: false, error: errorInfo };
    }
  } catch (error) {
    log(`Network error posting tweet ${tweet.id}:`, error.message);
    schedulerState.stats.totalFailed++;
    schedulerState.stats.lastError = error.message;

    // Network errors are typically retryable
    const errorInfo = {
      message: error.message || 'Network error occurred',
      code: 'NETWORK_ERROR',
      retryable: true,
      timestamp: new Date().toISOString()
    };

    // Notify main thread of failed post
    self.postMessage({
      type: 'TWEET_POSTED',
      payload: {
        tweetId: tweet.id,
        success: false,
        error: errorInfo.message,
        errorCode: errorInfo.code,
        retryable: errorInfo.retryable,
        tweet: {
          id: tweet.id,
          content: tweet.content
        }
      }
    });

    return { success: false, error: errorInfo };
  }
}

// Message handlers
self.onmessage = function(e) {
  const { type, payload } = e.data;

  switch (type) {
    case 'START_SCHEDULER':
      log('Starting scheduler...');
      schedulerState.isRunning = true;
      schedulerState.isPaused = false;
      schedulerState.config = payload.config;

      self.postMessage({
        type: 'SCHEDULER_STARTED',
        payload: { state: schedulerState }
      });

      // Check for scheduled tweets first, then fall back to interval
      checkForScheduledTweets();
      break;

    case 'STOP_SCHEDULER':
      log('Stopping scheduler...');
      schedulerState.isRunning = false;
      schedulerState.isPaused = false;

      if (schedulerState.currentTimeout) {
        clearTimeout(schedulerState.currentTimeout);
        schedulerState.currentTimeout = null;
      }

      self.postMessage({
        type: 'SCHEDULER_STOPPED',
        payload: { state: schedulerState }
      });
      break;

    case 'PAUSE_SCHEDULER':
      log('Pausing scheduler...');
      schedulerState.isPaused = true;

      if (schedulerState.currentTimeout) {
        clearTimeout(schedulerState.currentTimeout);
        schedulerState.currentTimeout = null;
      }

      self.postMessage({
        type: 'SCHEDULER_PAUSED',
        payload: { state: schedulerState }
      });
      break;

    case 'RESUME_SCHEDULER':
      log('Resuming scheduler...');
      schedulerState.isPaused = false;

      self.postMessage({
        type: 'SCHEDULER_RESUMED',
        payload: { state: schedulerState }
      });

      // Check for scheduled tweets first, then fall back to interval
      checkForScheduledTweets();
      break;

    case 'UPDATE_CONFIG':
      log('Updating scheduler config...');
      schedulerState.config = payload.config;

      // Reschedule if running
      if (schedulerState.isRunning && !schedulerState.isPaused) {
        scheduleNextPost();
      }
      break;

    case 'QUEUE_DATA_RESPONSE':
      // Handle queue data from main thread
      handleQueueData(payload.tweets, payload.session);
      break;

    case 'GET_STATUS':
      self.postMessage({
        type: 'SCHEDULER_STATUS',
        payload: { state: schedulerState }
      });
      break;

    default:
      log(`Unknown message type: ${type}`);
  }
};

async function handleQueueData(tweets, session) {
  if (!tweets || !session) {
    log('No tweets or session data available');
    scheduleNextPost();
    return;
  }

  // Find the next queued tweet
  const queuedTweets = tweets.filter(tweet => tweet.status === 'queued');

  if (queuedTweets.length === 0) {
    log('No queued tweets available');
    scheduleNextPost();
    return;
  }

  // Sort by creation date or scheduled time
  queuedTweets.sort((a, b) => {
    const aTime = a.scheduledFor ? new Date(a.scheduledFor) : new Date(a.createdAt);
    const bTime = b.scheduledFor ? new Date(b.scheduledFor) : new Date(b.createdAt);
    return aTime.getTime() - bTime.getTime();
  });

  const nextTweet = queuedTweets[0];
  const now = new Date();

  // Check if tweet is scheduled for the future
  if (nextTweet.scheduledFor) {
    const scheduledTime = new Date(nextTweet.scheduledFor);

    if (scheduledTime > now) {
      log(`Tweet ${nextTweet.id} is scheduled for future: ${scheduledTime.toISOString()}`);
      log(`Current time: ${now.toISOString()}`);
      log(`Will schedule specifically for the tweet's scheduled time`);

      // Schedule specifically for this tweet's time
      scheduleNextPost(scheduledTime);
      return;
    } else {
      log(`Tweet ${nextTweet.id} scheduled time has passed, posting now`);
    }
  }

  // Post the tweet (either not scheduled, or scheduled time has passed)
  const result = await postTweet(nextTweet, session);

  // After posting, check if there are more scheduled tweets
  const remainingQueuedTweets = tweets.filter(tweet =>
    tweet.status === 'queued' && tweet.id !== nextTweet.id
  );

  if (remainingQueuedTweets.length > 0) {
    // Sort remaining tweets to find the next one
    remainingQueuedTweets.sort((a, b) => {
      const aTime = a.scheduledFor ? new Date(a.scheduledFor) : new Date(a.createdAt);
      const bTime = b.scheduledFor ? new Date(b.scheduledFor) : new Date(b.createdAt);
      return aTime.getTime() - bTime.getTime();
    });

    const nextRemainingTweet = remainingQueuedTweets[0];

    if (nextRemainingTweet.scheduledFor) {
      const nextScheduledTime = new Date(nextRemainingTweet.scheduledFor);
      if (nextScheduledTime > now) {
        log(`Next tweet is scheduled for: ${nextScheduledTime.toISOString()}`);
        scheduleNextPost(nextScheduledTime);
        return;
      }
    }
  }

  // No specific scheduled tweets, use regular interval
  scheduleNextPost();
}

// Initialize
log('Scheduler worker initialized');
self.postMessage({
  type: 'WORKER_READY',
  payload: { state: schedulerState }
});
