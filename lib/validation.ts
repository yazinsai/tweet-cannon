/**
 * Data validation utilities for Tweet Cannon
 */

import { 
  Tweet, 
  PostingConfig, 
  UserSession, 
  ValidationResult,
  CreateTweetData,
  UpdateTweetData 
} from './types';
import { LIMITS, ERROR_MESSAGES } from './constants';

/**
 * Validate tweet content
 */
export function validateTweetContent(content: string): ValidationResult {
  const errors: string[] = [];
  
  if (!content || typeof content !== 'string') {
    errors.push(ERROR_MESSAGES.INVALID_TWEET_CONTENT);
  } else {
    if (content.trim().length === 0) {
      errors.push(ERROR_MESSAGES.INVALID_TWEET_CONTENT);
    }
    if (content.length > LIMITS.MAX_TWEET_LENGTH) {
      errors.push(ERROR_MESSAGES.TWEET_TOO_LONG);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate tweet object
 */
export function validateTweet(tweet: any): ValidationResult {
  const errors: string[] = [];
  
  if (!tweet || typeof tweet !== 'object') {
    errors.push('Tweet must be an object');
    return { isValid: false, errors };
  }
  
  // Validate required fields
  if (!tweet.id || typeof tweet.id !== 'string') {
    errors.push('Tweet ID is required and must be a string');
  }
  
  // Validate content
  const contentValidation = validateTweetContent(tweet.content);
  if (!contentValidation.isValid) {
    errors.push(...contentValidation.errors);
  }
  
  // Validate status
  const validStatuses = ['queued', 'posting', 'posted', 'failed'];
  if (!tweet.status || !validStatuses.includes(tweet.status)) {
    errors.push('Tweet status must be one of: ' + validStatuses.join(', '));
  }
  
  // Validate dates
  if (tweet.createdAt && !(tweet.createdAt instanceof Date) && isNaN(Date.parse(tweet.createdAt))) {
    errors.push('createdAt must be a valid date');
  }
  
  if (tweet.scheduledFor && !(tweet.scheduledFor instanceof Date) && isNaN(Date.parse(tweet.scheduledFor))) {
    errors.push('scheduledFor must be a valid date');
  }
  
  if (tweet.postedAt && !(tweet.postedAt instanceof Date) && isNaN(Date.parse(tweet.postedAt))) {
    errors.push('postedAt must be a valid date');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate posting configuration
 */
export function validatePostingConfig(config: any): ValidationResult {
  const errors: string[] = [];
  
  if (!config || typeof config !== 'object') {
    errors.push('Config must be an object');
    return { isValid: false, errors };
  }
  
  // Validate enabled flag
  if (typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  
  // Validate cadence
  const validCadences = ['hourly', 'daily', 'custom'];
  if (!config.cadence || !validCadences.includes(config.cadence)) {
    errors.push('cadence must be one of: ' + validCadences.join(', '));
  }
  
  // Validate interval
  if (typeof config.interval !== 'number' || config.interval < LIMITS.MIN_INTERVAL_HOURS || config.interval > LIMITS.MAX_INTERVAL_HOURS) {
    errors.push(`interval must be a number between ${LIMITS.MIN_INTERVAL_HOURS} and ${LIMITS.MAX_INTERVAL_HOURS} hours`);
  }
  
  // Validate random window
  if (typeof config.randomWindow !== 'number' || config.randomWindow < LIMITS.MIN_RANDOM_WINDOW || config.randomWindow > LIMITS.MAX_RANDOM_WINDOW) {
    errors.push(`randomWindow must be a number between ${LIMITS.MIN_RANDOM_WINDOW} and ${LIMITS.MAX_RANDOM_WINDOW} minutes`);
  }
  
  // Validate nextPostTime if present
  if (config.nextPostTime && !(config.nextPostTime instanceof Date) && isNaN(Date.parse(config.nextPostTime))) {
    errors.push('nextPostTime must be a valid date');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate user session
 */
export function validateUserSession(session: any): ValidationResult {
  const errors: string[] = [];
  
  if (!session || typeof session !== 'object') {
    errors.push('Session must be an object');
    return { isValid: false, errors };
  }
  
  // Validate cookies
  if (!session.cookies || typeof session.cookies !== 'string') {
    errors.push('cookies must be a non-empty string');
  }
  
  // Validate isValid flag
  if (typeof session.isValid !== 'boolean') {
    errors.push('isValid must be a boolean');
  }
  
  // Validate lastValidated
  if (!session.lastValidated || (!(session.lastValidated instanceof Date) && isNaN(Date.parse(session.lastValidated)))) {
    errors.push('lastValidated must be a valid date');
  }
  
  // Username is optional but must be string if present
  if (session.username && typeof session.username !== 'string') {
    errors.push('username must be a string if provided');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate create tweet data
 */
export function validateCreateTweetData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }
  
  // Validate content
  const contentValidation = validateTweetContent(data.content);
  if (!contentValidation.isValid) {
    errors.push(...contentValidation.errors);
  }
  
  // Validate scheduledFor if present
  if (data.scheduledFor && !(data.scheduledFor instanceof Date) && isNaN(Date.parse(data.scheduledFor))) {
    errors.push('scheduledFor must be a valid date');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate update tweet data
 */
export function validateUpdateTweetData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { isValid: false, errors };
  }
  
  // ID is required
  if (!data.id || typeof data.id !== 'string') {
    errors.push('ID is required and must be a string');
  }
  
  // Validate content if present
  if (data.content !== undefined) {
    const contentValidation = validateTweetContent(data.content);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
    }
  }
  
  // Validate status if present
  if (data.status !== undefined) {
    const validStatuses = ['queued', 'posting', 'posted', 'failed'];
    if (!validStatuses.includes(data.status)) {
      errors.push('status must be one of: ' + validStatuses.join(', '));
    }
  }
  
  // Validate dates if present
  if (data.scheduledFor && !(data.scheduledFor instanceof Date) && isNaN(Date.parse(data.scheduledFor))) {
    errors.push('scheduledFor must be a valid date');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
