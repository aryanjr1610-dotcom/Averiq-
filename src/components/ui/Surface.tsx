'use client';
import * as React from 'react';
import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export type SurfaceKind =
  | 'base' | 'raised' | 'interactive' | 'floating' | 'modal' | 'reading' | 'immersive' | 'quiet';

const kinds: Record<SurfaceKind, string> = {
  base:        'bg-surface border border-line-subtle shadow-none',
  raised:      'bg-surface-raised border border-line-subtle shadow-e1',
  interactive: [
    'bg-surface-raised border border-line-subtle shadow-e1 cursor-pointer',
    'transition-[background-color,border-color,box-shadow,transform] duration-fast ease-standard',
    'hover:-translate-y-px hover:border-line hover:shadow-e2',
    'active:translate-y-0 active:scale-[0.995] active:shadow-e1',
    'motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100',
  ].join(' '),
  floating:    'glass border border-line shadow-e2',
  modal:       'bg-surface-overlay border border-line shadow-e3',
  reading:     'bg-surface-reading border border-line-subtle',
  immersive:   'bg-surface-immersive border-0',
  quiet:       'bg-transparent border border-line-subtle',
};

const radii: Record<SurfaceKind, string> = {
  base: 'rounded-lg', raised: 'rounded-lg', interactive: 'rounded-lg',
  floating: 'rounded-xl', modal: 'rounded-2xl', reading: 'rounded-xl', immersive: 'rounded-none',
  quiet: 'rounded-lg',
};

const pads: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6 lg:p-8',
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: SurfaceKind;
  variant?: string;
  as?: React.ElementType;
  padding?: 'none' | 'sm' | 'md' | 'lg' | string;
  to?: string;
}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(function Surface(
  { kind = 'base', variant, as: Tag = 'div', padding = 'md', className = '', ...rest }, ref
) {
  const effectiveKind = (variant as SurfaceKind) || (kind as SurfaceKind) || 'base';
  const kindClass = kinds[effectiveKind] || kinds.base;
  const radiusClass = radii[effectiveKind] || radii.base;
  const padClass = pads[padding] ?? (padding === 'none' ? '' : pads.md);

  return (
    <Tag
      ref={ref}
      className={cn(kindClass, radiusClass, padClass, className)}
      {...rest}
    />
  );
});

export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4 flex items-baseline justify-between gap-4', className)}>
      <h2 className="t-section">{title}</h2>
      {action}
    </div>
  );
}

// Backward compatibility alias for Card during migration
export type CardProps = SurfaceProps & {
  title?: string;
  description?: string;
  action?: React.ReactNode;
};

export function Card({
  title,
  description,
  action,
  children,
  className,
  kind = 'raised',
  ...props
}: CardProps) {
  return (
    <Surface kind={kind} className={className} {...props}>
      {(title || description || action) && (
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <div>
            {title && <h3 className="t-card-title">{title}</h3>}
            {description && <p className="t-body-sm text-content-secondary">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </Surface>
  );
}
