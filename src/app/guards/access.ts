export type Audience =
  | 'public'
  | 'onboarding'
  | 'app';

/**
 * Pure navigation policy.
 *
 * Client guards are never a replacement for
 * database RLS or server-side authorization.
 */
export function getRedirect(
  audience: Audience,
  authenticated: boolean,
  onboarded: boolean,
): string | null {
  if (audience === 'public') {
    if (!authenticated) {
      return null;
    }

    return onboarded
      ? '/app/dashboard'
      : '/onboarding';
  }

  if (!authenticated) {
    return '/login';
  }

  if (audience === 'onboarding') {
    return onboarded
      ? '/app/dashboard'
      : null;
  }

  return onboarded
    ? null
    : '/onboarding';
}
