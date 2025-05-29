/**
 * Media upload utilities for Tweet Cannon
 * Handles Twitter's 3-step media upload process (INIT, APPEND, FINALIZE)
 */

import { MediaAttachment, MediaUploadResponse, TwitterCookies, ApiResponse } from './types';
import { ERROR_MESSAGES } from './constants';
import { getAuthenticatedCookies } from './twitter';
import { parseCookies } from './auth';

// Media upload constants
export const MEDIA_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB for images
  SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  MAX_IMAGES: 4,
  MAX_DIMENSION: 4096,
} as const;

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file size
  if (file.size > MEDIA_LIMITS.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size too large. Maximum size is ${MEDIA_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`
    };
  }

  // Check file type
  if (!MEDIA_LIMITS.SUPPORTED_FORMATS.includes(file.type as any)) {
    return {
      isValid: false,
      error: `Unsupported file format. Supported formats: ${MEDIA_LIMITS.SUPPORTED_FORMATS.join(', ')}`
    };
  }

  return { isValid: true };
}

/**
 * Create image preview from file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to create preview'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate transaction ID for Twitter API
 */
function generateTransactionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < 100; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create headers for Twitter media upload
 */
function createMediaUploadHeaders(cookies: string): Record<string, string> {
  const parsedCookies = parseCookies(cookies);
  if (!parsedCookies) {
    throw new Error('Invalid cookies');
  }

  return {
    'accept': '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
    'content-type': 'application/x-www-form-urlencoded',
    'origin': 'https://x.com',
    'referer': 'https://x.com/',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'x-client-transaction-id': generateTransactionId(),
    'x-csrf-token': parsedCookies.ct0,
    'x-twitter-active-user': 'yes',
    'x-twitter-auth-type': 'OAuth2Session',
    'x-twitter-client-language': 'en',
    'Cookie': cookies
  };
}

/**
 * Step 1: Initialize media upload
 */
async function initMediaUpload(
  file: File,
  cookies: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  try {
    const headers = createMediaUploadHeaders(cookies);

    const params = new URLSearchParams({
      command: 'INIT',
      total_bytes: file.size.toString(),
      media_type: file.type,
      enable_1080p_variant: 'true',
      media_category: 'tweet_image'
    });

    const response = await fetch(`https://upload.x.com/i/media/upload.json?${params}`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Media upload INIT failed:', errorText);
      return {
        success: false,
        error: `Failed to initialize upload: ${response.status}`
      };
    }

    const result: MediaUploadResponse = await response.json();
    return {
      success: true,
      mediaId: result.media_id_string
    };
  } catch (error) {
    console.error('Media upload INIT error:', error);
    return {
      success: false,
      error: 'Network error during upload initialization'
    };
  }
}

/**
 * Step 2: Append media data
 */
async function appendMediaData(
  file: File,
  mediaId: string,
  cookies: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const headers = createMediaUploadHeaders(cookies);
    delete headers['content-type']; // Let browser set multipart boundary

    const formData = new FormData();
    formData.append('command', 'APPEND');
    formData.append('media_id', mediaId);
    formData.append('segment_index', '0');
    formData.append('media', file);

    const response = await fetch('https://upload.x.com/i/media/upload.json', {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Media upload APPEND failed:', errorText);
      return {
        success: false,
        error: `Failed to upload file data: ${response.status}`
      };
    }

    onProgress?.(100);
    return { success: true };
  } catch (error) {
    console.error('Media upload APPEND error:', error);
    return {
      success: false,
      error: 'Network error during file upload'
    };
  }
}

/**
 * Step 3: Finalize media upload
 */
async function finalizeMediaUpload(
  mediaId: string,
  cookies: string,
  originalMd5?: string
): Promise<{ success: boolean; mediaData?: MediaUploadResponse; error?: string }> {
  try {
    const headers = createMediaUploadHeaders(cookies);

    const params = new URLSearchParams({
      command: 'FINALIZE',
      media_id: mediaId
    });

    if (originalMd5) {
      params.append('original_md5', originalMd5);
    }

    const response = await fetch(`https://upload.x.com/i/media/upload.json?${params}`, {
      method: 'POST',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Media upload FINALIZE failed:', errorText);
      return {
        success: false,
        error: `Failed to finalize upload: ${response.status}`
      };
    }

    const result: MediaUploadResponse = await response.json();
    return {
      success: true,
      mediaData: result
    };
  } catch (error) {
    console.error('Media upload FINALIZE error:', error);
    return {
      success: false,
      error: 'Network error during upload finalization'
    };
  }
}

/**
 * Upload image to Twitter (complete 3-step process)
 */
export async function uploadImageToTwitter(
  file: File,
  cookies: string,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; mediaId?: string; mediaData?: MediaUploadResponse; error?: string }> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error
    };
  }

  onProgress?.(10);

  // Step 1: Initialize
  const initResult = await initMediaUpload(file, cookies);
  if (!initResult.success || !initResult.mediaId) {
    return {
      success: false,
      error: initResult.error || 'Failed to initialize upload'
    };
  }

  onProgress?.(30);

  // Step 2: Append data
  const appendResult = await appendMediaData(file, initResult.mediaId, cookies, (progress) => {
    onProgress?.(30 + (progress * 0.5)); // 30-80%
  });
  if (!appendResult.success) {
    return {
      success: false,
      error: appendResult.error || 'Failed to upload file data'
    };
  }

  onProgress?.(80);

  // Step 3: Finalize
  const finalizeResult = await finalizeMediaUpload(initResult.mediaId, cookies);
  if (!finalizeResult.success) {
    return {
      success: false,
      error: finalizeResult.error || 'Failed to finalize upload'
    };
  }

  onProgress?.(100);

  return {
    success: true,
    mediaId: initResult.mediaId,
    mediaData: finalizeResult.mediaData
  };
}

/**
 * Create MediaAttachment from file
 */
export async function createMediaAttachment(file: File): Promise<MediaAttachment> {
  const preview = await createImagePreview(file);

  return {
    id: crypto.randomUUID(),
    file,
    preview,
    uploadStatus: 'pending'
  };
}
