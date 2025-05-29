'use client';

import React from 'react';
import Link from 'next/link';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  currentPage?: 'tweet' | 'simple-dashboard' | 'dashboard';
  className?: string;
}

export function AppHeader({
  title = 'Tweet Cannon',
  subtitle,
  showNavigation = false,
  currentPage,
  className = ''
}: AppHeaderProps) {
  const navigationLinks = [
    { href: '/simple-dashboard', label: 'Dashboard', icon: '📊', id: 'simple-dashboard' as const },
    { href: '/dashboard', label: 'Advanced', icon: '⚙️', id: 'dashboard' as const },
  ];

  return (
    <div className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>

          {showNavigation && (
            <nav className="flex space-x-4">
              {navigationLinks.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === link.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
