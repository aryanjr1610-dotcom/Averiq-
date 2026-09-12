import { Navigate } from 'react-router-dom';

import { ErrorState, PageSkeleton } from '@/components/system/States';

import { useAuth } from '../AuthProvider';
import { canResetPassword } from '../recovery';

import { useProfile } from '@/features/profile/ProfileProvider';

export default function AuthContinuePage() {
  const auth = useAuth();
  const profile = useProfile();

  if (auth.state.status === 'loading') return <PageSkeleton />;

  if (auth.state.status === 'error') {
    return <ErrorState message={auth.state.error.message} retry={auth.retry} />;
  }

  if (!auth.user) return <Navigate to="/login" replace />;

  if (canResetPassword(auth.user.id)) {
    return <Navigate to="/reset-password" replace />;
  }

  if (profile.status === 'loading' || profile.status === 'idle') {
    return <PageSkeleton />;
  }

  if (profile.status === 'error') {
    return (
      <ErrorState
        message={profile.message}
        retry={() => {
          void profile.refresh().catch(() => {});
        }}
      />
    );
  }

  return (
    <Navigate
      to={profile.profile?.onboarding_completed
        ? '/app/dashboard'
        : '/onboarding'}
      replace
    />
  );
}
