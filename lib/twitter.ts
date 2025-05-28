/**
 * Twitter API utilities for Tweet Cannon
 * Handles Twitter API interactions using session cookies
 */

import { TwitterCookies, ApiResponse } from './types';
import { ERROR_MESSAGES, TWITTER_API, AUTH_CONFIG } from './constants';
import { createTwitterHeaders, parseCookies } from './auth';
import { getCurrentSession } from './auth';

/**
 * Get authenticated Twitter cookies from current session
 */
export async function getAuthenticatedCookies(): Promise<TwitterCookies | null> {
  try {
    const session = await getCurrentSession();
    
    if (!session || !session.isValid) {
      return null;
    }
    
    return parseCookies(session.cookies);
  } catch (error) {
    console.error('Failed to get authenticated cookies:', error);
    return null;
  }
}

/**
 * Make authenticated request to Twitter API
 */
export async function makeTwitterRequest(
  url: string,
  options: RequestInit = {},
  cookies?: TwitterCookies
): Promise<Response> {
  const authCookies = cookies || await getAuthenticatedCookies();
  
  if (!authCookies) {
    throw new Error(ERROR_MESSAGES.AUTH_REQUIRED);
  }
  
  const headers = createTwitterHeaders(authCookies);
  
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include',
  };
  
  return fetch(url, requestOptions);
}

/**
 * Get user profile information
 */
export async function getUserProfile(username?: string): Promise<ApiResponse<any>> {
  try {
    const session = await getCurrentSession();
    const targetUsername = username || session?.username;
    
    if (!targetUsername) {
      return {
        success: false,
        error: 'Username not provided'
      };
    }
    
    const response = await makeTwitterRequest(
      `https://twitter.com/i/api/1.1/users/show.json?screen_name=${targetUsername}`
    );
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch user profile: ${response.status}`
      };
    }
    
    const userData = await response.json();
    
    return {
      success: true,
      data: {
        id: userData.id_str,
        username: userData.screen_name,
        displayName: userData.name,
        bio: userData.description,
        followersCount: userData.followers_count,
        followingCount: userData.friends_count,
        tweetCount: userData.statuses_count,
        isVerified: userData.verified,
        profileImageUrl: userData.profile_image_url_https,
        bannerUrl: userData.profile_banner_url,
        location: userData.location,
        website: userData.url,
        createdAt: userData.created_at
      }
    };
    
  } catch (error) {
    console.error('Get user profile error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.TWITTER_API_ERROR
    };
  }
}

/**
 * Verify account credentials (used for validation)
 */
export async function verifyCredentials(): Promise<ApiResponse<any>> {
  try {
    const response = await makeTwitterRequest(
      'https://twitter.com/i/api/1.1/account/verify_credentials.json'
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: ERROR_MESSAGES.COOKIES_EXPIRED
        };
      }
      
      return {
        success: false,
        error: `Verification failed: ${response.status}`
      };
    }
    
    const userData = await response.json();
    
    return {
      success: true,
      data: {
        id: userData.id_str,
        username: userData.screen_name,
        displayName: userData.name,
        isVerified: userData.verified,
        profileImageUrl: userData.profile_image_url_https
      }
    };
    
  } catch (error) {
    console.error('Verify credentials error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * Post a tweet (will be implemented in Task 5)
 */
export async function postTweet(content: string): Promise<ApiResponse<any>> {
  // This will be implemented in Task 5: Manual Tweet Posting
  return {
    success: false,
    error: 'Tweet posting not yet implemented'
  };
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(): Promise<ApiResponse<any>> {
  try {
    const response = await makeTwitterRequest(
      'https://twitter.com/i/api/1.1/application/rate_limit_status.json'
    );
    
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to get rate limit status: ${response.status}`
      };
    }
    
    const rateLimitData = await response.json();
    
    return {
      success: true,
      data: rateLimitData
    };
    
  } catch (error) {
    console.error('Get rate limit status error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.TWITTER_API_ERROR
    };
  }
}

/**
 * Test API connection
 */
export async function testConnection(): Promise<ApiResponse<boolean>> {
  try {
    const result = await verifyCredentials();
    return {
      success: result.success,
      data: result.success,
      error: result.error
    };
  } catch (error) {
    return {
      success: false,
      data: false,
      error: ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * Utility function to handle API errors consistently
 */
export function handleTwitterApiError(error: any, context: string): string {
  console.error(`Twitter API error in ${context}:`, error);
  
  if (error.message?.includes('401')) {
    return ERROR_MESSAGES.COOKIES_EXPIRED;
  }
  
  if (error.message?.includes('429')) {
    return 'Rate limit exceeded. Please try again later.';
  }
  
  if (error.message?.includes('403')) {
    return 'Access forbidden. Check your account permissions.';
  }
  
  if (error.message?.includes('network') || error.name === 'NetworkError') {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  
  return ERROR_MESSAGES.TWITTER_API_ERROR;
}
