'use client';

import { useState, useEffect } from 'react';

export default function TweetPage() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [cookieString, setCookieString] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [isSetupMode, setIsSetupMode] = useState(true);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [showSuccess, setShowSuccess] = useState(false);

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
        setMessage('');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect to Twitter</h1>
            <p className="text-gray-600">
              Let's connect your Twitter account so you can start posting
            </p>
          </div>

          {/* Setup Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mx-auto mb-4">
                <span className="text-xl">🔐</span>
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
                Quick Setup
              </h2>
              <p className="text-center text-gray-600 text-sm">
                We need to connect to your Twitter account. Don't worry - everything stays on your device.
              </p>
            </div>

            {/* Simplified Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center">
                <span className="mr-2">📋</span>
                Follow these simple steps:
              </h3>

              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-blue-900 font-medium">Open Twitter in a new tab</p>
                    <p className="text-blue-700 text-sm">Make sure you're logged in to your account</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-blue-900 font-medium">Press F12 to open Developer Tools</p>
                    <p className="text-blue-700 text-sm">Go to Application → Cookies → x.com</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-blue-900 font-medium">Find and copy the "auth_token" value</p>
                    <p className="text-blue-700 text-sm">Paste it in the first field below</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-blue-900 font-medium">Go to Console tab and run: <code className="bg-blue-100 px-1 rounded text-xs">document.cookie</code></p>
                    <p className="text-blue-700 text-sm">Copy the output and paste it in the second field</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔑 Auth Token
                </label>
                <textarea
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Paste your auth_token value here..."
                  className="w-full h-20 px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🍪 Cookie String
                </label>
                <textarea
                  value={cookieString}
                  onChange={(e) => setCookieString(e.target.value)}
                  placeholder="Paste the output of document.cookie here..."
                  className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={extractAndValidateCookies}
                disabled={validationStatus === 'validating' || !cookieString.trim() || !authToken.trim()}
                className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
              >
                {validationStatus === 'validating' ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Connecting to Twitter...
                  </span>
                ) : (
                  '🚀 Connect Twitter Account'
                )}
              </button>

              {validationStatus === 'invalid' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">❌</span>
                    <p className="text-red-700 text-sm font-medium">
                      Connection failed. Please check your auth_token and try again.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Security Note */}
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center text-gray-600 text-sm">
                <span className="mr-2">🔒</span>
                <span>Your credentials are stored securely on your device and never sent to our servers.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tweet Cannon</h1>
          <p className="text-gray-600">
            What's on your mind today?
          </p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-xl">🚀</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">Tweet Posted Successfully!</h3>
                <p className="text-green-700">Your tweet has been posted to Twitter.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tweet Composer */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleTweetSubmit} className="space-y-6">
            <div>
              <label htmlFor="message" className="block text-lg font-semibold text-gray-900 mb-4">
                ✍️ Compose your tweet
              </label>
              <div className="relative">
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What's happening?"
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg resize-none"
                  rows={6}
                  maxLength={280}
                  required
                />
                <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                  <div className={`text-sm font-medium ${
                    message.length > 260 ? 'text-red-500' :
                    message.length > 240 ? 'text-yellow-500' :
                    'text-gray-500'
                  }`}>
                    {message.length}/280
                  </div>
                  {message.length > 260 && (
                    <span className="text-red-500">⚠️</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Posting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <span className="mr-2">🚀</span>
                    Post Now
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => window.location.href = '/simple-dashboard'}
                className="flex-1 bg-white text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 border-2 border-gray-200 font-semibold text-lg transition-colors"
              >
                <span className="flex items-center justify-center">
                  <span className="mr-2">📊</span>
                  Dashboard
                </span>
              </button>
            </div>
          </form>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <span className="mr-2">🔒</span>
                <span>Connected to Twitter</span>
              </div>
              <button
                onClick={resetSetup}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">💡</span>
            Quick Tips
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="mr-2">⏰</span>
              <span>Use the Dashboard to manage your tweet queue</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">📝</span>
              <span>Build a queue of tweets to post automatically</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🎯</span>
              <span>Keep tweets under 280 characters for best engagement</span>
            </div>
            <div className="flex items-start">
              <span className="mr-2">🔄</span>
              <span>Set up automated posting schedules</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
