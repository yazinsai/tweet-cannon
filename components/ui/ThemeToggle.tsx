'use client';

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className,
  showLabel = false,
  variant = 'button'
}) => {
  const { theme, setTheme, actualTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light' as const, label: 'Light', icon: '☀️' },
    { value: 'dark' as const, label: 'Dark', icon: '🌙' },
    { value: 'system' as const, label: 'System', icon: '💻' },
  ];

  const currentTheme = themes.find(t => t.value === theme) || themes[2];

  if (variant === 'dropdown') {
    return (
      <div className={cn('relative', className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg bg-card text-card-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label="Toggle theme"
        >
          <span className="text-lg">{currentTheme.icon}</span>
          {showLabel && <span className="text-sm font-medium">{currentTheme.label}</span>}
          <svg
            className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-20">
              <div className="py-1">
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.value}
                    onClick={() => {
                      setTheme(themeOption.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center space-x-3 px-4 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors',
                      theme === themeOption.value && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <span className="text-lg">{themeOption.icon}</span>
                    <span>{themeOption.label}</span>
                    {theme === themeOption.value && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Simple button variant - cycles through themes
  const handleToggle = () => {
    const currentIndex = themes.findIndex(t => t.value === theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex].value);
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'flex items-center space-x-2 p-2 rounded-lg bg-card text-card-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors',
        className
      )}
      aria-label={`Switch to ${themes[(themes.findIndex(t => t.value === theme) + 1) % themes.length].label.toLowerCase()} theme`}
      title={`Current: ${currentTheme.label} (${actualTheme})`}
    >
      <span className="text-lg">{currentTheme.icon}</span>
      {showLabel && <span className="text-sm font-medium">{currentTheme.label}</span>}
    </button>
  );
};
