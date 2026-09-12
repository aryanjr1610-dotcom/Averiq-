import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { BrandLoading } from '@/components/onboarding/Splash';

import { useAuth } from '../AuthProvider';
import { AuthFrame } from '../components/AuthFrame';
import { PasswordField } from '../components/PasswordField';

import { authActions } from '../auth-actions';
import { canResetPassword } from '../recovery';
import { useAction } from '../useAction';

import {
  fieldErrors,
  focusFirstError,
  resetSchema,
} from '../form-utils';

export default function ResetPasswordPage() {
  const { state, user } = useAuth();
  const navigate = useNavigate();
  const action = useAction();

  const [values, setValues] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] =
    useState<{ signedOut: boolean } | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = resetSchema.safeParse(values);

    if (!parsed.success) {
      const next = fieldErrors(parsed.error);
      setErrors(next);
      focusFirstError(event.currentTarget, next);
      return;
    }

    setErrors({});

    void action.run(async () => {
      const saved = await authActions.updateRecoveredPassword(
        parsed.data.password,
      );

      setValues({ password: '', confirmPassword: '' });
      setResult(saved);
    });
  }

  if (result) {
    return (
      <AuthFrame
        title="Password updated."
        description={
          result.signedOut
            ? 'Sign in using your new password.'
            : 'Your password changed, but we could not finish signing out your sessions.'
        }
      >
        {result.signedOut
          ? <Link className="button button--primary" to="/login">Sign in</Link>
          : (
            <Button
              loading={action.busy}
              onClick={() => {
                void action.run(async () => {
                  await authActions.signOutEverywhere();
                  navigate('/login', { replace: true });
                });
              }}
            >
              Retry sign out
            </Button>
          )}

        {action.error && <p className="form-error" role="alert">{action.error}</p>}
      </AuthFrame>
    );
  }

  if (state.status === 'loading') {
    return <BrandLoading message="Checking your reset link" />;
  }

  if (!user || !canResetPassword(user.id)) {
    return (
      <AuthFrame
        title="This reset link is unavailable."
        description="The link may have expired, already been used, or been opened without a valid recovery session."
      >
        <Link className="button button--primary" to="/forgot-password">
          Request a new link
        </Link>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Choose a new password."
      description="Use at least 10 characters."
    >
      <form className="auth-stack" noValidate onSubmit={submit}>
        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          required
          disabled={action.busy}
          value={values.password}
          error={errors.password}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }));
          }}
        />

        <PasswordField
          name="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          required
          disabled={action.busy}
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              confirmPassword: event.target.value,
            }));
          }}
        />

        {action.error && <p className="form-error" role="alert">{action.error}</p>}

        <Button type="submit" loading={action.busy}>
          Update password
        </Button>
      </form>
    </AuthFrame>
  );
}
