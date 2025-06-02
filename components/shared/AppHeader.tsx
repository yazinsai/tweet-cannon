'use client';

import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  currentPage?: 'tweet' | 'simple-dashboard' | 'dashboard';
  className?: string;
  queueCount?: number;
  onQueueClick?: () => void;
}

export function AppHeader({
  title = 'Tweet Cannon',
  subtitle,
  showNavigation = false,
  currentPage,
  className = '',
  queueCount = 0,
  onQueueClick
}: AppHeaderProps) {
  const navigationLinks = [
    { href: '/simple-dashboard', label: 'Dashboard', icon: '📊', id: 'simple-dashboard' as const },
    { href: '/dashboard', label: 'Advanced', icon: '⚙️', id: 'dashboard' as const },
  ];

  return (
    <div className={`bg-transparent ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle variant="button" />
            {/* Queue Indicator */}
            {currentPage === 'simple-dashboard' && onQueueClick && (
              <button
                onClick={onQueueClick}
                className="flex items-center p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100/50 transition-colors"
                title={`Queue (${queueCount} tweets)`}
              >
                <span className="text-lg">📋</span>
                {queueCount > 0 && (
                  <span className="ml-1 bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {queueCount}
                  </span>
                )}
              </button>
            )}

            {showNavigation && (
              <nav className="flex space-x-1">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={`p-2 rounded-full text-lg transition-colors ${
                      currentPage === link.id
                        ? 'text-blue-600 bg-blue-100/50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                    }`}
                    title={link.label}
                  >
                    {link.icon}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
