'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authenticateWithCookies, getCurrentSession, signOut } from '@/lib/auth';
import type { SessionInfo, UserSession } from '@/lib/types';

export default function AuthPage() {
  const [cookies, setCookies] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  // Load current session on mount
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const currentSession = await getCurrentSession();
      setSession(currentSession);
    } catch (err) {
      console.error('Failed to load session:', err);
    }
  };

  const handleAuthenticate = async () => {
    if (!cookies.trim()) {
      setError('Please enter your Twitter cookies');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await authenticateWithCookies(cookies);

      if (result.success) {
        setSuccess(`Successfully authenticated as @${result.data?.username}`);
        setCookies('');
        await loadSession();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Authentication error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setSession(null);
      setSuccess('Signed out successfully');
      setError(null);
    } catch (err) {
      setError('Failed to sign out');
      console.error('Sign out error:', err);
    }
  };

  const copyExtractorScript = () => {
    const script = `// Tweet Cannon Cookie Extractor - Copy and run this in Twitter's console
(function(){
  const cookies = document.cookie;
  const authToken = cookies.match(/auth_token=([^;]+)/)?.[1];
  const ct0 = cookies.match(/ct0=([^;]+)/)?.[1];
  
  if (authToken && ct0) {
    const result = JSON.stringify({ auth_token: authToken, ct0: ct0 }, null, 2);
    console.log('🚀 Tweet Cannon Cookies:');
    console.log(result);
    navigator.clipboard?.writeText(JSON.stringify({ auth_token: authToken, ct0: ct0 }));
    return result;
  } else {
    console.error('❌ Required cookies not found. Make sure you are logged into Twitter.');
    return null;
  }
})();`;

    navigator.clipboard.writeText(script).then(() => {
      setSuccess('Cookie extractor script copied to clipboard!');
    }).catch(() => {
      setError('Failed to copy script to clipboard');
    });
  };

  if (session && session.isValid) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-white border rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">Authentication Status</h1>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-green-600 mr-3">✅</div>
              <div>
                <h3 className="font-semibold text-green-800">Authenticated</h3>
                <p className="text-green-700">
                  Signed in as <strong>@{session.username}</strong>
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Last validated: {new Date(session.lastValidated).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mt-4">
              {success}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white border rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Twitter Authentication</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            To use Tweet Cannon, you need to provide your Twitter session cookies. 
            This allows the app to post tweets on your behalf.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">🔒 Security Note</h3>
            <p className="text-blue-700 text-sm">
              Your cookies are encrypted and stored locally in your browser. 
              They are never sent to any external servers except Twitter's official API.
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-6">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-3"
          >
            <span className="mr-2">{showInstructions ? '▼' : '▶'}</span>
            How to get your Twitter cookies
          </button>
          
          {showInstructions && (
            <div className="bg-gray-50 border rounded-lg p-4 mb-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Open <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twitter.com</a> and make sure you're logged in</li>
                <li>Open Developer Tools (F12 or right-click → Inspect)</li>
                <li>Go to the Console tab</li>
                <li>
                  <button
                    onClick={copyExtractorScript}
                    className="text-blue-600 hover:underline"
                  >
                    Click here to copy the cookie extractor script
                  </button>
                </li>
                <li>Paste the script in the console and press Enter</li>
                <li>Copy the output and paste it below</li>
              </ol>
            </div>
          )}
        </div>

        {/* Cookie Input */}
        <div className="mb-6">
          <label htmlFor="cookies" className="block text-sm font-medium text-gray-700 mb-2">
            Twitter Cookies (JSON format)
          </label>
          <textarea
            id="cookies"
            value={cookies}
            onChange={(e) => setCookies(e.target.value)}
            placeholder='{"auth_token":"your_auth_token","ct0":"your_ct0_token"}'
            className="w-full h-32 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            disabled={isLoading}
          />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={handleAuthenticate}
            disabled={isLoading || !cookies.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Validating...' : 'Authenticate'}
          </button>
          
          <Link
            href="/"
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
