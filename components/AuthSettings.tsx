'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal, ModalContent, ModalFooter } from '@/components/ui/Modal';
import { getUserSession, saveUserSession, clearUserSession } from '@/lib/storage';
import { UserSession } from '@/lib/types';

interface AuthSettingsProps {
  onAuthUpdated?: (session: UserSession | null) => void;
  className?: string;
}

const AuthSettings: React.FC<AuthSettingsProps> = ({
  onAuthUpdated,
  className,
}) => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [cookieString, setCookieString] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Load current session
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      const currentSession = await getUserSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupAuth = () => {
    setIsSetupModalOpen(true);
    setCookieString('');
    setAuthToken('');
    setValidationError('');
  };

  const handleValidateAndSave = async () => {
    if (!cookieString.trim() || !authToken.trim()) {
      setValidationError('Please provide both auth token and cookie string');
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Combine auth_token with document.cookie
      const fullCookieString = `auth_token=${authToken.trim()}; ${cookieString.trim()}`;

      // Validate with Twitter API
      const response = await fetch('/api/validate-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: fullCookieString }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        // Create and save session
        const newSession: UserSession = {
          cookies: fullCookieString,
          isValid: true,
          lastValidated: new Date(),
          username: data.username,
        };

        await saveUserSession(newSession);
        setSession(newSession);
        setIsSetupModalOpen(false);
        onAuthUpdated?.(newSession);
      } else {
        setValidationError(data.error || 'Invalid cookies');
      }
    } catch (error) {
      setValidationError('Failed to validate cookies. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearAuth = async () => {
    try {
      clearUserSession();
      setSession(null);
      onAuthUpdated?.(null);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  };

  const handleRevalidate = async () => {
    if (!session) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/validate-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: session.cookies }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        const updatedSession: UserSession = {
          ...session,
          isValid: true,
          lastValidated: new Date(),
          username: data.username,
        };
        await saveUserSession(updatedSession);
        setSession(updatedSession);
        onAuthUpdated?.(updatedSession);
      } else {
        const invalidSession: UserSession = {
          ...session,
          isValid: false,
        };
        await saveUserSession(invalidSession);
        setSession(invalidSession);
        onAuthUpdated?.(invalidSession);
      }
    } catch (error) {
      console.error('Failed to revalidate session:', error);
    } finally {
      setIsValidating(false);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Authentication</span>
            <Badge variant={session?.isValid ? 'success' : 'danger'}>
              {session?.isValid ? '🟢 Connected' : session ? '🔴 Invalid' : '⚪ Not Set'}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {session ? (
            <>
              {/* Current Session Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Username:</span>
                  <span className="text-sm text-card-foreground">
                    {session.username || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Last Validated:</span>
                  <span className="text-sm text-card-foreground">
                    {session.lastValidated.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Status:</span>
                  <Badge
                    variant={session.isValid ? 'success' : 'danger'}
                    size="sm"
                  >
                    {session.isValid ? 'Valid' : 'Invalid'}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={handleRevalidate}
                  loading={isValidating}
                  className="flex-1"
                >
                  Revalidate
                </Button>
                <Button
                  variant="danger"
                  onClick={handleClearAuth}
                  className="flex-1"
                >
                  Clear Auth
                </Button>
              </div>

              {!session.isValid && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ⚠️ Your authentication is invalid. Please update your cookies.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleSetupAuth}
                    className="mt-2"
                  >
                    Update Cookies
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              {/* No Authentication */}
              <div className="text-center py-6">
                <div className="text-muted-foreground text-4xl mb-2">🔐</div>
                <p className="text-muted-foreground mb-4">
                  No authentication configured
                </p>
                <Button onClick={handleSetupAuth}>
                  Setup Authentication
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Modal */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        title="Setup Twitter Authentication"
        description="Configure your Twitter cookies for posting"
        size="lg"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">📋 How to get your cookies:</h3>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Step 1: Get auth_token</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400 text-sm ml-4">
                    <li>Open Twitter/X and make sure you're logged in</li>
                    <li>Press F12 → Application → Cookies → https://x.com</li>
                    <li>Find <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">auth_token</code> and copy its value</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Step 2: Get other cookies</h4>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400 text-sm ml-4">
                    <li>Go to Console tab in DevTools</li>
                    <li>Run: <code className="bg-gray-800 dark:bg-gray-200 text-green-400 dark:text-green-600 px-1 rounded">document.cookie</code></li>
                    <li>Copy the output</li>
                  </ol>
                </div>
              </div>
            </div>

            <Textarea
              label="Auth Token"
              placeholder="Paste your auth_token value here..."
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              rows={3}
            />

            <Textarea
              label="Cookie String"
              placeholder="Paste the output of document.cookie here..."
              value={cookieString}
              onChange={(e) => setCookieString(e.target.value)}
              rows={4}
            />

            {validationError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{validationError}</p>
              </div>
            )}
          </div>
        </ModalContent>
        
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setIsSetupModalOpen(false)}
            disabled={isValidating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleValidateAndSave}
            loading={isValidating}
            disabled={!cookieString.trim() || !authToken.trim()}
          >
            Validate & Save
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export { AuthSettings };
