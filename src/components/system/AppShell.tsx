'use client';
import * as React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { MotionSlideMenu } from '@/components/design/MotionSlideMenu';
import { AppDock } from '@/components/nav/AppDock';
import { SECONDARY_SLIDE_ITEMS } from '@/components/nav/secondarySlideMenu';
import { Sheet } from '@/components/ui/Sheet';
import { isImmersive } from '@/components/nav/navConfig';
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

  React.useEffect(() => {
    const stored = localStorage.getItem('averiq:low-power');
    if (stored === 'true') setLowPower(true);
  }, []);

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
        <div className="min-h-dvh w-full">
          <div
            className={cn(
              'app-main flex min-w-0 flex-1 flex-col',
              showNav && 'app-main--framed px-page-x pt-6 pb-28 lg:pt-10 lg:pr-10 lg:pb-10 lg:pl-28',
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              <PageTransition routeKey={pathname} lowPowerMode={lowPower}>
                {children}
              </PageTransition>
            </AnimatePresence>
          </div>
        </div>

        {showNav ? <AppDock onMore={() => setMoreOpen(true)} /> : null}

        <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <div className="pb-4">
            <MotionSlideMenu
              items={SECONDARY_SLIDE_ITEMS}
              className="motion-slide-menu--sheet"
              rootLabel="Averiq tools"
              onItemSelect={() => setMoreOpen(false)}
              maxHeight="min(70dvh, 34rem)"
            />
          </div>
        </Sheet>
      </Atmosphere>
    </LowPowerContext.Provider>
  );
}
