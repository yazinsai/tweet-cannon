/**
 * Tweet Cannon Scheduler Service
 * Manages the Web Worker for automated tweet posting
 */

import { PostingConfig, Tweet, UserSession } from './types';
import { getTweets, getUserSession, updateTweet } from './storage';

export interface SchedulerState {
  isRunning: boolean;
  isPaused: boolean;
  nextPostTime: Date | null;
  lastPostTime: Date | null;
  stats: {
    totalPosted: number;
    totalFailed: number;
    lastError: string | null;
  };
}

export interface SchedulerEvent {
  type: string;
  payload: any;
}

class SchedulerService {
  private worker: Worker | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private state: SchedulerState = {
    isRunning: false,
    isPaused: false,
    nextPostTime: null,
    lastPostTime: null,
    stats: {
      totalPosted: 0,
      totalFailed: 0,
      lastError: null,
    },
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadPersistedState();
      this.initializeWorker();
      this.setupPageLifecycleHandlers();
      this.setupRetryEventListener();
    }
  }

  private initializeWorker() {
    try {
      // Try to create worker with proper URL handling for different environments
      let workerUrl: string | URL;

      if (typeof window !== 'undefined') {
        // In browser environment, use the public path
        workerUrl = new URL('/scheduler-worker.js', window.location.origin).href;
      } else {
        // Fallback for SSR
        workerUrl = '/scheduler-worker.js';
      }

      this.worker = new Worker(workerUrl);
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      console.log('Scheduler worker initialized');
    } catch (error) {
      console.error('Failed to initialize scheduler worker:', error);
    }
  }

  private handleWorkerMessage(event: MessageEvent) {
    const { type, payload } = event.data;

    console.log(`[Scheduler] Received: ${type}`, payload);

    switch (type) {
      case 'WORKER_READY':
        this.updateState(payload.state);
        this.emit('ready', payload.state);
        break;

      case 'SCHEDULER_STARTED':
        this.updateState(payload.state);
        this.emit('started', payload.state);
        break;

      case 'SCHEDULER_STOPPED':
        this.updateState(payload.state);
        this.emit('stopped', payload.state);
        break;

      case 'SCHEDULER_PAUSED':
        this.updateState(payload.state);
        this.emit('paused', payload.state);
        break;

      case 'SCHEDULER_RESUMED':
        this.updateState(payload.state);
        this.emit('resumed', payload.state);
        break;

      case 'NEXT_POST_SCHEDULED':
        this.state.nextPostTime = new Date(payload.nextPostTime);
        this.emit('nextPostScheduled', { nextPostTime: this.state.nextPostTime });
        break;

      case 'REQUEST_QUEUE_DATA':
        this.handleQueueDataRequest();
        break;

      case 'TWEET_POSTED':
        this.handleTweetPosted(payload);
        break;

      case 'SCHEDULER_ERROR':
        this.state.stats.lastError = payload.error;
        this.emit('error', payload);
        break;

      case 'LOG':
        console.log(`[Worker] ${payload.message}`, payload.data);
        break;

      default:
        console.log(`[Scheduler] Unknown message type: ${type}`);
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    console.error('Scheduler worker error:', error);
    this.emit('error', { error: error.message });
  }

  private updateState(workerState: any) {
    this.state = {
      isRunning: workerState.isRunning,
      isPaused: workerState.isPaused,
      nextPostTime: workerState.nextPostTime ? new Date(workerState.nextPostTime) : null,
      lastPostTime: workerState.lastPostTime ? new Date(workerState.lastPostTime) : null,
      stats: workerState.stats,
    };

    // Save state whenever it changes
    this.saveState();
  }

  private async handleQueueDataRequest() {
    try {
      const tweets = getTweets();
      const session = await getUserSession();

      this.worker?.postMessage({
        type: 'QUEUE_DATA_RESPONSE',
        payload: { tweets, session }
      });
    } catch (error) {
      console.error('Failed to get queue data:', error);
      this.worker?.postMessage({
        type: 'QUEUE_DATA_RESPONSE',
        payload: { tweets: [], session: null }
      });
    }
  }

  private async handleTweetPosted(payload: { tweetId: string; success: boolean; error?: string }) {
    try {
      if (payload.success) {
        // Update tweet status to posted
        const updatedTweet = updateTweet({
          id: payload.tweetId,
          status: 'posted',
        });

        this.state.stats.totalPosted++;
        this.state.lastPostTime = new Date();

        this.emit('tweetPosted', { tweet: updatedTweet, success: true });
      } else {
        // Update tweet status to failed
        const updatedTweet = updateTweet({
          id: payload.tweetId,
          status: 'failed',
          error: payload.error,
        });

        this.state.stats.totalFailed++;
        this.state.stats.lastError = payload.error || 'Unknown error';

        this.emit('tweetPosted', { tweet: updatedTweet, success: false, error: payload.error });
      }
    } catch (error) {
      console.error('Failed to update tweet status:', error);
    }
  }

  // Public API
  start(config: PostingConfig) {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'START_SCHEDULER',
      payload: { config }
    });
  }

  stop() {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'STOP_SCHEDULER',
      payload: {}
    });
  }

  pause() {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'PAUSE_SCHEDULER',
      payload: {}
    });
  }

  resume() {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'RESUME_SCHEDULER',
      payload: {}
    });
  }

  updateConfig(config: PostingConfig) {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'UPDATE_CONFIG',
      payload: { config }
    });
  }

  getStatus() {
    if (!this.worker) {
      throw new Error('Scheduler worker not initialized');
    }

    this.worker.postMessage({
      type: 'GET_STATUS',
      payload: {}
    });
  }

  getState(): SchedulerState {
    return { ...this.state };
  }

  // Event system
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // State persistence
  private loadPersistedState() {
    try {
      const savedState = localStorage.getItem('scheduler_state');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        this.state = {
          ...this.state,
          ...parsed,
          nextPostTime: parsed.nextPostTime ? new Date(parsed.nextPostTime) : null,
          lastPostTime: parsed.lastPostTime ? new Date(parsed.lastPostTime) : null,
        };
        console.log('Loaded persisted scheduler state:', this.state);
      }
    } catch (error) {
      console.error('Failed to load persisted scheduler state:', error);
    }
  }

  private saveState() {
    try {
      localStorage.setItem('scheduler_state', JSON.stringify(this.state));
    } catch (error) {
      console.error('Failed to save scheduler state:', error);
    }
  }

  private setupPageLifecycleHandlers() {
    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.saveState();

      // If scheduler was running, save that info for auto-restart
      if (this.state.isRunning) {
        localStorage.setItem('scheduler_was_running', 'true');
        localStorage.setItem('scheduler_last_config', JSON.stringify(this.getLastConfig()));
      } else {
        localStorage.removeItem('scheduler_was_running');
      }
    });

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Page became visible - check if we should auto-restart
        this.handlePageVisible();
      }
    });

    // Auto-restart if scheduler was running before
    setTimeout(() => {
      this.checkAutoRestart();
    }, 1000);
  }

  private getLastConfig() {
    // Get the last used config from storage
    try {
      const { getPostingConfig } = require('./storage');
      return getPostingConfig();
    } catch (error) {
      return null;
    }
  }

  private handlePageVisible() {
    // Refresh state when page becomes visible
    this.emit('pageVisible', {});
  }

  private checkAutoRestart() {
    try {
      const wasRunning = localStorage.getItem('scheduler_was_running');
      const lastConfig = localStorage.getItem('scheduler_last_config');

      if (wasRunning === 'true' && lastConfig) {
        const config = JSON.parse(lastConfig);
        console.log('Auto-restarting scheduler with config:', config);

        // Show notification about auto-restart
        setTimeout(() => {
          this.emit('autoRestart', { config });
        }, 500);

        // Auto-restart the scheduler
        this.start(config);

        // Clean up the restart flags
        localStorage.removeItem('scheduler_was_running');
      }
    } catch (error) {
      console.error('Failed to auto-restart scheduler:', error);
    }
  }

  private setupRetryEventListener() {
    // Listen for retry events from the error handler
    window.addEventListener('tweetRetry', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { error } = customEvent.detail;
      console.log('Retry event received for error:', error.id);

      // Attempt to retry the tweet
      this.retryTweet(error);
    });
  }

  private async retryTweet(error: any) {
    try {
      // Get current session and tweet data
      const { getUserSession, getTweets } = require('./storage');
      const session = await getUserSession();
      const tweets = getTweets();

      // Find the tweet to retry
      const tweet = tweets.find((t: any) => t.id === error.tweetId);
      if (!tweet || !session) {
        console.error('Cannot retry: tweet or session not found');
        return;
      }

      // Post the tweet directly (bypass scheduler queue)
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
        // Success - resolve the error and update tweet status
        const { getErrorHandler } = require('./errorHandling');
        const { updateTweet } = require('./storage');

        getErrorHandler().resolveError(error.id);
        updateTweet({ id: tweet.id, status: 'posted' });

        // Emit success event
        this.emit('retrySuccess', { error, tweet });

        console.log('Retry successful for tweet:', tweet.id);
      } else {
        // Failed - record new error
        const { getErrorHandler } = require('./errorHandling');
        getErrorHandler().recordError(
          tweet.id,
          tweet.content,
          { message: data.error, code: data.code },
          response
        );

        // Emit failure event
        this.emit('retryFailed', { error, tweet, newError: data.error });

        console.error('Retry failed for tweet:', tweet.id, data.error);
      }
    } catch (retryError) {
      console.error('Error during retry:', retryError);
      this.emit('retryFailed', { error, retryError });
    }
  }

  // Cleanup
  destroy() {
    this.saveState();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.eventListeners.clear();
  }
}

// Singleton instance
let schedulerInstance: SchedulerService | null = null;

export function getScheduler(): SchedulerService {
  if (!schedulerInstance) {
    schedulerInstance = new SchedulerService();
  }
  return schedulerInstance;
}

export { SchedulerService };
