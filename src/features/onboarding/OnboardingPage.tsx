import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import type { User } from '@supabase/supabase-js';

import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { ProgressBar } from '@/components/progress/MasteryBar';
import { ErrorState, PageSkeleton } from '@/components/system/States';

import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useAction } from '@/features/auth/useAction';
import { friendlyError } from '@/features/auth/auth-actions';

import { profileService } from '@/features/profile/profile-service';
import { academicContextFromDraft } from '@/features/profile/academic-context';

import type {
  OnboardingCatalog,
  OnboardingDraft,
} from '@/types/student';

import {
  activeSteps,
  stepTitles,
  updateDraft,
  validateOnboarding,
  validateStep,
} from './rules';

import type { OnboardingStep } from './rules';

import {
  clearDraft,
  readDraft,
  saveDraft,
} from './draft-storage';

import { OnboardingSteps } from './OnboardingSteps';

function OnboardingWizard({ user }: { user: User }) {
  const navigate = useNavigate();
  const action = useAction();
  const { setContext } = useAcademicTheme();

  const [setup, setSetup] = useState<{
    catalog: OnboardingCatalog;
    draft: OnboardingDraft;
  } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<OnboardingStep>('intro');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoadError(null);

    void profileService.getCatalog()
      .then((catalog) => {
        if (!active) return;

        setSetup({
          catalog,
          draft: readDraft(user, catalog.version),
        });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(friendlyError(error));
      });

    return () => {
      active = false;
    };
  }, [user, attempt]);

  useEffect(() => {
    if (!setup) return;

    saveDraft(user.id, setup.catalog.version, setup.draft);
    setContext(academicContextFromDraft(setup.draft));
  }, [setup, user.id, setContext]);

  useEffect(() => {
    document.title = 'Personalize your learning | Averiq';
    document.getElementById('onboarding-heading')?.focus();
  }, [step]);

  if (loadError) {
    return (
      <ErrorState
        title="We couldn't load your setup options."
        message={loadError}
        retry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  if (!setup) return <PageSkeleton />;

  const { catalog, draft } = setup;
  const steps = activeSteps(draft, catalog);
  const index = Math.max(0, steps.indexOf(step));
  const last = step === 'review';

  function update(patch: Partial<OnboardingDraft>) {
    setValidationError(null);

    setSetup((current) => current
      ? {
        ...current,
        draft: updateDraft(current.draft, patch, current.catalog),
      }
      : current);
  }

  function next() {
    if (!setup || action.busy) return;

    const error = validateStep(step, draft, catalog);

    if (error) {
      setValidationError(error);
      document.getElementById('onboarding-heading')?.focus();
      return;
    }

    setValidationError(null);

    if (!last) {
      setStep(steps[index + 1] ?? 'review');
      return;
    }

    const invalid = validateOnboarding(draft, catalog);

    if (invalid) {
      setStep(invalid.step);
      setValidationError(invalid.message);
      return;
    }

    void action.run(async () => {
      await profileService.completeOnboarding(
        user.id,
        catalog.version,
        draft,
      );

      clearDraft(user.id);

      /*
       * Refresh the profile on the completion route, not here.
       * This prevents the onboarding guard from redirecting before
       * the completion experience has mounted.
       */
      navigate('/onboarding/complete', { replace: true });
    });
  }

  return (
    <div className="onboarding-layout">
      <div className="onboarding-progress">
        <ProgressBar
          label={`Step ${index + 1} of ${steps.length}`}
          value={index + 1}
          max={steps.length}
          showValue={false}
        />
      </div>

      <Surface className="onboarding-surface" padding="lg">
        <div className="onboarding-stack">
          <p className="type-overline">Your learning identity</p>

          <h1 id="onboarding-heading" tabIndex={-1}>
            {stepTitles[step]}
          </h1>

          {(validationError || action.error) && (
            <p className="form-error" role="alert">
              {validationError || action.error}
            </p>
          )}

          <fieldset className="onboarding-fieldset" disabled={action.busy}>
            <div key={step}>
              <OnboardingSteps
                step={step}
                draft={draft}
                catalog={catalog}
                update={update}
              />
            </div>
          </fieldset>
        </div>
      </Surface>

      <footer className="onboarding-footer">
        <Button
          variant="quiet"
          disabled={index === 0 || action.busy}
          onClick={() => {
            setValidationError(null);
            setStep(steps[index - 1] ?? 'intro');
          }}
        >
          Back
        </Button>

        <Button size="lg" loading={action.busy} onClick={next}>
          {last ? 'Finish setup' : 'Continue'}
        </Button>
      </footer>

      <p className="type-caption onboarding-draft-note">
        Progress is kept in this browser tab for up to 24 hours.
        Closing the tab may remove an unfinished draft.
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  const { user } = useAuth();

  return user
    ? <OnboardingWizard key={user.id} user={user} />
    : <Navigate to="/login" replace />;
}
