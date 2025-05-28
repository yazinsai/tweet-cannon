'use client';

import React from 'react';
import { Navigation } from './Navigation';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  showNavigation?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  className,
  showNavigation = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavigation && <Navigation />}
      
      <main className={cn(
        'max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8',
        className
      )}>
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                © 2024 Tweet Cannon
              </span>
              <span className="text-sm text-gray-400">
                Automated Twitter posting made simple
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
              <a
                href="https://nextjs.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ⚡ Next.js
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { Layout };
