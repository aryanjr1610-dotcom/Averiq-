import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { isDevelopment } from './env';

let reported = false;

export function DevHealthCheck() {
  const { state } = useAuth();

  useEffect(() => {
    if (
      !isDevelopment ||
      reported ||
      state.status === 'loading' ||
      state.status === 'error'
    ) {
      return;
    }

    reported = true;

    console.info(
      '[Averiq] Environment loaded; ' +
      'Supabase client configured; ' +
      'router mounted; ' +
      'application initialized. ' +
      'This is not a backend connectivity test.',
    );
  }, [state.status]);

  return null;
}
