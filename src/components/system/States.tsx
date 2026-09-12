'use client';
import * as React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={style}
      className={cn('averiq-skeleton rounded-sm bg-surface-2', className)}
    />
  );
}

/** Reader skeleton: shaped like real content, not a spinner. */
export function ReaderSkeleton() {
  return (
    <div className="mx-auto w-full max-w-reading px-5 py-10" role="status" aria-label="Loading chapter">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/3" />
      <div className="mt-8 space-y-3">
        {[100, 96, 92, 98, 70].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
      <Skeleton className="mt-8 h-40 w-full rounded-lg" />
      <div className="mt-8 space-y-3">
        {[94, 99, 88].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-content px-5 py-6 md:px-8" role="status" aria-label="Loading dashboard">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-[196px] w-full rounded-xl" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[132px] rounded-lg" />
        <Skeleton className="h-[132px] rounded-lg" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return <DashboardSkeleton />;
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  body,
  description,
  action,
}: {
  icon?: React.ElementType<{ size?: number; strokeWidth?: number; className?: string }> | React.ReactNode;
  title: string;
  body?: string;
  description?: string;
  action?: React.ReactNode;
  heading?: 'h1' | 'h2' | 'h3';
}) {
  const text = body || description || '';
  const IconComp = Icon as React.ElementType<{ size?: number; strokeWidth?: number; className?: string }>;
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      {React.isValidElement(Icon) ? Icon : <IconComp size={24} strokeWidth={1.5} className="text-ink-tertiary" />}
      <h3 className="t-subsection">{title}</h3>
      {text && <p className="text-body-sm max-w-[42ch] text-ink-secondary">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'That didn’t load',
  body,
  message,
  onRetry,
  retry,
  fallback,
  secondaryAction,
}: {
  title?: string;
  body?: string;
  message?: string;
  onRetry?: () => void;
  retry?: () => void;
  fallback?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  heading?: 'h1' | 'h2' | 'h3';
}) {
  const text = body || message || 'The connection dropped before we could fetch this. Your progress is safe.';
  const handleRetry = onRetry || retry;

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-[46ch] flex-col items-center gap-3 px-6 py-16 text-center"
    >
      <h3 className="t-subsection">{title}</h3>
      <p className="text-body-sm text-ink-secondary">{text}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {handleRetry && (
          <Button variant="primary" size="sm" icon={<RefreshCw size={16} strokeWidth={1.75} />} onClick={handleRetry}>
            Try again
          </Button>
        )}
        {fallback || secondaryAction}
      </div>
    </div>
  );
}
