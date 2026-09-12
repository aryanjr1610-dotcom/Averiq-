import type {
  OnboardingCatalog,
  OnboardingDraft,
} from '@/types/student';

export type OnboardingStep =
  | 'intro'
  | 'class'
  | 'board'
  | 'path'
  | 'subjects'
  | 'competition'
  | 'goals'
  | 'preferences'
  | 'review';

export const stepTitles: Record<OnboardingStep, string> = {
  intro: 'What should we call you?',
  class: 'Which class are you studying in?',
  board: 'Which school system do you follow?',
  path: 'Choose your academic path.',
  subjects: 'What will you study with Averiq?',
  competition: 'Do you have a competitive goal?',
  goals: 'What would you like help with?',
  preferences: 'Make studying feel like you.',
  review: 'Your learning identity, ready to begin.',
};

export const emptyDraft: OnboardingDraft = {
  displayName: '',
  avatarUrl: null,
  classLevel: null,
  board: null,
  stream: null,
  subjectCombination: null,
  selectedSubjects: [],
  competitiveGoals: [],
  studyGoals: ['concepts'],
  learningPreference: 'balanced',
  dailyStudyTarget: null,
};

export function subjectRule(
  draft: OnboardingDraft,
  catalog: OnboardingCatalog,
) {
  if (!draft.classLevel || !draft.board) return null;

  if (draft.classLevel <= 10) {
    return catalog.config.lowerRules.find(
      (rule) =>
        rule.boards.includes(draft.board!) &&
        rule.grades.includes(draft.classLevel!),
    ) ?? null;
  }

  const path = catalog.config.paths.find(
    (candidate) =>
      candidate.id === draft.subjectCombination &&
      candidate.stream === draft.stream &&
      candidate.boards.includes(draft.board!),
  );

  if (!path) return null;

  return {
    required: path.required,
    available: [...path.required, ...path.optional],
    defaults: path.defaults,
    minimum: path.minimum,
  };
}

export function competitionOptions(
  draft: OnboardingDraft,
  catalog: OnboardingCatalog,
): string[] {
  if (
    !draft.classLevel ||
    !catalog.config.competitiveGrades.includes(draft.classLevel)
  ) {
    return [];
  }

  const path = catalog.config.paths.find(
    (candidate) => candidate.id === draft.subjectCombination,
  );

  return path?.goals ?? [];
}

export function activeSteps(
  draft: OnboardingDraft,
  catalog: OnboardingCatalog,
): OnboardingStep[] {
  return [
    'intro',
    'class',
    'board',

    ...(draft.classLevel && draft.classLevel >= 11
      ? ['path' as const]
      : []),

    'subjects',

    ...(competitionOptions(draft, catalog).length
      ? ['competition' as const]
      : []),

    'goals',
    'preferences',
    'review',
  ];
}

export function updateDraft(
  current: OnboardingDraft,
  patch: Partial<OnboardingDraft>,
  catalog: OnboardingCatalog,
): OnboardingDraft {
  const next = { ...current, ...patch };

  const classChanged =
    patch.classLevel !== undefined &&
    patch.classLevel !== current.classLevel;

  const boardChanged =
    patch.board !== undefined &&
    patch.board !== current.board;

  const streamChanged =
    patch.stream !== undefined &&
    patch.stream !== current.stream;

  if (classChanged || (next.classLevel && next.classLevel <= 10)) {
    next.stream = null;
    next.subjectCombination = null;
  }

  if (streamChanged) {
    const paths = catalog.config.paths.filter(
      (path) =>
        path.stream === next.stream &&
        (!next.board || path.boards.includes(next.board)),
    );

    next.subjectCombination = paths.length === 1
      ? paths[0]!.id
      : null;
  }

  const selectionChanged =
    classChanged ||
    boardChanged ||
    streamChanged ||
    patch.subjectCombination !== undefined;

  const rule = subjectRule(next, catalog);

  if (selectionChanged) {
    next.selectedSubjects = rule ? [...rule.defaults] : [];
  }

  if (rule) {
    next.selectedSubjects = [...new Set([
      ...rule.required,
      ...next.selectedSubjects.filter((id) => rule.available.includes(id)),
    ])];
  }

  const allowedGoals = competitionOptions(next, catalog);

  next.competitiveGoals = next.competitiveGoals.filter(
    (goal) => allowedGoals.includes(goal),
  );

  if (!next.competitiveGoals.length) {
    next.studyGoals = next.studyGoals.filter((goal) => goal !== 'competitive');
  }

  return next;
}

export function validateStep(
  step: OnboardingStep,
  draft: OnboardingDraft,
  catalog: OnboardingCatalog,
): string | null {
  switch (step) {
    case 'intro':
      return draft.displayName.trim().length >= 2
        ? null
        : 'Enter a name with at least two characters.';

    case 'class':
      return draft.classLevel ? null : 'Choose your class.';

    case 'board':
      return draft.board ? null : 'Choose your school system.';

    case 'path': {
      const path = catalog.config.paths.find(
        (item) =>
          item.id === draft.subjectCombination &&
          item.stream === draft.stream &&
          draft.board &&
          item.boards.includes(draft.board),
      );

      return path ? null : 'Choose an academic path and combination.';
    }

    case 'subjects': {
      const rule = subjectRule(draft, catalog);

      if (!rule) return 'Choose your class, board and academic path first.';

      if (
        draft.selectedSubjects.length < rule.minimum ||
        !rule.required.every((id) => draft.selectedSubjects.includes(id)) ||
        draft.selectedSubjects.some((id) => !rule.available.includes(id))
      ) {
        return `Choose at least ${rule.minimum} available subjects and keep the core selections.`;
      }

      return null;
    }

    case 'competition':
      return draft.competitiveGoals.every(
        (goal) => competitionOptions(draft, catalog).includes(goal),
      )
        ? null
        : 'One of these goals is unavailable for the selected path.';

    case 'goals': {
      const ids = catalog.config.studyGoals
        .filter((goal) =>
          goal.id !== 'competitive' || draft.competitiveGoals.length > 0,
        )
        .map((goal) => goal.id);

      return (
        draft.studyGoals.length >= 1 &&
        draft.studyGoals.length <= 3 &&
        draft.studyGoals.every((id) => ids.includes(id))
      )
        ? null
        : 'Choose between one and three study goals.';
    }

    case 'preferences':
      if (
        !catalog.config.learningPreferences.some(
          (option) => option.id === draft.learningPreference,
        )
      ) {
        return 'Choose a learning preference.';
      }

      return draft.dailyStudyTarget === null ||
        (
          Number.isInteger(draft.dailyStudyTarget) &&
          draft.dailyStudyTarget >= 5 &&
          draft.dailyStudyTarget <= 240
        )
        ? null
        : 'Choose a daily target from 5 to 240 minutes, or leave it unset.';

    case 'review':
      return null;
  }
}

export function validateOnboarding(
  draft: OnboardingDraft,
  catalog: OnboardingCatalog,
): { step: OnboardingStep; message: string } | null {
  if (
    draft.competitiveGoals.some(
      (goal) => !competitionOptions(draft, catalog).includes(goal),
    )
  ) {
    return {
      step: 'class',
      message: 'Competitive goals are not available for this class or path.',
    };
  }

  if (
    draft.classLevel &&
    draft.classLevel <= 10 &&
    (draft.stream !== null || draft.subjectCombination !== null)
  ) {
    return {
      step: 'class',
      message: 'Classes 6–10 do not use a stream selection.',
    };
  }

  for (const step of activeSteps(draft, catalog)) {
    const message = validateStep(step, draft, catalog);
    if (message) return { step, message };
  }

  return null;
}
