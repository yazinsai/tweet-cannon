import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  characterCount?: {
    current: number;
    max: number;
    additional?: string;
    isThreaded?: boolean;
  };
  dragActive?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-muted-foreground">{helperText}</p>
        )}
      </div>
    );
  }
);

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, characterCount, dragActive, id, ...props }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substring(2)}`;

    return (
      <div className="space-y-2">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border bg-input text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            dragActive
              ? 'border-ring bg-accent'
              : 'border-border',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        <div className="flex justify-between items-center">
          <div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {helperText && !error && (
              <p className="text-sm text-muted-foreground">{helperText}</p>
            )}
          </div>
          {characterCount && (
            <div className="space-y-1">
              <p className={cn(
                'text-sm',
                characterCount.current > characterCount.max
                  ? 'text-red-600 dark:text-red-400'
                  : characterCount.current > characterCount.max * 0.9
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-muted-foreground'
              )}>
                {characterCount.isThreaded ? (
                  <span>
                    {characterCount.current}/{characterCount.max} (first part)
                  </span>
                ) : (
                  <span>{characterCount.current}/{characterCount.max}</span>
                )}
              </p>
              {characterCount.additional && (
                <p className="text-xs text-muted-foreground/70">
                  {characterCount.additional}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';
Textarea.displayName = 'Textarea';

export { Input, Textarea };
export type { InputProps, TextareaProps };
