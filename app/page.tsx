'use client';

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { getUserSession } = await import('@/lib/storage');
        const session = await getUserSession();
        setIsAuthenticated(session?.isValid || false);
      } catch (error) {
        console.error('Failed to check auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
                <span className="text-3xl">🚀</span>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                Tweet Cannon
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Schedule and automate your Twitter posts with ease.
                Set it up once, and let it handle the rest.
              </p>
            </div>

            {/* Status Indicator */}
            <div className="mb-12">
              {isAuthenticated ? (
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Connected to Twitter
                </div>
              ) : (
                <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  Setup required
                </div>
              )}
            </div>

            {/* Main Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/simple-dashboard"
                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <span className="mr-2">📊</span>
                    Open Dashboard
                  </Link>
                  <Link
                    href="/tweet"
                    className="inline-flex items-center px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-xl hover:bg-gray-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 border border-gray-200"
                  >
                    <span className="mr-2">✍️</span>
                    Quick Tweet
                  </Link>
                </>
              ) : (
                <Link
                  href="/tweet"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  <span className="mr-2">🚀</span>
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⏰</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Scheduling</h3>
            <p className="text-gray-600">
              Set your posting schedule and let the app handle timing automatically
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy Queue Management</h3>
            <p className="text-gray-600">
              Write your tweets in advance and organize them in a simple queue
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure & Private</h3>
            <p className="text-gray-600">
              All data stays on your device. No servers, no data collection
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                © 2024 Tweet Cannon
              </span>
              <span className="text-sm text-gray-400">
                Simple Twitter automation
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/your-repo/tweet-cannon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                📚 GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
