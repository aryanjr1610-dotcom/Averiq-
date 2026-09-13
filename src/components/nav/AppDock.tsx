'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { Dock, DockIcon, DockItem, DockLabel } from '@/components/ui/dock';
import { MOBILE_NAV, PRIMARY_NAV, SECONDARY_NAV } from './navConfig';
import { cn } from '@/lib/cn';

function routeIsActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavDockItem({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: typeof MoreHorizontal;
}) {
  return (
    <DockItem
      className={cn(
        'border transition-colors duration-base',
        active
          ? 'border-accent/30 bg-surface-2 text-ink'
          : 'border-transparent bg-surface-2/40 text-ink-secondary hover:bg-surface-2 hover:text-ink',
      )}
    >
      <DockLabel>{label}</DockLabel>
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className="flex h-full w-full items-center justify-center rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <DockIcon>
          <Icon className="h-full w-full" strokeWidth={active ? 2 : 1.75} aria-hidden />
        </DockIcon>
      </Link>
    </DockItem>
  );
}

function MoreDockItem({ active, onMore }: { active: boolean; onMore: () => void }) {
  return (
    <DockItem
      className={cn(
        'border transition-colors duration-base',
        active
          ? 'border-accent/30 bg-surface-2 text-ink'
          : 'border-transparent bg-surface-2/40 text-ink-secondary hover:bg-surface-2 hover:text-ink',
      )}
    >
      <DockLabel>More</DockLabel>
      <button
        type="button"
        aria-label="More Averiq tools"
        aria-haspopup="dialog"
        onClick={onMore}
        className="flex h-full w-full items-center justify-center rounded-2xl p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <DockIcon>
          <MoreHorizontal className="h-full w-full" strokeWidth={active ? 2 : 1.75} aria-hidden />
        </DockIcon>
      </button>
    </DockItem>
  );
}

export function AppDock({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();
  const secondaryActive = SECONDARY_NAV.some((group) =>
    group.items.some((item) => routeIsActive(pathname, item.href)),
  );

  return (
    <>
      <div className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 lg:flex lg:flex-col lg:items-center">
        <Link
          href="/app/dashboard"
          aria-label="Averiq home"
          className="mb-3 flex size-11 items-center justify-center rounded-2xl border border-edge-subtle bg-surface-3/80 text-card-title font-semibold text-ink shadow-3 backdrop-blur-xl outline-none transition-transform duration-base hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-accent"
        >
          A
        </Link>

        <Dock
          orientation="vertical"
          panelSize={60}
          magnification={72}
          distance={132}
          aria-label="Averiq primary navigation"
        >
          {PRIMARY_NAV.map((item) => (
            <NavDockItem
              key={item.key}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={routeIsActive(pathname, item.href)}
            />
          ))}
          <MoreDockItem active={secondaryActive} onMore={onMore} />
        </Dock>
      </div>

      <div
        className="fixed left-1/2 z-40 w-max max-w-full -translate-x-1/2 px-3 lg:hidden"
        style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <Dock
          orientation="horizontal"
          panelSize={58}
          magnification={64}
          distance={104}
          className="gap-1"
          aria-label="Averiq primary navigation"
        >
          {MOBILE_NAV.map((item) => {
            if (item.href === '#more') {
              return <MoreDockItem key={item.key} active={secondaryActive} onMore={onMore} />;
            }

            return (
              <NavDockItem
                key={item.key}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={routeIsActive(pathname, item.href)}
              />
            );
          })}
        </Dock>
      </div>
    </>
  );
}
