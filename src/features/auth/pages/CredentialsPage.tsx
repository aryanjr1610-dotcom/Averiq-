import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';

import { AuthFrame } from '../components/AuthFrame';
import { PasswordField } from '../components/PasswordField';
import { VerificationNotice } from '../components/VerificationNotice';

import { authActions } from '../auth-actions';
import { useAction } from '../useAction';

import {
  fieldErrors,
  focusFirstError,
  signinSchema,
  signupSchema,
} from '../form-utils';

export default function CredentialsPage({
  mode,
}: {
  mode: 'login' | 'signup';
}) {
  const signup = mode === 'signup';
  const navigate = useNavigate();
  const action = useAction();

  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const result = (signup ? signupSchema : signinSchema).safeParse(values);

    if (!result.success) {
      const next = fieldErrors(result.error);
      setErrors(next);
      focusFirstError(form, next);
      return;
    }

    setErrors({});

    void action.run(async () => {
      if (signup) {
        const parsed = signupSchema.parse(values);

        const result = await authActions.signUp(
          parsed.name,
          parsed.email,
          parsed.password,
        );

        setValues((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
        }));

        if (!result.authenticated) {
          setVerificationEmail(parsed.email);
          return;
        }
      } else {
        const parsed = signinSchema.parse(values);
        await authActions.signIn(parsed.email, parsed.password);
      }

      navigate('/auth/continue', { replace: true });
    });
  }

  if (verificationEmail) {
    return (
      <AuthFrame
        title="Check your email"
        description="Confirm your address to continue."
      >
        <VerificationNotice email={verificationEmail} />
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title={signup ? 'Make room for deeper learning.' : 'Welcome back.'}
      description={
        signup
          ? 'Create your account. We will personalize your academic path next.'
          : 'Continue where your curiosity left off.'
      }
      footer={
        signup
          ? <p>Already have an account? <Link to="/login">Sign in</Link></p>
          : <p>New to Averiq? <Link to="/signup">Create an account</Link></p>
      }
    >
      <form className="auth-stack" noValidate onSubmit={submit}>
        {signup && (
          <Input
            name="name"
            label="Name"
            autoComplete="name"
            required
            maxLength={80}
            value={values.name}
            disabled={action.busy}
            error={errors.name}
            onChange={(event) => update('name', event.target.value)}
          />
        )}

        <Input
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          required
          value={values.email}
          disabled={action.busy}
          error={errors.email}
          onChange={(event) => update('email', event.target.value)}
        />

        <PasswordField
          name="password"
          label="Password"
          autoComplete={signup ? 'new-password' : 'current-password'}
          required
          value={values.password}
          disabled={action.busy}
          error={errors.password}
          description={signup ? 'Use at least 10 characters.' : undefined}
          onChange={(event) => update('password', event.target.value)}
        />

        {signup && (
          <PasswordField
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            required
            value={values.confirmPassword}
            disabled={action.busy}
            error={errors.confirmPassword}
            onChange={(event) => update('confirmPassword', event.target.value)}
          />
        )}

        {!signup && <Link to="/forgot-password">Forgot password?</Link>}

        {action.error && (
          <p className="form-error" role="alert">{action.error}</p>
        )}

        <Button type="submit" size="lg" loading={action.busy}>
          {signup ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <Divider />

      <Button
        variant="outline"
        disabled={action.busy}
        onClick={() => {
          void action.run(() => authActions.google());
        }}
      >
        Continue with Google
      </Button>
    </AuthFrame>
  );
}
