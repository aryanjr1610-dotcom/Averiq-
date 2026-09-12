import { Navigate, Outlet } from 'react-router-dom';

import { ErrorState, PageSkeleton } from '@/components/system/States';

import { useAuth } from '@/features/auth/AuthProvider';
import { canResetPassword } from '@/features/auth/recovery';
import { useProfile } from '@/features/profile/ProfileProvider';

import { getRedirect } from './access';
import type { Audience } from './access';

export function AccessGuard({
  audience,
}: {
  audience: Audience | 'session';
}) {
  const auth = useAuth();
  const profile = useProfile();

  if (auth.state.status === 'loading') return <PageSkeleton />;

  if (auth.state.status === 'error') {
    return (
      <ErrorState
        message={auth.state.error.message}
        retry={auth.retry}
      />
    );
  }

  if (!auth.user) {
    return audience === 'public'
      ? <Outlet />
      : <Navigate to="/login" replace />;
  }

  if (canResetPassword(auth.user.id)) {
    return <Navigate to="/reset-password" replace />;
  }

  if (audience === 'session') {
    return <Outlet />;
  }

  if (profile.status === 'loading' || profile.status === 'idle') {
    return <PageSkeleton />;
  }

  if (profile.status === 'error') {
    return (
      <ErrorState
        title="We couldn't load your academic profile."
        message={profile.message}
        retry={() => {
          void profile.refresh().catch(() => {});
        }}
      />
    );
  }

  const redirect = getRedirect(
    audience,
    true,
    Boolean(profile.profile?.onboarding_completed),
  );

  return redirect
    ? <Navigate to={redirect} replace />
    : <Outlet />;
}
