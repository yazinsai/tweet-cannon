/**
 * Tweet Cannon Error Handling System
 * Comprehensive error classification, retry logic, and recovery mechanisms
 */

export interface TweetError {
  id: string;
  tweetId: string;
  tweetContent: string;
  errorType: ErrorType;
  errorCode?: string;
  message: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  resolved: boolean;
  context?: {
    userAgent?: string;
    networkStatus?: string;
    authStatus?: string;
    rateLimitInfo?: any;
  };
}

export enum ErrorType {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  CONTENT_VIOLATION = 'content_violation',
  DUPLICATE = 'duplicate',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown',
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBase: number;
  enableAutoRetry: boolean;
  retryableErrors: ErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 300000, // 5 minutes
  exponentialBase: 2,
  enableAutoRetry: true,
  retryableErrors: [
    ErrorType.NETWORK,
    ErrorType.SERVER_ERROR,
    ErrorType.RATE_LIMIT,
  ],
};

class ErrorHandler {
  private errors: Map<string, TweetError> = new Map();
  private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadPersistedErrors();
  }

  /**
   * Classify an error based on the response and context
   */
  classifyError(error: any, response?: Response): ErrorType {
    // Network errors
    if (!response || error.name === 'TypeError' || error.message?.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    // HTTP status code classification
    if (response.status) {
      switch (response.status) {
        case 401:
        case 403:
          return ErrorType.AUTHENTICATION;
        case 429:
          return ErrorType.RATE_LIMIT;
        case 400:
          // Check for specific Twitter error codes
          if (error.message?.includes('duplicate') || error.code === 187) {
            return ErrorType.DUPLICATE;
          }
          if (error.message?.includes('violation') || error.code === 324) {
            return ErrorType.CONTENT_VIOLATION;
          }
          return ErrorType.UNKNOWN;
        case 500:
        case 502:
        case 503:
        case 504:
          return ErrorType.SERVER_ERROR;
        default:
          return ErrorType.UNKNOWN;
      }
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Record a new error
   */
  recordError(
    tweetId: string,
    tweetContent: string,
    error: any,
    response?: Response
  ): TweetError {
    const errorType = this.classifyError(error, response);
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    const tweetError: TweetError = {
      id: errorId,
      tweetId,
      tweetContent: tweetContent.substring(0, 100), // Truncate for storage
      errorType,
      errorCode: error.code || response?.status?.toString(),
      message: error.message || 'Unknown error occurred',
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: this.retryConfig.maxRetries,
      resolved: false,
      context: {
        userAgent: navigator?.userAgent,
        networkStatus: navigator?.onLine ? 'online' : 'offline',
        authStatus: 'unknown', // Will be updated by caller
        rateLimitInfo: this.extractRateLimitInfo(response),
      },
    };

    this.errors.set(errorId, tweetError);
    this.persistErrors();

    // Schedule auto-retry if enabled and error is retryable
    if (this.shouldAutoRetry(tweetError)) {
      this.scheduleRetry(tweetError);
    }

    return tweetError;
  }

  /**
   * Extract rate limit information from response headers
   */
  private extractRateLimitInfo(response?: Response): any {
    if (!response) return null;

    return {
      limit: response.headers.get('x-rate-limit-limit'),
      remaining: response.headers.get('x-rate-limit-remaining'),
      reset: response.headers.get('x-rate-limit-reset'),
      retryAfter: response.headers.get('retry-after'),
    };
  }

  /**
   * Check if an error should be automatically retried
   */
  private shouldAutoRetry(error: TweetError): boolean {
    return (
      this.retryConfig.enableAutoRetry &&
      error.retryCount < error.maxRetries &&
      this.retryConfig.retryableErrors.includes(error.errorType) &&
      !error.resolved
    );
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const delay = this.retryConfig.baseDelay * 
      Math.pow(this.retryConfig.exponentialBase, retryCount);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    
    return Math.min(delay + jitter, this.retryConfig.maxDelay);
  }

  /**
   * Schedule an automatic retry
   */
  private scheduleRetry(error: TweetError): void {
    const delay = this.calculateRetryDelay(error.retryCount);
    const nextRetryAt = new Date(Date.now() + delay);
    
    error.nextRetryAt = nextRetryAt;
    this.persistErrors();

    console.log(`Scheduling retry for error ${error.id} in ${Math.round(delay / 1000)} seconds`);

    const timeout = setTimeout(() => {
      this.executeRetry(error.id);
    }, delay);

    this.retryTimeouts.set(error.id, timeout);
  }

  /**
   * Execute a retry attempt
   */
  async executeRetry(errorId: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error || error.resolved) {
      return false;
    }

    error.retryCount++;
    error.nextRetryAt = undefined;
    this.persistErrors();

    try {
      // Emit retry event for external handling
      this.emitRetryEvent(error);
      return true;
    } catch (retryError) {
      console.error(`Retry failed for error ${errorId}:`, retryError);
      
      // Schedule next retry if attempts remaining
      if (this.shouldAutoRetry(error)) {
        this.scheduleRetry(error);
      }
      
      return false;
    }
  }

  /**
   * Manually retry an error
   */
  async manualRetry(errorId: string): Promise<boolean> {
    const error = this.errors.get(errorId);
    if (!error) {
      throw new Error(`Error ${errorId} not found`);
    }

    // Cancel any scheduled auto-retry
    const timeout = this.retryTimeouts.get(errorId);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(errorId);
    }

    return this.executeRetry(errorId);
  }

  /**
   * Mark an error as resolved
   */
  resolveError(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      error.nextRetryAt = undefined;
      this.persistErrors();

      // Cancel any pending retry
      const timeout = this.retryTimeouts.get(errorId);
      if (timeout) {
        clearTimeout(timeout);
        this.retryTimeouts.delete(errorId);
      }
    }
  }

  /**
   * Get all errors, optionally filtered
   */
  getErrors(filter?: {
    resolved?: boolean;
    errorType?: ErrorType;
    tweetId?: string;
  }): TweetError[] {
    let errors = Array.from(this.errors.values());

    if (filter) {
      if (filter.resolved !== undefined) {
        errors = errors.filter(e => e.resolved === filter.resolved);
      }
      if (filter.errorType) {
        errors = errors.filter(e => e.errorType === filter.errorType);
      }
      if (filter.tweetId) {
        errors = errors.filter(e => e.tweetId === filter.tweetId);
      }
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    resolved: number;
    pending: number;
    byType: Record<ErrorType, number>;
    retrySuccess: number;
  } {
    const errors = Array.from(this.errors.values());
    const byType = {} as Record<ErrorType, number>;

    // Initialize counts
    Object.values(ErrorType).forEach(type => {
      byType[type] = 0;
    });

    let retrySuccess = 0;

    errors.forEach(error => {
      byType[error.errorType]++;
      if (error.resolved && error.retryCount > 0) {
        retrySuccess++;
      }
    });

    return {
      total: errors.length,
      resolved: errors.filter(e => e.resolved).length,
      pending: errors.filter(e => !e.resolved).length,
      byType,
      retrySuccess,
    };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    this.persistRetryConfig();
  }

  /**
   * Clear resolved errors older than specified days
   */
  clearOldErrors(daysOld: number = 7): number {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    let cleared = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.resolved && error.timestamp < cutoff) {
        this.errors.delete(id);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.persistErrors();
    }

    return cleared;
  }

  /**
   * Emit retry event for external handling
   */
  private emitRetryEvent(error: TweetError): void {
    const event = new CustomEvent('tweetRetry', {
      detail: { error }
    });
    window.dispatchEvent(event);
  }

  /**
   * Persist errors to localStorage
   */
  private persistErrors(): void {
    try {
      const errorsArray = Array.from(this.errors.entries()).map(([id, error]) => [
        id,
        {
          ...error,
          timestamp: error.timestamp.toISOString(),
          nextRetryAt: error.nextRetryAt?.toISOString(),
        }
      ]);
      localStorage.setItem('tweet_cannon_errors', JSON.stringify(errorsArray));
    } catch (error) {
      console.error('Failed to persist errors:', error);
    }
  }

  /**
   * Load errors from localStorage
   */
  private loadPersistedErrors(): void {
    try {
      const stored = localStorage.getItem('tweet_cannon_errors');
      if (stored) {
        const errorsArray = JSON.parse(stored);
        this.errors = new Map(
          errorsArray.map(([id, error]: [string, any]) => [
            id,
            {
              ...error,
              timestamp: new Date(error.timestamp),
              nextRetryAt: error.nextRetryAt ? new Date(error.nextRetryAt) : undefined,
            }
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load persisted errors:', error);
    }
  }

  /**
   * Persist retry configuration
   */
  private persistRetryConfig(): void {
    try {
      localStorage.setItem('tweet_cannon_retry_config', JSON.stringify(this.retryConfig));
    } catch (error) {
      console.error('Failed to persist retry config:', error);
    }
  }
}

// Singleton instance
let errorHandlerInstance: ErrorHandler | null = null;

export function getErrorHandler(): ErrorHandler {
  if (!errorHandlerInstance) {
    errorHandlerInstance = new ErrorHandler();
  }
  return errorHandlerInstance;
}

export { ErrorHandler };
