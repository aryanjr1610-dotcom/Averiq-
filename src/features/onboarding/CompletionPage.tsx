import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

import { Surface } from '@/components/ui/Surface';
import { ErrorState, PageSkeleton } from '@/components/system/States';

import { useAuth } from '@/features/auth/AuthProvider';
import { useProfile } from '@/features/profile/ProfileProvider';
import { friendlyError } from '@/features/auth/auth-actions';

export default function CompletionPage() {
  const { state, user } = useAuth();
  const { profile, refresh } = useProfile();

  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setChecked(false);
    setError(null);

    void refresh()
      .then(() => {
        if (active) setChecked(true);
      })
      .catch((cause: unknown) => {
        if (active) setError(friendlyError(cause));
      });

    return () => {
      active = false;
    };
  }, [user?.id, user, refresh, attempt]);

  if (state.status === 'loading') return <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace />;

  if (error) {
    return (
      <ErrorState
        title="Your setup may already be saved."
        message={`We couldn't refresh your profile. ${error}`}
        retry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  if (!checked) return <PageSkeleton />;

  if (!profile?.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const context = [
    profile.board.toUpperCase(),
    `Class ${profile.class_level}`,
    profile.subject_combination?.toUpperCase() ?? '',
  ].filter(Boolean);

  return (
    <Surface className="completion-surface" variant="hero" padding="lg">
      <div className="auth-stack">
        <div className="flex items-center gap-2 text-success text-body-sm font-medium">
          <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden />
          <span>Academic profile saved</span>
        </div>

        <h1>You’re ready, {profile.display_name}. ✨</h1>

        <p className="text-secondary">
          Averiq is now shaped around your learning.
        </p>

        <div className="flex flex-wrap gap-2 text-label text-ink-secondary" aria-label="Study context">
          {context.map((item, index) => (
            <span key={`${item}-${index}`} className="rounded-xs border border-edge-subtle bg-surface-2 px-2.5 py-1">
              {item}
            </span>
          ))}
        </div>

        {profile.competitive_goals.length > 0 && (
          <p className="text-secondary">
            {profile.competitive_goals
              .map((goal) => goal.goal_key.toUpperCase())
              .join(' + ')}
            {' '}preparation
          </p>
        )}

        <Link className="button button--primary button--lg" to="/app/dashboard">
          Continue to Averiq
        </Link>

        <p className="type-caption">
          Your profile is saved. The full Dashboard arrives in its own phase.
        </p>
      </div>
    </Surface>
  );
}
