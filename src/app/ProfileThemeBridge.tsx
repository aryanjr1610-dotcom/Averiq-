import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAcademicTheme } from './providers/AcademicThemeProvider';

import { useProfile } from '@/features/profile/ProfileProvider';
import { academicContextFromProfile } from '@/features/profile/academic-context';

export function ProfileThemeBridge() {
  const { pathname } = useLocation();
  const { setContext } = useAcademicTheme();
  const { profile } = useProfile();

  useEffect(() => {
    if (
      pathname === '/onboarding' ||
      pathname.startsWith('/dev/') ||
      pathname.startsWith('/app/learn/') ||
      pathname.startsWith('/app/visual-lab/')
    ) {
      return;
    }

    if (
      profile?.onboarding_completed &&
      (
        pathname.startsWith('/app') ||
        pathname === '/onboarding/complete'
      )
    ) {
      const context = academicContextFromProfile(profile);
      const page = pathname === '/app/focus' ? 'focus'
        : pathname.startsWith('/app/exams') ? 'exam'
        : pathname.startsWith('/app/anatomy') ? 'anatomy' : 'default';
      setContext({ ...context, page });
      return;
    }

    setContext({
      grade: 10,
      group: 'balanced',
      page: 'default',
    });
  }, [pathname, profile, setContext]);

  return null;
}
