import { z } from 'zod';

export const GradeSchema = z.union([
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12),
]);

export const BoardSchema = z.enum(['cbse', 'cisce']);
export const StreamSchema = z.enum(['science', 'commerce', 'humanities']);

const OptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const CatalogSchema = z.object({
  version: z.string(),
  academic_year: z.string(),

  config: z.object({
    grades: z.array(GradeSchema),
    boards: z.array(OptionSchema),
    subjects: z.array(OptionSchema),
    exams: z.array(OptionSchema),
    studyGoals: z.array(OptionSchema),
    learningPreferences: z.array(OptionSchema),
    competitiveGrades: z.array(GradeSchema),

    lowerRules: z.array(z.object({
      boards: z.array(BoardSchema),
      grades: z.array(GradeSchema),
      required: z.array(z.string()),
      available: z.array(z.string()),
      defaults: z.array(z.string()),
      minimum: z.number().int().nonnegative(),
    })),

    paths: z.array(z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      stream: StreamSchema,
      boards: z.array(BoardSchema),
      required: z.array(z.string()),
      optional: z.array(z.string()),
      defaults: z.array(z.string()),
      minimum: z.number().int().positive(),
      goals: z.array(z.string()),
    })),
  }),
});

export type OnboardingCatalog = z.infer<typeof CatalogSchema>;

export const DraftSchema = z.object({
  displayName: z.string().max(80),
  avatarUrl: z.string().url().max(2048).nullable(),
  classLevel: GradeSchema.nullable(),
  board: BoardSchema.nullable(),
  stream: StreamSchema.nullable(),
  subjectCombination: z.string().max(80).nullable(),
  selectedSubjects: z.array(z.string()).max(20),
  competitiveGoals: z.array(z.string()).max(3),
  studyGoals: z.array(z.string()).max(3),
  learningPreference: z.string().max(80),
  dailyStudyTarget: z.number().int().nullable(),
});

export type OnboardingDraft = z.infer<typeof DraftSchema>;

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  catalog_version: z.string(),
  academic_year: z.string(),
  class_level: GradeSchema,
  board: BoardSchema,
  school_system: z.string(),
  stream: StreamSchema.nullable(),
  subject_combination: z.string().nullable(),
  study_goals: z.array(z.string()),
  learning_preference: z.string(),
  daily_study_target: z.number().nullable(),
  onboarding_completed: z.boolean(),
  onboarding_completed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),

  subjects: z.array(z.object({
    subject_key: z.string(),
  })),

  competitive_goals: z.array(z.object({
    goal_key: z.string(),
    target_year: z.number().nullable(),
  })),
});

export type AcademicProfile = z.infer<typeof ProfileSchema>;
