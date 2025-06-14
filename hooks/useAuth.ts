'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserSession } from '@/lib/types';
import { getUserSession, saveUserSession, clearUserSession } from '@/lib/storage';

interface UseAuthReturn {
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateSession: (session: UserSession) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentSession = await getUserSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Failed to check session:', error);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await clearUserSession();
      setSession(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }, []);

  const updateSession = useCallback(async (newSession: UserSession) => {
    try {
      await saveUserSession(newSession);
      setSession(newSession);
    } catch (error) {
      console.error('Failed to update session:', error);
      throw error;
    }
  }, []);

  useEffect(() => {
    // Initial session check - don't depend on checkSession to avoid circular updates
    const initialCheck = async () => {
      try {
        setIsLoading(true);
        const currentSession = await getUserSession();
        setSession(currentSession);
      } catch (error) {
        console.error('Failed to check session:', error);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initialCheck();
  }, []);

  return {
    session,
    isAuthenticated: session?.isValid || false,
    isLoading,
    checkSession,
    logout,
    updateSession,
  };
}
