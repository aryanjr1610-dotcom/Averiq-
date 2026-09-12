import type { AttemptSignal, MasteryScope } from './model'

export type TopicMeta = {
  topicId: string
  topicName?: string
  subjectId?: string
  subjectName?: string
  chapterId?: string
}

/**
 * question_attempts / practice_sessions / revision / flashcards live in migrations
 * this module did not create, so they are never queried directly. The app
 * registers readers once at startup; everything degrades to empty states.
 */
export type ProgressSignalSources = {
  /** Attempts for the signed-in student, newest first, ideally last 90 days. */
  attempts?: (options: { since: string; scope?: MasteryScope; examKey?: string }) => Promise<AttemptSignal[]>
  /** Topic metadata for the ids seen in attempts. */
  topicMeta?: (topicIds: string[]) => Promise<TopicMeta[]>
  /** Last revision timestamp per topic id. */
  lastRevisedAt?: (topicIds: string[]) => Promise<Record<string, string>>
  /** Most recent resumable practice session. */
  lastPracticeSession?: () => Promise<{ title: string; href: string } | null>
  /** Formula / derivation / visualization ids linked to a topic, for recommendations. */
  topicLinks?: (topicId: string) => Promise<{ formulaHref?: string; derivationHref?: string; visualizationId?: string }>
}

let sources: ProgressSignalSources = {}
export function registerProgressSignalSources(next: ProgressSignalSources): void {
  sources = { ...sources, ...next }
}
export function progressSignalSources(): ProgressSignalSources {
  return sources
}
export function hasPracticeSignals(): boolean {
  return typeof sources.attempts === 'function'
}
