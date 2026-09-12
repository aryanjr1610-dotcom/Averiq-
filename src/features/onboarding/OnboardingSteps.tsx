import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

import type {
  OnboardingCatalog,
  OnboardingDraft,
} from '@/types/student';

import type { OnboardingStep } from './rules';

import {
  competitionOptions,
  subjectRule,
} from './rules';

function OptionCard({
  name,
  label,
  description,
  checked,
  disabled,
  multiple = false,
  onChange,
}: {
  name: string;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  multiple?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer select-none items-start gap-3 rounded-lg border p-4 transition-colors duration-fast',
        checked
          ? 'border-accent bg-surface-2 ring-1 ring-accent'
          : 'border-edge bg-surface-1 hover:border-edge-strong',
      )}
    >
      <input
        className="sr-only"
        type={multiple ? 'checkbox' : 'radio'}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors',
          multiple ? 'rounded-xs' : 'rounded-full',
          checked ? 'border-accent bg-accent text-accent-on' : 'border-edge bg-surface-1',
        )}
      >
        {checked && <span className={cn('bg-current', multiple ? 'h-2 w-2 rounded-xs' : 'h-1.5 w-1.5 rounded-full')} />}
      </span>
      <span className="flex flex-col">
        <span className="text-body font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 text-caption text-ink-secondary">{description}</span>}
      </span>
    </label>
  );
}

function toggle(items: string[], id: string) {
  return items.includes(id)
    ? items.filter((value) => value !== id)
    : [...items, id];
}

export function OnboardingSteps({
  step,
  draft,
  catalog,
  update,
}: {
  step: OnboardingStep;
  draft: OnboardingDraft;
  catalog: OnboardingCatalog;
  update: (patch: Partial<OnboardingDraft>) => void;
}) {
  const config = catalog.config;

  if (step === 'intro') {
    return (
      <div className="onboarding-stack">
        <div className="showcase-row">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-body font-semibold text-accent-on">
            {(draft.displayName || 'Student').slice(0, 2).toUpperCase()}
          </div>

          {draft.avatarUrl && (
            <Button variant="quiet" onClick={() => update({ avatarUrl: null })}>
              Use initials instead
            </Button>
          )}
        </div>

        <Input
          name="displayName"
          label="Your name"
          autoComplete="name"
          required
          maxLength={80}
          value={draft.displayName}
          onChange={(event) => update({ displayName: event.target.value })}
        />

        <p className="type-caption">
          A profile photo is optional. Uploads will be added when Storage is configured.
        </p>
      </div>
    );
  }

  if (step === 'class') {
    return (
      <div className="onboarding-stack">
        <p className="text-secondary">
          Academic year: {catalog.academic_year}
        </p>

        <div className="option-grid">
          {config.grades.map((grade) => (
            <OptionCard
              key={grade}
              name="classLevel"
              label={`Class ${grade}`}
              checked={draft.classLevel === grade}
              onChange={() => update({ classLevel: grade })}
            />
          ))}
        </div>
      </div>
    );
  }

  if (step === 'board') {
    return (
      <div className="onboarding-stack">
        <div className="option-grid">
          {config.boards.map((board) => (
            <OptionCard
              key={board.id}
              name="board"
              label={board.label}
              description={board.description}
              checked={draft.board === board.id}
              onChange={() => {
                if (board.id === 'cbse' || board.id === 'cisce') {
                  update({ board: board.id });
                }
              }}
            />
          ))}
        </div>

        <p className="type-caption">
          CISCE is the council. Senior-secondary CISCE profiles use ISC;
          Classes 9–10 use ICSE. Earlier classes retain a CISCE-school identity.
        </p>
      </div>
    );
  }

  if (step === 'path') {
    const streams = [
      { id: 'science', label: 'Science' },
      { id: 'commerce', label: 'Commerce' },
      { id: 'humanities', label: 'Humanities' },
    ] as const;

    const paths = config.paths.filter(
      (path) =>
        path.stream === draft.stream &&
        draft.board &&
        path.boards.includes(draft.board),
    );

    return (
      <div className="onboarding-stack">
        <div className="option-grid">
          {streams.map((stream) => (
            <OptionCard
              key={stream.id}
              name="stream"
              label={stream.label}
              checked={draft.stream === stream.id}
              onChange={() => update({ stream: stream.id })}
            />
          ))}
        </div>

        {paths.length > 0 && (
          <div className="option-grid">
            {paths.map((path) => (
              <OptionCard
                key={path.id}
                name="subjectCombination"
                label={path.label}
                description={path.description}
                checked={draft.subjectCombination === path.id}
                onChange={() => update({ subjectCombination: path.id })}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (step === 'subjects') {
    const rule = subjectRule(draft, catalog);

    if (!rule) {
      return <p>Choose your class, board and academic path first.</p>;
    }

    return (
      <div className="onboarding-stack">
        <p className="setup-notice">
          This is a provisional setup catalogue—not an official board syllabus.
          Select the subjects you want to use in Averiq. Verified curriculum
          combinations arrive in Phase 5.
        </p>

        <p className="type-caption">
          Choose at least {rule.minimum}. Locked subjects define your selected
          starter combination, not universal board requirements.
        </p>

        <div className="option-grid">
          {config.subjects
            .filter((subject) => rule.available.includes(subject.id))
            .map((subject) => {
              const required = rule.required.includes(subject.id);
              const selected = draft.selectedSubjects.includes(subject.id);

              return (
                <OptionCard
                  key={subject.id}
                  name="subjects"
                  multiple
                  label={subject.label}
                  checked={selected}
                  disabled={required}
                  description={
                    required
                      ? 'Core for this combination'
                      : selected ? 'Selected' : 'Optional'
                  }
                  onChange={() => update({
                    selectedSubjects: toggle(draft.selectedSubjects, subject.id),
                  })}
                />
              );
            })}
        </div>
      </div>
    );
  }

  if (step === 'competition') {
    const allowed = competitionOptions(draft, catalog);

    return (
      <div className="onboarding-stack">
        <p className="text-secondary">
          Choose any goals that fit your current plans. You can change them later.
        </p>

        <div className="option-grid">
          {config.exams
            .filter((exam) => allowed.includes(exam.id))
            .map((exam) => (
              <OptionCard
                key={exam.id}
                name="competitiveGoals"
                multiple
                label={exam.label}
                description={exam.description}
                checked={draft.competitiveGoals.includes(exam.id)}
                onChange={() => update({
                  competitiveGoals: toggle(draft.competitiveGoals, exam.id),
                })}
              />
            ))}
        </div>

        <Button
          variant="outline"
          aria-pressed={draft.competitiveGoals.length === 0}
          onClick={() => update({ competitiveGoals: [] })}
        >
          None for now
        </Button>

        <p className="type-caption">
          These are Averiq product options, not an exam-eligibility determination.
          Check official exam notices for qualification, age and service-specific rules.
        </p>
      </div>
    );
  }

  if (step === 'goals') {
    const options = config.studyGoals.filter(
      (goal) =>
        goal.id !== 'competitive' ||
        draft.competitiveGoals.length > 0,
    );

    return (
      <div className="onboarding-stack">
        <p className="text-secondary">Choose up to three priorities.</p>

        <div className="option-grid">
          {options.map((goal) => {
            const selected = draft.studyGoals.includes(goal.id);

            return (
              <OptionCard
                key={goal.id}
                name="studyGoals"
                multiple
                label={goal.label}
                checked={selected}
                disabled={!selected && draft.studyGoals.length >= 3}
                onChange={() => update({
                  studyGoals: toggle(draft.studyGoals, goal.id),
                })}
              />
            );
          })}
        </div>
      </div>
    );
  }

  if (step === 'preferences') {
    return (
      <div className="onboarding-stack">
        <div className="option-grid">
          {config.learningPreferences.map((preference) => (
            <OptionCard
              key={preference.id}
              name="learningPreference"
              label={preference.label}
              description={preference.description}
              checked={draft.learningPreference === preference.id}
              onChange={() => update({ learningPreference: preference.id })}
            />
          ))}
        </div>

        <p className="type-caption">
          This changes emphasis, not access. All learning tools remain available.
        </p>

        <h3>An optional daily target</h3>

        <div className="target-options">
          {[15, 30, 45, 60].map((minutes) => (
            <Button
              key={minutes}
              variant={draft.dailyStudyTarget === minutes ? 'secondary' : 'outline'}
              aria-pressed={draft.dailyStudyTarget === minutes}
              onClick={() => update({ dailyStudyTarget: minutes })}
            >
              {minutes} min
            </Button>
          ))}

          <Button
            variant="quiet"
            onClick={() => update({ dailyStudyTarget: null })}
          >
            No target for now
          </Button>
        </div>

        <Input
          label="Custom target in minutes"
          type="number"
          min={5}
          max={240}
          inputMode="numeric"
          value={draft.dailyStudyTarget ?? ''}
          description="A small target is a valid starting point. You can change this later."
          onChange={(event) => {
            update({
              dailyStudyTarget:
                event.target.value === ''
                  ? null
                  : Number(event.target.value),
            });
          }}
        />
      </div>
    );
  }

  const path = config.paths.find(
    (item) => item.id === draft.subjectCombination,
  );

  const subjects = config.subjects
    .filter((subject) => draft.selectedSubjects.includes(subject.id))
    .map((subject) => subject.label);

  const goals = config.exams
    .filter((exam) => draft.competitiveGoals.includes(exam.id))
    .map((exam) => exam.label);

  return (
    <div className="onboarding-stack">
      <dl className="profile-review">
        <dt>Name</dt>
        <dd>{draft.displayName}</dd>

        <dt>Academic year</dt>
        <dd>{catalog.academic_year}</dd>

        <dt>School</dt>
        <dd>
          {draft.board?.toUpperCase()} · Class {draft.classLevel}
          {draft.board === 'cisce' && draft.classLevel! >= 11 ? ' · ISC' : ''}
        </dd>

        {path && (
          <>
            <dt>Academic path</dt>
            <dd>{path.label}</dd>
          </>
        )}

        <dt>Subjects</dt>
        <dd>{subjects.join(', ')}</dd>

        <dt>Competitive goals</dt>
        <dd>{goals.length ? goals.join(', ') : 'None for now'}</dd>

        <dt>Daily target</dt>
        <dd>
          {draft.dailyStudyTarget
            ? `${draft.dailyStudyTarget} minutes`
            : 'Not set'}
        </dd>
      </dl>

      <p className="type-caption">
        Your academic identity will be saved securely. Subject selections are
        provisional until they are mapped to verified curriculum records.
      </p>
    </div>
  );
}
