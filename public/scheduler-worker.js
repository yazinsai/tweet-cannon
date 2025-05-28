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

function scheduleNextPost() {
  if (!schedulerState.isRunning || schedulerState.isPaused) {
    return;
  }

  // Clear any existing timeout
  if (schedulerState.currentTimeout) {
    clearTimeout(schedulerState.currentTimeout);
  }

  const nextPostTime = calculateNextPostTime(schedulerState.config);
  schedulerState.nextPostTime = nextPostTime;
  
  const delay = nextPostTime.getTime() - Date.now();
  
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
      
      // Notify main thread of successful post
      self.postMessage({
        type: 'TWEET_POSTED',
        payload: { tweetId: tweet.id, success: true }
      });
      
      return { success: true };
    } else {
      throw new Error(data.error || 'Failed to post tweet');
    }
  } catch (error) {
    log(`Failed to post tweet ${tweet.id}:`, error.message);
    schedulerState.stats.totalFailed++;
    schedulerState.stats.lastError = error.message;
    
    // Notify main thread of failed post
    self.postMessage({
      type: 'TWEET_POSTED',
      payload: { tweetId: tweet.id, success: false, error: error.message }
    });
    
    return { success: false, error: error.message };
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
      
      scheduleNextPost();
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
      
      scheduleNextPost();
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
  
  // Check if tweet is scheduled for the future
  if (nextTweet.scheduledFor) {
    const scheduledTime = new Date(nextTweet.scheduledFor);
    const now = new Date();
    
    if (scheduledTime > now) {
      log(`Tweet ${nextTweet.id} is scheduled for future: ${scheduledTime.toISOString()}`);
      scheduleNextPost();
      return;
    }
  }

  // Post the tweet
  const result = await postTweet(nextTweet, session);
  
  // Schedule next post regardless of success/failure
  scheduleNextPost();
}

// Initialize
log('Scheduler worker initialized');
self.postMessage({
  type: 'WORKER_READY',
  payload: { state: schedulerState }
});
