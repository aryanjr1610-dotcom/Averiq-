export type LessonStatus = 'not_started' | 'in_progress' | 'completed'
export type MasteryBand = 'insufficient' | 'needs_work' | 'developing' | 'good' | 'strong'
export type MasteryScope = 'board' | 'competitive'

export const MASTERY_CONFIG = {
  /** Attempts required before any mastery conclusion is drawn. */
  minAttempts: 6,
  /** Recency half-life in days: older attempts count less, transparently. */
  halfLifeDays: 21,
  /** Score weights. Reading is deliberately a minority of mastery. */
  weights: { reading: 0.3, accuracy: 0.6, freshness: 0.1 },
  /** Difficulty multipliers applied to correct answers only. */
  difficulty: { easy: 0.85, medium: 1, hard: 1.2 },
  /** Hint use reduces the credit of a correct answer. */
  hintPenalty: 0.75,
  bands: { needsWork: 45, developing: 65, good: 82 },
  weakAccuracy: 55,
  strongAccuracy: 80,
  staleRevisionDays: 21,
} as const

export const BAND_LABEL: Record<MasteryBand, string> = {
  insufficient: 'Not enough practice yet',
  needs_work: 'Needs work',
  developing: 'Developing',
  good: 'Good',
  strong: 'Strong',
}

export type AttemptSignal = {
  topicId: string
  correct: boolean
  difficulty?: 'easy' | 'medium' | 'hard'
  hintsUsed?: number
  seconds?: number
  at: string
  scope?: MasteryScope
  examKey?: string
}

export type TopicEvidence = {
  topicId: string
  topicName?: string
  subjectId?: string
  subjectName?: string
  chapterId?: string
  scope: MasteryScope
  examKey?: string
  attempts: AttemptSignal[]
  readingProgress?: number
  lastRevisedAt?: string
  lastPracticedAt?: string
}

export type MasteryResult = {
  topicId: string
  topicName?: string
  subjectId?: string
  subjectName?: string
  chapterId?: string
  scope: MasteryScope
  examKey?: string
  score: number | null
  band: MasteryBand
  attemptCount: number
  recentAccuracy: number | null
  readingProgress: number | null
  reasons: string[]
  needsRevision: boolean
  lastPracticedAt?: string
  lastRevisedAt?: string
}

export type RecommendationType =
  | 'continue_lesson'
  | 'revise_concept'
  | 'quick_revision'
  | 'practice_weak_topic'
  | 'review_formula'
  | 'revisit_derivation'
  | 'open_visualization'
  | 'resume_competitive'

export type Recommendation = {
  id: string
  type: RecommendationType
  title: string
  reason: string
  priority: number
  subjectId?: string
  chapterId?: string
  topicId?: string
  lessonId?: string
  examKey?: string
  targetRoute: string
  actionLabel: string
}
