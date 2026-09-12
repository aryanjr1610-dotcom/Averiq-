import { Suspense, useEffect } from 'react';
import { Outlet, useLocation, useSearchParams } from 'react-router-dom';

import { AppShell as SystemAppShell } from '@/components/system/AppShell';
import { PageSkeleton } from '@/components/system/States';
import type { Stream, Subject } from '@/components/system/Atmosphere';

import { AITutorLauncher, AITutorPanel } from '@/features/ai/AITutorPanel';
import { LessonSelectionAI } from '@/features/ai/LessonSelectionAI';
import { useAITutor } from '@/features/ai/AITutorProvider';

import { useAcademicTheme } from './providers/AcademicThemeProvider';
import { DevHealthCheck } from './config/DevHealthCheck';
import { RouteAccessibility } from './router/RouteAccessibility';
import { ProfileThemeBridge } from './ProfileThemeBridge';
import { GlobalSearchOverlay } from '@/features/search/GlobalSearch';
import { OfflineIndicator } from '@/features/offline/OfflineIndicator';

export function AppShell() {
  const location = useLocation();
  const { pathname } = location;
  const [searchParams] = useSearchParams();
  const tutor = useAITutor();
  const { setExamMode } = tutor;

  useEffect(() => {
    const isExamRun =
      location.pathname === '/app/practice/test' ||
      (/\w+\/test$/.test(location.pathname) && searchParams.get('mode') !== 'learn');
    setExamMode(isExamRun);
  }, [location.pathname, searchParams, setExamMode]);

  const launchRoute = pathname === '/';
  const appRoute = pathname.startsWith('/app') || pathname.startsWith('/admin');
  const immersive = pathname.startsWith('/app/visual-lab/') || pathname.startsWith('/app/anatomy/');
  const focused = pathname === '/app/focus' || pathname === '/app/practice/test' || /\/app\/exams\/[^/]+\/test$/.test(pathname);

  const { context } = useAcademicTheme();

  const stream = (context.stream as Stream) || 'foundation';
  const subject = (context.subjectId as Subject) || undefined;

  return (
    <div
      className="app-shell"
      data-launch={launchRoute}
      data-app={appRoute}
      data-immersive={immersive}
      data-focused={focused}
    >
      <SystemAppShell stream={stream} subject={subject}>
        <OfflineIndicator />
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
        <GlobalSearchOverlay />
      </SystemAppShell>

      <ProfileThemeBridge />
      <RouteAccessibility />
      <DevHealthCheck />
      <LessonSelectionAI />
      <AITutorPanel />
      {appRoute && !focused && <AITutorLauncher />}
    </div>
  );
}
