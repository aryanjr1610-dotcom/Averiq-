'use client';
import * as React from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

export function PageHeader({
  title,
  description,
  backHref,
  action,
  actions,
  metadata,
  eyebrow,
  back,
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  action?: React.ReactNode;
  actions?: React.ReactNode;
  metadata?: React.ReactNode;
  eyebrow?: string;
  back?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}) {
  const finalAction = action || actions;

  return (
    <header
      className={cn(
        'mx-auto flex w-full max-w-content flex-col gap-2',
        'px-5 pt-6 pb-6 md:px-8',
        className,
      )}
    >
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1 inline-flex w-fit items-center gap-1 text-body-sm text-ink-secondary hover:text-ink transition-colors duration-fast"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          {back.label}
        </button>
      )}
      {backHref && !back && (
        <Link
          href={backHref}
          className="-ml-1 inline-flex w-fit items-center gap-1 text-body-sm text-ink-secondary hover:text-ink transition-colors duration-fast"
        >
          <ChevronLeft size={16} strokeWidth={1.75} aria-hidden />
          Back
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-overline mb-1">{eyebrow}</p>}
          <h1 className="text-page-title">{title}</h1>
          {description && <p className="text-body-sm mt-1 max-w-[62ch] text-ink-secondary">{description}</p>}
          {metadata && <div className="mt-2 text-label text-ink-secondary">{metadata}</div>}
        </div>
        {finalAction && <div className="shrink-0">{finalAction}</div>}
      </div>
    </header>
  );
}
