'use client';
import * as React from 'react';
import { motion } from 'framer-motion';
import { duration, ease } from '@/lib/motion';

export function Tabs({
  tabs, value, onChange, layoutId = 'tabs-indicator',
}: {
  tabs: Array<{ value: string; label: string; count?: number }>;
  value: string;
  onChange: (v: string) => void;
  layoutId?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  return (
    <div role="tablist" aria-orientation="horizontal" className="flex gap-1 overflow-x-auto border-b border-edge-subtle">
      {tabs.map((t, idx) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => { refs.current[idx] = el; }}
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { const n = (idx + 1) % tabs.length; onChange(tabs[n]!.value); refs.current[n]?.focus(); }
              if (e.key === 'ArrowLeft') { const n = (idx - 1 + tabs.length) % tabs.length; onChange(tabs[n]!.value); refs.current[n]?.focus(); }
            }}
            className={
              'relative shrink-0 px-3 pb-2.5 pt-1.5 text-body-sm transition-colors duration-fast ' +
              (active ? 'text-ink font-[550]' : 'text-ink-secondary hover:text-ink')
            }
          >
            {t.label}
            {typeof t.count === 'number' && <span className="ml-1.5 tabular text-caption text-ink-tertiary">{t.count}</span>}
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-accent"
                transition={{ duration: duration.base, ease: ease.standard }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
