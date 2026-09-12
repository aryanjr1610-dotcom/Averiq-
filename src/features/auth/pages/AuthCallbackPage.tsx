import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { BrandLoading } from '@/components/onboarding/Splash';
import { ErrorState } from '@/components/system/States';

import {
  finishAuthCallback,
  friendlyError,
} from '../auth-actions';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void finishAuthCallback()
      .then((result) => {
        if (!active) return;

        navigate(
          result.recovery ? '/reset-password' : '/auth/continue',
          { replace: true },
        );
      })
      .catch((cause: unknown) => {
        if (active) setError(friendlyError(cause));
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  if (error) {
    return (
      <ErrorState
        title="We couldn't complete authentication."
        message={error}
        secondaryAction={
          <Link className="button button--primary" to="/login">
            Return to sign in
          </Link>
        }
      />
    );
  }

  return <BrandLoading message="Securely completing authentication" />;
}
