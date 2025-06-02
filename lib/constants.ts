/**
 * Constants for Tweet Cannon application
 */

// Local storage keys
export const STORAGE_KEYS = {
  TWEETS: 'tweet-cannon-tweets',
  CONFIG: 'tweet-cannon-config',
  SESSION: 'tweet-cannon-session',
  ENCRYPTION_KEY: 'tweet-cannon-key',
  DRAFTS: 'tweet-cannon-drafts',
  THEME: 'tweet-cannon-theme',
} as const;

// Application limits
export const LIMITS = {
  MAX_TWEET_LENGTH: 280,
  MAX_QUEUE_SIZE: 1000,
  MIN_INTERVAL_HOURS: 1,
  MAX_INTERVAL_HOURS: 168, // 1 week
  MIN_RANDOM_WINDOW: 5, // 5 minutes
  MAX_RANDOM_WINDOW: 120, // 2 hours
  // Media limits
  MAX_MEDIA_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_MEDIA_COUNT: 4,
  SUPPORTED_MEDIA_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
} as const;

// Default values
export const DEFAULTS = {
  POSTING_INTERVAL: 24, // hours
  RANDOM_WINDOW: 30, // minutes
  SESSION_VALIDATION_INTERVAL: 3600000, // 1 hour in milliseconds
} as const;

// Error messages
export const ERROR_MESSAGES = {
  STORAGE_NOT_AVAILABLE: 'Local storage is not available',
  INVALID_TWEET_CONTENT: 'Tweet content is invalid',
  TWEET_TOO_LONG: `Tweet content exceeds ${LIMITS.MAX_TWEET_LENGTH} characters`,
  QUEUE_FULL: `Queue is full (maximum ${LIMITS.MAX_QUEUE_SIZE} tweets)`,
  INVALID_CONFIG: 'Posting configuration is invalid',
  ENCRYPTION_FAILED: 'Failed to encrypt data',
  DECRYPTION_FAILED: 'Failed to decrypt data',
  SESSION_INVALID: 'User session is invalid',
  TWEET_NOT_FOUND: 'Tweet not found',
  AUTH_REQUIRED: 'Authentication required',
  INVALID_COOKIES: 'Invalid or malformed cookies',
  COOKIES_EXPIRED: 'Session cookies have expired',
  VALIDATION_FAILED: 'Cookie validation failed',
  TWITTER_API_ERROR: 'Twitter API error',
  NETWORK_ERROR: 'Network connection error',
} as const;

// Encryption settings
export const CRYPTO_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
} as const;

// Tweet status display names
export const STATUS_LABELS = {
  queued: 'Queued',
  posting: 'Posting...',
  posted: 'Posted',
  failed: 'Failed',
} as const;

// Cadence display names
export const CADENCE_LABELS = {
  hourly: 'Every Hour',
  daily: 'Daily',
  custom: 'Custom Interval',
} as const;

// Twitter API constants
export const TWITTER_API = {
  BASE_URL: 'https://twitter.com',
  API_BASE_URL: 'https://api.twitter.com',
  GRAPHQL_URL: 'https://twitter.com/i/api/graphql',
  REQUIRED_COOKIES: ['ct0'], // ct0 is always required
  SESSION_COOKIES: ['auth_token', 'twid'], // Either auth_token or twid for session
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
} as const;

// Authentication constants
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  VALIDATION_INTERVAL: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;
