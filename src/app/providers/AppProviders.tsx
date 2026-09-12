import type { PropsWithChildren } from 'react';

import { MotionConfig } from 'framer-motion';
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip';

import { duration, ease } from '@/lib/motion';

import { ToastProvider } from '@/components/system/toast';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProfileProvider } from '@/features/profile/ProfileProvider';
import { AITutorProvider } from '@/features/ai/AITutorProvider';

import {
  AcademicThemeProvider,
  useAcademicTheme,
} from './AcademicThemeProvider';

function MotionPreferences({ children }: PropsWithChildren) {
  const { reducedMotion } = useAcademicTheme();

  return (
    <MotionConfig
      reducedMotion={reducedMotion ? 'always' : 'user'}
      transition={{
        duration: reducedMotion ? 0 : duration.base,
        ease: ease.standard,
      }}
    >
      {children}
    </MotionConfig>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AcademicThemeProvider>
      <MotionPreferences>
        <TooltipProvider delayDuration={500} skipDelayDuration={150}>
          <ToastProvider>
            <AuthProvider>
              <ProfileProvider>
                <AITutorProvider>{children}</AITutorProvider>
              </ProfileProvider>
            </AuthProvider>
          </ToastProvider>
        </TooltipProvider>
      </MotionPreferences>
    </AcademicThemeProvider>
  );
}
