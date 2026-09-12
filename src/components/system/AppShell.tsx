'use client';
import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { DesktopSidebar } from '@/components/nav/DesktopSidebar';
import { MobileTabBar } from '@/components/nav/MobileTabBar';
import { Sheet } from '@/components/ui/Sheet';
import { SECONDARY_NAV, isImmersive } from '@/components/nav/navConfig';
import { PageTransition } from '@/components/system/PageTransition';
import { cn } from '@/lib/cn';
import { Atmosphere } from '@/components/system/Atmosphere';
import type { Stream, Subject } from '@/components/system/Atmosphere';

const LowPowerContext = React.createContext(false);
export const useLowPower = () => React.useContext(LowPowerContext);

export function AppShell({
  children,
  stream,
  subject,
}: {
  children: React.ReactNode;
  stream?: Stream;
  subject?: Subject;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [lowPower, setLowPower] = React.useState(false);

  // respect the existing Reduced Visuals setting + battery saver hint
  React.useEffect(() => {
    const stored = localStorage.getItem('averiq:low-power');
    if (stored === 'true') setLowPower(true);
  }, []);

  // close the sheet on navigation — animate skill: exits must be handled
  React.useEffect(() => setMoreOpen(false), [pathname]);

  const immersive = isImmersive(pathname);
  const isProductRoute = pathname.startsWith('/app') || pathname.startsWith('/admin');
  const showNav = isProductRoute && !immersive;

  return (
    <LowPowerContext.Provider value={lowPower}>
      <Atmosphere
        stream={stream}
        subject={subject}
        surface={immersive ? 'immersive' : pathname.startsWith('/app/learn/') ? 'reading' : 'app'}
        lowPowerMode={lowPower}
      >
        <div className="flex min-h-dvh w-full">
          {showNav && <DesktopSidebar />}
          <div
            className={cn(
              'flex min-w-0 flex-1 flex-col',
              showNav && 'px-page-x pt-6 pb-24 md:pb-10 lg:pt-10',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition routeKey={pathname} lowPowerMode={lowPower}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </div>
        </div>

        {showNav && <MobileTabBar onMore={() => setMoreOpen(true)} />}

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="pb-4">
            {SECONDARY_NAV.map((group) => (
              <div key={group.group} className="mb-5 last:mb-0">
                <p className="text-label text-ink-tertiary mb-1.5">{group.group}</p>
                <div className="overflow-hidden rounded-lg border border-edge-subtle bg-surface-1">
                  {group.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={
                          'flex min-h-[52px] items-center gap-3 px-4 text-body active:bg-surface-2 ' +
                          (i > 0 ? 'border-t border-edge-subtle' : '')
                        }
                      >
                        <Icon size={18} strokeWidth={1.75} className="text-ink-secondary" aria-hidden />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Sheet>
      </Atmosphere>
    </LowPowerContext.Provider>
  );
}
