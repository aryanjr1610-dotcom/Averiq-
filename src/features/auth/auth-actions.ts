import { getSupabase } from '@/lib/supabase';
import { toAppError } from '@/lib/errors';

import {
  allowPasswordRecovery,
  canResetPassword,
  clearPasswordRecovery,
} from './recovery';

export class AuthFlowError extends Error {}

export function friendlyError(error: unknown): string {
  if (error instanceof AuthFlowError) {
    return error.message;
  }

  const record =
    typeof error === 'object' && error !== null
      ? error
      : {};

  const code =
    'code' in record && typeof record.code === 'string'
      ? record.code
      : '';

  const messages: Record<string, string> = {
    invalid_credentials: 'Incorrect email or password.',
    email_not_confirmed: 'Confirm your email before signing in.',
    user_already_exists: 'Try signing in or resetting your password.',
    email_exists: 'Try signing in or resetting your password.',
    weak_password: 'Choose a stronger password with at least 10 characters.',
    same_password: 'Choose a password different from your current password.',
    over_email_send_rate_limit: 'Please wait before requesting another email.',
    over_request_rate_limit: 'Too many attempts. Please wait and try again.',
    otp_expired: 'This link has expired. Request a new one.',
    flow_state_expired: 'This link has expired. Start the process again.',
    flow_state_not_found: 'This link could not be verified. Request a new one.',
    bad_code_verifier: 'Open this link in the browser where you started, or request a new link.',
    session_not_found: 'Your session has ended. Please sign in again.',
    session_expired: 'Your session has ended. Please sign in again.',
    '42501': 'Your session or permissions changed. Sign in again and retry.',
    '22023': 'Review your academic choices. The setup configuration may have changed.',
  };

  if (messages[code]) return messages[code];

  const mapped = toAppError(error);

  if (mapped.code === 'NETWORK_ERROR') {
    return mapped.message;
  }

  return 'We could not complete that request. Please try again.';
}

function callbackUrl() {
  return new URL('/auth/callback', window.location.origin).href;
}

export const authActions = {
  async signIn(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  },

  async signUp(name: string, email: string, password: string) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,

      options: {
        emailRedirectTo: callbackUrl(),
        data: {
          display_name: name,
        },
      },
    });

    if (error) throw error;

    // A null session means email confirmation may be required.
    return { authenticated: Boolean(data.session) };
  },

  async google() {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl(),
      },
    });

    if (error) throw error;
  },

  async resendVerification(email: string) {
    const { error } = await getSupabase().auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: callbackUrl(),
      },
    });

    if (error) throw error;
  },

  async requestPasswordReset(email: string) {
    const { error } = await getSupabase().auth.resetPasswordForEmail(
      email,
      { redirectTo: callbackUrl() },
    );

    if (error) throw error;
  },

  async signOutEverywhere() {
    const { error } = await getSupabase().auth.signOut({
      scope: 'global',
    });

    if (error) throw error;

    clearPasswordRecovery();
  },

  async updateRecoveredPassword(password: string) {
    const { data, error: sessionError } =
      await getSupabase().auth.getSession();

    if (sessionError) throw sessionError;

    if (
      !data.session ||
      !canResetPassword(data.session.user.id)
    ) {
      throw new AuthFlowError(
        'This reset session has expired. Request a new reset link.',
      );
    }

    const { error } = await getSupabase().auth.updateUser({
      password,
    });

    if (error) throw error;

    clearPasswordRecovery();

    try {
      await authActions.signOutEverywhere();
      return { signedOut: true };
    } catch {
      // The password is already changed. Do not falsely report failure.
      return { signedOut: false };
    }
  },
};

type CallbackResult = {
  recovery: boolean;
};

let callbackTask: Promise<CallbackResult> | null = null;

export function finishAuthCallback(): Promise<CallbackResult> {
  if (callbackTask) return callbackTask;

  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  const hasProviderError =
    url.searchParams.has('error') ||
    new URLSearchParams(url.hash.slice(1)).has('error');

  // Remove authentication material from the visible URL immediately.
  window.history.replaceState(
    window.history.state,
    '',
    '/auth/callback',
  );

  callbackTask = (async () => {
    if (hasProviderError) {
      throw new AuthFlowError(
        'Authentication was cancelled or could not be completed.',
      );
    }

    if (tokenHash && (type === 'email' || type === 'recovery')) {
      const { data, error } = await getSupabase().auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) throw error;

      if (!data.session) {
        throw new AuthFlowError(
          'This link did not create a valid session. Request a new link.',
        );
      }

      const recovery = type === 'recovery';

      if (recovery) {
        allowPasswordRecovery(data.session.user.id);
      }

      return { recovery };
    }

    if (code) {
      const { data, error } =
        await getSupabase().auth.exchangeCodeForSession(code);

      if (error) throw error;

      if (!data.session) {
        throw new AuthFlowError('A valid session could not be created.');
      }

      const recovery =
        ('redirectType' in data && data.redirectType === 'recovery') ||
        canResetPassword(data.session.user.id);

      if (recovery) {
        allowPasswordRecovery(data.session.user.id);
      }

      return { recovery };
    }

    throw new AuthFlowError(
      'This authentication link is invalid or incomplete. Request a new one.',
    );
  })();

  return callbackTask;
}
