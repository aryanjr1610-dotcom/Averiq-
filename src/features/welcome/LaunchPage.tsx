import { useCallback, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthProvider';
import { ErrorState } from '@/components/system/States';
import { BrandLoading, Splash } from '@/components/onboarding/Splash';

const introKey = 'averiq:intro-seen:v1';

function hasSeenIntro() {
  try {
    return sessionStorage.getItem(introKey) === 'true';
  } catch {
    return false;
  }
}

export default function LaunchPage() {
  const { state, retry } = useAuth();
  const [seen, setSeen] = useState(hasSeenIntro);

  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(introKey, 'true');
    } catch {
      // The intro still ends if storage is unavailable.
    }

    setSeen(true);
  }, []);

  if (state.status === 'loading') {
    return <BrandLoading />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.error.message} retry={retry} />;
  }

  if (state.status === 'authenticated') {
    return <Navigate to="/auth/continue" replace />;
  }

  if (!seen) {
    return <Splash onComplete={finish} />;
  }

  return <Navigate to="/welcome" replace />;
}
