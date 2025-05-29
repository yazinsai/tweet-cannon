import React from 'react';
import { cn } from '@/lib/utils';
import { TweetStatus } from '@/lib/types';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: TweetStatus;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center rounded-full font-medium';

    const variants = {
      default: 'bg-slate-100 text-slate-800',
      success: 'bg-emerald-100 text-emerald-800',
      warning: 'bg-amber-100 text-amber-800',
      danger: 'bg-red-100 text-red-800',
      info: 'bg-slate-100 text-slate-800',
    };

    const sizes = {
      sm: 'px-2 py-1 text-xs',
      md: 'px-2.5 py-0.5 text-sm',
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, className, ...props }, ref) => {
    const statusConfig = {
      queued: {
        variant: 'default' as const,
        icon: '⏳',
        label: 'Queued',
      },
      posting: {
        variant: 'info' as const,
        icon: '🚀',
        label: 'Posting',
      },
      posted: {
        variant: 'success' as const,
        icon: '✅',
        label: 'Posted',
      },
      failed: {
        variant: 'danger' as const,
        icon: '❌',
        label: 'Failed',
      },
    };

    const config = statusConfig[status];

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        className={className}
        {...props}
      >
        <span className="mr-1">{config.icon}</span>
        {config.label}
      </Badge>
    );
  }
);

Badge.displayName = 'Badge';
StatusBadge.displayName = 'StatusBadge';

export { Badge, StatusBadge };
export type { BadgeProps, StatusBadgeProps };
