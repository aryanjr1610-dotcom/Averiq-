'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { MotionSlideMenu } from '@/components/design/MotionSlideMenu';
import { SECONDARY_SLIDE_ITEMS } from './secondarySlideMenu';
import { PRIMARY_NAV } from './navConfig';
import { duration, ease } from '@/lib/motion';
import { cn } from '@/lib/cn';

export function DesktopSidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => setMoreOpen(false), [pathname]);

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
      <Link href="/app/dashboard" className="sky-nav-brand sky-nav-brand--living mb-6 px-2 text-card-title tracking-tight text-ink">
        <span className="sky-nav-brand__mark" aria-hidden="true">A</span>
        <span className="hidden min-w-0 xl:block">
          <span className="sky-nav-brand__name">Averiq</span>
          <span className="sky-nav-brand__subtitle">Learn beyond the page</span>
        </span>
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
                <motion.span
                  className="sky-nav-icon"
                  animate={active ? { y: -1, scale: 1.03 } : { y: 0, scale: 1 }}
                  transition={{ duration: duration.fast, ease: ease.standard }}
                >
                  <Icon size={18} strokeWidth={active ? 1.9 : 1.75} className="shrink-0" aria-hidden />
                </motion.span>
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto relative">
        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          className={cn(
            'sky-nav-item flex h-10 w-full items-center gap-3 rounded-md px-3',
            'text-body-sm text-ink-secondary',
            'hover:bg-surface-2 hover:text-ink',
            'transition-colors duration-base',
            moreOpen && 'sky-nav-item--active bg-surface-2 text-ink',
          )}
        >
          <span className="sky-nav-icon">
            <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="hidden xl:inline">Explore</span>
        </button>

        {moreOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.975 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.985 }}
            transition={{ duration: duration.base, ease: ease.out }}
            className={cn(
              'sky-nav-popover absolute bottom-14 left-0 w-[244px]',
              'rounded-xl border border-edge',
              'bg-surface-3 p-1.5 shadow-3',
            )}
          >
            <MotionSlideMenu
              items={SECONDARY_SLIDE_ITEMS}
              rootLabel="Averiq tools"
              onItemSelect={() => setMoreOpen(false)}
              maxHeight="min(66dvh, 32rem)"
            />
          </motion.div>
        )}
      </div>
    </nav>
  );
}
