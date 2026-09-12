import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/Button';

import { authActions } from '../auth-actions';
import { useAction } from '../useAction';

export function VerificationNotice({ email }: { email: string }) {
  const action = useAction();
  const [remaining, setRemaining] = useState(60);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (remaining <= 0) return;

    const timer = window.setTimeout(
      () => setRemaining((value) => value - 1),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [remaining]);

  return (
    <div className="auth-stack">
      <p>
        Check the inbox for <strong>{email}</strong>.
      </p>

      <p className="text-secondary">
        If this address can be registered, you will receive a confirmation
        link. If you already have an account, sign in or reset your password.
      </p>

      {resent && <p role="status">Another confirmation email was requested.</p>}
      {action.error && <p className="form-error" role="alert">{action.error}</p>}

      <Button
        variant="secondary"
        loading={action.busy}
        disabled={remaining > 0}
        onClick={() => {
          void action.run(async () => {
            await authActions.resendVerification(email);
            setRemaining(60);
            setResent(true);
          });
        }}
      >
        {remaining > 0 ? `Resend in ${remaining}s` : 'Resend confirmation'}
      </Button>

      <Link to="/login">Return to sign in</Link>
    </div>
  );
}
