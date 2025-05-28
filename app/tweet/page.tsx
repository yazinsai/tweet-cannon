'use client';

import { useState, useEffect } from 'react';

export default function TweetPage() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cookieString, setCookieString] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Check if we have saved session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { getUserSession } = await import('@/lib/storage');
        const session = await getUserSession();
        if (session && session.isValid) {
          setIsSetupMode(false);
        }
      } catch (error) {
        console.error('Failed to check session:', error);
      }
    };
    checkSession();
  }, []);

  const extractAndValidateCookies = async () => {
    if (!cookieString.trim()) {
      alert('Please paste your cookie string first!');
      return;
    }

    if (!authToken.trim()) {
      alert('Please paste your auth_token first!');
      return;
    }

    setValidationStatus('validating');

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
        // Save session using encrypted storage
        const { saveUserSession } = await import('@/lib/storage');
        const { UserSession } = await import('@/lib/types');

        const newSession = {
          cookies: fullCookieString,
          isValid: true,
          lastValidated: new Date(),
          username: data.username,
        };

        await saveUserSession(newSession);
        setValidationStatus('valid');
        setIsSetupMode(false);
        alert('✅ Cookies validated and saved! You can now post tweets.');
      } else {
        setValidationStatus('invalid');
        alert(`❌ Cookie validation failed: ${data.error || 'Invalid cookies'}`);
      }
    } catch (error) {
      setValidationStatus('invalid');
      alert('❌ Failed to validate cookies. Please try again.');
    }
  };

  const handleTweetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get saved session from encrypted storage
      const { getUserSession } = await import('@/lib/storage');
      const session = await getUserSession();

      if (!session || !session.isValid || !session.cookies) {
        alert('❌ No authentication cookies found. Please set up authentication first.');
        setIsSetupMode(true);
        return;
      }

      const response = await fetch('/api/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          cookies: session.cookies
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('🚀 Tweet posted successfully!');
        setMessage('');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Failed to post tweet');
    } finally {
      setIsLoading(false);
    }
  };

  const resetSetup = async () => {
    try {
      const { clearUserSession } = await import('@/lib/storage');
      clearUserSession();
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
    setIsSetupMode(true);
    setCookieString('');
    setAuthToken('');
    setValidationStatus('idle');
  };

  if (isSetupMode) {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-center mb-6">Tweet Cannon Setup 🚀</h1>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ One-time Setup Required</h3>
            <p className="text-yellow-700 text-sm">
              We need your Twitter cookies to post tweets. This is stored locally and never sent to our servers.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-3">📋 How to get your cookies:</h3>
              <p className="text-blue-700 text-sm mb-3">
                You need to collect <strong>two things</strong> from Twitter:
              </p>

              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">Step 1: Get auth_token (HttpOnly cookie)</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm ml-4">
                  <li>Open Twitter/X in a new tab and make sure you're logged in</li>
                  <li>Press F12 to open Developer Tools</li>
                  <li>Go to <strong>Application tab → Storage → Cookies → https://x.com</strong></li>
                  <li>Find the <code className="bg-blue-100 px-1 rounded">auth_token</code> cookie and copy its value</li>
                </ol>
              </div>

              <div>
                <h4 className="font-semibold text-blue-800 mb-2">Step 2: Get other cookies</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-700 text-sm ml-4">
                  <li>Go to <strong>Console tab</strong> in DevTools</li>
                  <li>Copy and paste this script:</li>
                </ol>
                <div className="bg-gray-800 text-green-400 p-3 rounded mt-2 text-sm font-mono">
                  <div className="text-gray-300 mb-1">// Copy this script:</div>
                  <div>document.cookie</div>
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  Copy the output and paste it in the second field below.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auth Token (from DevTools Application tab)
              </label>
              <textarea
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="Paste your auth_token value here..."
                className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cookie String (from Console document.cookie)
              </label>
              <textarea
                value={cookieString}
                onChange={(e) => setCookieString(e.target.value)}
                placeholder="Paste the output of document.cookie here..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
              />
            </div>

            <button
              onClick={extractAndValidateCookies}
              disabled={validationStatus === 'validating' || !cookieString.trim() || !authToken.trim()}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {validationStatus === 'validating' ? 'Validating with Twitter...' : 'Validate & Save Cookies'}
            </button>

            {validationStatus === 'invalid' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 text-sm">
                  ❌ Validation failed. Make sure you're logged into Twitter and copied the correct auth_token.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tweet Cannon 🚀</h1>
          <button
            onClick={resetSetup}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Reset Setup
          </button>
        </div>

        <form onSubmit={handleTweetSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              What's happening?
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your tweet..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              maxLength={280}
              required
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {message.length}/280
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !message.trim()}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Posting...' : 'Post Tweet'}
          </button>
        </form>
      </div>
    </div>
  );
}
