/**
 * Core data models for Tweet Cannon application
 * Based on the PRD specifications
 */

export interface Tweet {
  id: string;
  content: string;
  status: 'queued' | 'posting' | 'posted' | 'failed';
  createdAt: Date;
  scheduledFor?: Date;
  postedAt?: Date;
  error?: string;
  media?: MediaAttachment[];
}

// Media-related types for image uploads
export interface MediaAttachment {
  id: string;
  mediaId?: string; // Twitter media ID after upload
  file: File;
  preview: string; // Data URL for preview
  uploadStatus: 'pending' | 'uploading' | 'uploaded' | 'failed';
  uploadProgress?: number;
  error?: string;
}

export interface MediaUploadResponse {
  media_id: number;
  media_id_string: string;
  media_key: string;
  size?: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
  processing_info?: {
    state: 'pending' | 'in_progress' | 'succeeded' | 'failed';
    check_after_secs?: number;
    progress_percent?: number;
    error?: {
      code: number;
      name: string;
      message: string;
    };
  };
}

export interface PostingConfig {
  enabled: boolean;
  cadence: 'hourly' | 'daily' | 'custom';
  interval: number; // hours
  randomWindow: number; // minutes
  nextPostTime?: Date;
}

export interface UserSession {
  cookies: string;
  isValid: boolean;
  lastValidated: Date;
  username?: string;
}

// Additional utility types for better type safety
export type TweetStatus = Tweet['status'];
export type PostingCadence = PostingConfig['cadence'];

// Storage-related types
export interface StorageData {
  tweets: Tweet[];
  config: PostingConfig;
  session: UserSession | null;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Tweet creation/update types
export interface CreateTweetData {
  content: string;
  scheduledFor?: Date;
  media?: MediaAttachment[];
}

export interface UpdateTweetData {
  id: string;
  content?: string;
  status?: TweetStatus;
  scheduledFor?: Date;
  error?: string;
  media?: MediaAttachment[];
}

// Default configurations
export const DEFAULT_POSTING_CONFIG: PostingConfig = {
  enabled: false,
  cadence: 'daily',
  interval: 24, // 24 hours
  randomWindow: 30, // 30 minutes
};

// Validation schemas (for runtime validation)
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Authentication types
export interface TwitterCookies {
  ct0: string; // Always required
  auth_token?: string; // Legacy session token
  twid?: string; // New session token format
  [key: string]: string | undefined; // Allow additional cookies
}

export interface AuthValidationResult {
  isValid: boolean;
  username?: string;
  error?: string;
  expiresAt?: Date;
}

export interface SessionInfo {
  username: string;
  userId?: string;
  isVerified?: boolean;
  profileImageUrl?: string;
}

// Cookie extraction types
export interface CookieExtractionResult {
  success: boolean;
  cookies?: TwitterCookies;
  error?: string;
}
