/**
 * Main exports for Tweet Cannon data layer
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Storage utilities
export * from './storage';

// Validation utilities
export * from './validation';

// Crypto utilities (selective exports for security)
export { isCryptoAvailable } from './crypto';

// Authentication utilities
export * from './auth';

// Twitter API utilities
export * from './twitter';

// Re-export commonly used functions for convenience
export {
  // Tweet operations
  getTweets,
  addTweet,
  updateTweet,
  deleteTweet,
  getTweet,

  // Config operations
  getPostingConfig,
  savePostingConfig,

  // Session operations
  getUserSession,
  saveUserSession,
  clearUserSession,

  // Utility operations
  getStorageStats,
  clearAllData,
  exportData,
  importData,
} from './storage';

export {
  // Validation functions
  validateTweetContent,
  validateTweet,
  validatePostingConfig,
  validateUserSession,
  validateCreateTweetData,
  validateUpdateTweetData,
} from './validation';
