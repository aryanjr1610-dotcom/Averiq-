'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { PRIMARY_NAV, SECONDARY_NAV } from './navConfig';
import { duration, ease } from '@/lib/motion';
import { cn } from '@/lib/cn';

export function DesktopSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sky-nav-shell sticky top-0 hidden h-dvh shrink-0 flex-col md:flex',
        'w-[72px] xl:w-[236px]',
        'border-r border-edge-subtle bg-canvas/80 backdrop-blur-xl',
        'px-3 py-5',
      )}
      style={{ zIndex: 40 }}
    >
      <Link href="/app/dashboard" className="sky-nav-brand mb-6 px-2 text-card-title tracking-tight text-ink">
        <span className="xl:hidden">A</span>
        <span className="hidden xl:inline">Averiq</span>
      </Link>

      <ul className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'sky-nav-item relative flex h-10 items-center gap-3 rounded-md px-3',
                  'text-body-sm transition-colors duration-base',
                  active
                    ? 'sky-nav-item--active bg-surface-2 text-ink font-[550]'
                    : 'text-ink-secondary hover:bg-surface-2 hover:text-ink',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="sky-nav-indicator absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-accent"
                    transition={{ duration: duration.base, ease: ease.standard }}
                  />
                )}
                <span className="sky-nav-icon">
                  <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden />
                </span>
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={cn(
            'sky-nav-item flex h-10 w-full items-center gap-3 rounded-md px-3',
            'text-body-sm text-ink-secondary',
            'hover:bg-surface-2 hover:text-ink',
            'transition-colors duration-base',
          )}
        >
          <span className="sky-nav-icon">
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="hidden xl:inline">More</span>
        </button>

        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className={cn(
              'sky-nav-popover absolute bottom-16 left-3 w-[220px]',
              'rounded-lg border border-edge',
              'bg-surface-3 p-2 shadow-3',
            )}
          >
            {SECONDARY_NAV.map((group) => (
              <div key={group.group} className="mb-2 last:mb-0">
                <p className="t-label px-2 py-1 text-ink-tertiary">{group.group}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="sky-nav-subitem flex h-9 items-center gap-2.5 rounded-sm px-2 text-body-sm text-ink-secondary hover:bg-surface-2 hover:text-ink"
                    >
                      <Icon size={16} strokeWidth={1.75} aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </nav>
  );
}
