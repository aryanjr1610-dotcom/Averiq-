import type { AcademicContext } from '@/types/academic-theme';
import type { AcademicProfile, OnboardingDraft } from '@/types/student';

export function academicContextFromDraft(
  draft: OnboardingDraft,
): AcademicContext {
  if (!draft.classLevel || draft.classLevel <= 10) {
    return {
      grade: draft.classLevel ?? 10,
      group: 'balanced',
      page: 'default',
    };
  }

  const combination = draft.subjectCombination;

  const stream =
    combination === 'pcm' ||
    combination === 'pcb' ||
    combination === 'pcmb'
      ? combination
      : draft.stream === 'commerce'
        ? 'commerce'
        : draft.stream === 'humanities'
          ? 'humanities'
          : undefined;

  return {
    grade: draft.classLevel,
    boardId: draft.board ?? undefined,
    group: draft.stream ?? 'balanced',
    stream,
    page: 'default',
  };
}

export function academicContextFromProfile(
  profile: AcademicProfile,
): AcademicContext {
  return academicContextFromDraft({
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url,
    classLevel: profile.class_level,
    board: profile.board,
    stream: profile.stream,
    subjectCombination: profile.subject_combination,
    selectedSubjects: profile.subjects.map((item) => item.subject_key),
    competitiveGoals: profile.competitive_goals.map((item) => item.goal_key),
    studyGoals: profile.study_goals,
    learningPreference: profile.learning_preference,
    dailyStudyTarget: profile.daily_study_target,
  });
}
