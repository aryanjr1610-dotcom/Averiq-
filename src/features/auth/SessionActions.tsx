import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

import { useToast } from '@/components/system/toast';

import { toAppError } from '@/lib/errors';

import { useAuth } from './AuthProvider';

export function SessionActions() {
  const {
    state,
    signOut,
  } = useAuth();

  const { notify } = useToast();

  const [busy, setBusy] = useState(false);

  if (
    state.status === 'loading' ||
    state.status === 'error'
  ) {
    return null;
  }

  if (state.status === 'unauthenticated') {
    return (
      <Link
        className="nav-link"
        to="/login"
      >
        Sign in
      </Link>
    );
  }

  const handleSignOut = async () => {
    setBusy(true);

    try {
      await signOut();

      notify(
        'You have signed out of this device.',
        'success',
      );
    } catch (error) {
      notify(
        toAppError(error).message,
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      loading={busy}
      onClick={() => {
        void handleSignOut();
      }}
    >
      Sign out
    </Button>
  );
}
