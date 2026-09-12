'use client';
import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-2 px-1 text-label text-ink-tertiary">{title}</h2>
      <div className="overflow-hidden rounded-lg border border-edge-subtle bg-surface-1">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  description,
  control,
  onClick,
  first,
}: {
  label: string;
  description?: string;
  control?: React.ReactNode;
  onClick?: () => void;
  first?: boolean;
}) {
  const Tag: React.ElementType = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={cn(
        'flex w-full min-h-[56px] items-center gap-4 px-4 py-3 text-left',
        !first && 'border-t border-edge-subtle',
        onClick && 'transition-colors duration-fast hover:bg-surface-2 active:bg-surface-2',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-body text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-caption">{description}</span>}
      </span>
      {control ?? (onClick && <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-hidden />)}
    </Tag>
  );
}

/** Switch: knob on a spring, track colour on a duration. No bounce. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-10 shrink-0 rounded-full border transition-colors duration-base ease-standard',
        checked ? 'border-transparent bg-accent' : 'border-edge bg-surface-3',
      )}
    >
      <span
        className="absolute h-4 w-4 rounded-full bg-white shadow-1 transition-transform duration-base ease-standard"
        style={{ top: 3, transform: checked ? 'translateX(21px)' : 'translateX(3px)' }}
      />
    </button>
  );
}
