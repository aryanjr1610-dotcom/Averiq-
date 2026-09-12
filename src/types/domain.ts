/**
 * Frontend domain contracts.
 *
 * These are not database tables or hard-coded curriculum catalogues.
 * Board, programme, subject, stream and exam identifiers will come
 * from backend-managed catalogues.
 */

export type GradeLevel =
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12;

export type OnboardingStatus =
  | 'pending'
  | 'in_progress'
  | 'complete';

export interface CurriculumReference {
  boardId: string;
  programmeId: string;
  academicYearId: string;
  grade: GradeLevel;
}

export interface CompetitiveGoal {
  examId: string;
  examinationYear: number;
}

export interface ThemePreferences {
  mode: 'system' | 'light' | 'dark';

  contrast:
    | 'system'
    | 'standard'
    | 'high';

  reducedMotion:
    | 'system'
    | 'reduce';

  academicAtmosphereId: string | null;
}

export interface StudentProfile {
  id: string;
  name: string;
  avatarUrl: string | null;

  curriculum: CurriculumReference | null;

  streamId: string | null;
  subjectCombinationId: string | null;
  subjectIds: readonly string[];

  competitiveGoals: readonly CompetitiveGoal[];

  onboardingStatus: OnboardingStatus;
  preferences: ThemePreferences;

  createdAt: string;
  updatedAt: string;
}
