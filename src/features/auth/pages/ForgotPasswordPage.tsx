import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

import { AuthFrame } from '../components/AuthFrame';
import { authActions } from '../auth-actions';
import { emailSchema } from '../form-utils';
import { useAction } from '../useAction';

export default function ForgotPasswordPage() {
  const action = useAction();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = emailSchema.safeParse(email);

    if (!result.success) {
      setFieldError('Enter a valid email address.');
      const input = event.currentTarget.elements.namedItem('email');
      if (input instanceof HTMLElement) input.focus();
      return;
    }

    setFieldError('');

    void action.run(async () => {
      await authActions.requestPasswordReset(result.data);
      setSent(true);
    });
  }

  return (
    <AuthFrame
      title={sent ? 'Check your inbox.' : 'Reset your password.'}
      description={
        sent
          ? 'If an account exists for that address, a reset link will arrive shortly.'
          : 'We will send a secure link to your email.'
      }
      footer={<Link to="/login">Return to sign in</Link>}
    >
      {!sent && (
        <form className="auth-stack" noValidate onSubmit={submit}>
          <Input
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            required
            value={email}
            disabled={action.busy}
            error={fieldError}
            onChange={(event) => setEmail(event.target.value)}
          />

          {action.error && <p className="form-error" role="alert">{action.error}</p>}

          <Button type="submit" loading={action.busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
