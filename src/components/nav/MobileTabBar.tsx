'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MOBILE_NAV, isImmersive } from './navConfig';
import { duration, ease } from '@/lib/motion';
import { cn } from '@/lib/cn';

export function MobileTabBar({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  if (isImmersive(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sky-mobile-nav fixed inset-x-0 bottom-0 md:hidden',
        'border-t border-edge-subtle',
        'bg-canvas/85 backdrop-blur-xl',
      )}
      style={{
        zIndex: 40,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="flex h-14 items-stretch">
        {MOBILE_NAV.map((item) => {
          const active = item.href !== '#more' && (pathname === item.href || pathname.startsWith(item.href + '/'));
          const Icon = item.icon;
          const inner = (
            <span className={cn('sky-mobile-tab relative flex h-full min-w-[44px] flex-1 flex-col items-center justify-center gap-1', active && 'sky-mobile-tab--active')}>
              {active && (
                <motion.span
                  layoutId="tab-indicator"
                  className="sky-mobile-indicator absolute top-0 h-[2px] w-8 rounded-full bg-accent"
                  transition={{ duration: duration.base, ease: ease.standard }}
                />
              )}
              <span className="sky-mobile-icon">
                <Icon
                  size={20}
                  strokeWidth={active ? 2 : 1.75}
                  className={active ? 'text-ink' : 'text-ink-secondary'}
                  aria-hidden
                />
              </span>
              <span
                className={cn(
                  'text-caption leading-none tracking-normal',
                  active ? 'text-ink font-[550]' : 'text-ink-secondary',
                )}
              >
                {item.label}
              </span>
            </span>
          );

          return (
            <li key={item.key} className="flex flex-1">
              {item.href === '#more' ? (
                <button type="button" onClick={onMore} className="flex flex-1 active:scale-[.97] transition-transform duration-instant">
                  {inner}
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className="flex flex-1 active:scale-[.97] transition-transform duration-instant"
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
