/**
 * Authentication utilities for Tweet Cannon
 * Handles cookie validation, session management, and Twitter API authentication
 */

import {
  TwitterCookies,
  AuthValidationResult,
  UserSession,
  SessionInfo,
  ApiResponse
} from './types';
import {
  ERROR_MESSAGES,
  TWITTER_API,
  AUTH_CONFIG,
  DEFAULTS
} from './constants';
import {
  getUserSession,
  saveUserSession,
  clearUserSession
} from './storage';

/**
 * Parse cookie string into TwitterCookies object
 */
export function parseCookies(cookieString: string): TwitterCookies | null {
  if (!cookieString || typeof cookieString !== 'string') {
    console.error('Invalid cookie string:', cookieString);
    return null;
  }

  const trimmed = cookieString.trim();
  console.log('Parsing cookie string:', trimmed.substring(0, 100) + '...');

  try {
    // Try parsing as JSON first (from our extractor script)
    const parsed = JSON.parse(trimmed);
    console.log('JSON parsing successful:', Object.keys(parsed));

    // Check for required fields (ct0 and either auth_token or twid)
    if (parsed.ct0 && (parsed.auth_token || parsed.twid)) {
      console.log('JSON cookies valid:', {
        hasCt0: !!parsed.ct0,
        hasAuthToken: !!parsed.auth_token,
        hasTwid: !!parsed.twid
      });
      return parsed as TwitterCookies;
    }

    console.log('JSON missing required cookies:', {
      hasCt0: !!parsed.ct0,
      hasAuthToken: !!parsed.auth_token,
      hasTwid: !!parsed.twid
    });
    throw new Error('Missing required cookies in JSON');
  } catch (jsonError) {
    console.log('JSON parsing failed, trying string format:', (jsonError as Error).message);

    // Try parsing as cookie string format
    try {
      const cookies: any = {};
      const pairs = trimmed.split(';');
      console.log('Parsing as cookie string, found pairs:', pairs.length);

      for (const pair of pairs) {
        const [name, ...valueParts] = pair.trim().split('=');
        if (name && valueParts.length > 0) {
          // Join back in case the value contains '=' characters
          const value = valueParts.join('=');
          cookies[name] = value;
          console.log('Parsed cookie:', name, '=', value.substring(0, 20) + '...');
        }
      }

      console.log('String parsing result:', {
        totalCookies: Object.keys(cookies).length,
        hasCt0: !!cookies.ct0,
        hasAuthToken: !!cookies.auth_token,
        hasTwid: !!cookies.twid,
        cookieNames: Object.keys(cookies)
      });

      // Check for session token (auth_token or twid) and ct0
      const hasSessionToken = cookies.auth_token || cookies.twid;
      if (hasSessionToken && cookies.ct0) {
        console.log('String cookies valid');
        return cookies as TwitterCookies;
      }

      throw new Error('Missing required cookies in string format');
    } catch (stringError) {
      console.error('Both parsing methods failed:', {
        jsonError: (jsonError as Error).message,
        stringError: (stringError as Error).message
      });
      return null;
    }
  }
}

/**
 * Validate cookies format and required fields
 */
export function validateCookieFormat(cookies: any): cookies is TwitterCookies {
  if (!cookies || typeof cookies !== 'object') {
    console.log('Cookie validation failed: not an object', cookies);
    return false;
  }

  // Check for required ct0 token
  if (!cookies.ct0 || typeof cookies.ct0 !== 'string' || cookies.ct0.length === 0) {
    console.log('Cookie validation failed: missing or invalid ct0', {
      hasCt0: !!cookies.ct0,
      ct0Type: typeof cookies.ct0,
      ct0Length: cookies.ct0?.length
    });
    return false;
  }

  // Check for at least one session cookie (auth_token or twid)
  const hasSessionCookie = TWITTER_API.SESSION_COOKIES.some(field =>
    cookies[field] && typeof cookies[field] === 'string' && cookies[field].length > 0
  );

  if (!hasSessionCookie) {
    console.log('Cookie validation failed: no valid session cookie', {
      hasAuthToken: !!cookies.auth_token,
      hasTwid: !!cookies.twid,
      authTokenType: typeof cookies.auth_token,
      twidType: typeof cookies.twid
    });
    return false;
  }

  console.log('Cookie validation passed', {
    ct0Length: cookies.ct0.length,
    hasAuthToken: !!cookies.auth_token,
    hasTwid: !!cookies.twid
  });

  return true;
}

/**
 * Create headers for Twitter API requests
 */
export function createTwitterHeaders(cookies: TwitterCookies): HeadersInit {
  const cookieString = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  return {
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Authorization': `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
    'Content-Type': 'application/json',
    'Cookie': cookieString,
    'Referer': 'https://twitter.com/',
    'User-Agent': TWITTER_API.USER_AGENT,
    'X-Csrf-Token': cookies.ct0,
    'X-Twitter-Active-User': 'yes',
    'X-Twitter-Auth-Type': 'OAuth2Session',
    'X-Twitter-Client-Language': 'en',
  };
}

/**
 * Validate cookies by making a test API call through our server
 */
export async function validateTwitterCookies(cookies: TwitterCookies): Promise<AuthValidationResult> {
  try {
    if (!validateCookieFormat(cookies)) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.INVALID_COOKIES
      };
    }

    console.log('Validating cookies through API route...');

    // Use our API route to validate cookies (avoids CORS issues)
    const response = await fetch('/api/validate-cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cookies }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Cookie validation failed:', errorData);

      if (response.status === 401) {
        return {
          isValid: false,
          error: ERROR_MESSAGES.COOKIES_EXPIRED
        };
      }

      return {
        isValid: false,
        error: errorData.error || ERROR_MESSAGES.VALIDATION_FAILED
      };
    }

    const data = await response.json();

    if (data.valid && data.user) {
      console.log('Cookie validation successful:', data.user.username);
      return {
        isValid: true,
        username: data.user.username,
        expiresAt: new Date(Date.now() + AUTH_CONFIG.SESSION_TIMEOUT)
      };
    }

    return {
      isValid: false,
      error: ERROR_MESSAGES.VALIDATION_FAILED
    };

  } catch (error) {
    console.error('Cookie validation error:', error);
    return {
      isValid: false,
      error: ERROR_MESSAGES.NETWORK_ERROR
    };
  }
}

/**
 * Get current session info
 */
export async function getCurrentSession(): Promise<UserSession | null> {
  try {
    return await getUserSession();
  } catch (error) {
    console.error('Failed to get current session:', error);
    return null;
  }
}

/**
 * Check if current session is valid and not expired
 */
export async function isSessionValid(): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session || !session.isValid) {
    return false;
  }

  // Check if session has expired
  const now = new Date();
  const lastValidated = new Date(session.lastValidated);
  const timeSinceValidation = now.getTime() - lastValidated.getTime();

  // If it's been more than the validation interval, we should re-validate
  if (timeSinceValidation > AUTH_CONFIG.VALIDATION_INTERVAL) {
    return false;
  }

  return true;
}

/**
 * Authenticate user with cookies
 */
export async function authenticateWithCookies(cookieString: string): Promise<ApiResponse<SessionInfo>> {
  try {
    const cookies = parseCookies(cookieString);

    if (!cookies) {
      return {
        success: false,
        error: ERROR_MESSAGES.INVALID_COOKIES
      };
    }

    const validation = await validateTwitterCookies(cookies);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || ERROR_MESSAGES.VALIDATION_FAILED
      };
    }

    // Create and save session
    const session: UserSession = {
      cookies: JSON.stringify(cookies),
      isValid: true,
      lastValidated: new Date(),
      username: validation.username
    };

    await saveUserSession(session);

    return {
      success: true,
      data: {
        username: validation.username || 'Unknown',
        userId: undefined, // Will be populated later if needed
        isVerified: undefined,
        profileImageUrl: undefined
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: ERROR_MESSAGES.VALIDATION_FAILED
    };
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  try {
    clearUserSession();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

/**
 * Refresh session validation
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return false;
    }

    const cookies = parseCookies(session.cookies);

    if (!cookies) {
      await signOut();
      return false;
    }

    const validation = await validateTwitterCookies(cookies);

    if (!validation.isValid) {
      await signOut();
      return false;
    }

    // Update session with new validation time
    const updatedSession: UserSession = {
      ...session,
      isValid: true,
      lastValidated: new Date(),
      username: validation.username || session.username
    };

    await saveUserSession(updatedSession);
    return true;

  } catch (error) {
    console.error('Session refresh error:', error);
    await signOut();
    return false;
  }
}
