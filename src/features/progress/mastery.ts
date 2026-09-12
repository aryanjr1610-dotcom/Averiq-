import { MASTERY_CONFIG as C, type AttemptSignal, type MasteryBand, type MasteryResult, type TopicEvidence } from './model'

const DAY_MS = 86_400_000
const daysBetween = (from: string, now: number): number => Math.max(0, (now - Date.parse(from)) / DAY_MS)

/** Exponential recency weight; an attempt one half-life old counts half. */
export function recencyWeight(at: string, now: number): number {
  const days = daysBetween(at, now)
  if (!Number.isFinite(days)) return 0
  return Math.pow(0.5, days / C.halfLifeDays)
}

function attemptCredit(attempt: AttemptSignal): { earned: number; possible: number } {
  const weight = C.difficulty[attempt.difficulty ?? 'medium']
  if (!attempt.correct) return { earned: 0, possible: weight }
  const hinted = (attempt.hintsUsed ?? 0) > 0 ? C.hintPenalty : 1
  return { earned: weight * hinted, possible: weight }
}

/** Recency- and difficulty-weighted accuracy in 0-100, or null without attempts. */
export function weightedAccuracy(attempts: AttemptSignal[], now: number): number | null {
  let earned = 0
  let possible = 0
  for (const attempt of attempts) {
    const recency = recencyWeight(attempt.at, now)
    if (recency <= 0.01) continue
    const credit = attemptCredit(attempt)
    earned += credit.earned * recency
    possible += credit.possible * recency
  }
  if (possible === 0) return null
  return Math.round((earned / possible) * 1000) / 10
}

export function bandFor(score: number): MasteryBand {
  if (score < C.bands.needsWork) return 'needs_work'
  if (score < C.bands.developing) return 'developing'
  if (score < C.bands.good) return 'good'
  return 'strong'
}

function repeatedMistakes(attempts: AttemptSignal[]): boolean {
  const recent = [...attempts].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6)
  return recent.length >= 4 && recent.filter((attempt) => !attempt.correct).length >= 3
}

/** Mastery is separate from reading. Reading alone can never exceed the reading weight. */
export function computeMastery(evidence: TopicEvidence, nowMs = Date.now()): MasteryResult {
  const attempts = evidence.attempts
  const accuracy = weightedAccuracy(attempts, nowMs)
  const reading = typeof evidence.readingProgress === 'number' ? Math.max(0, Math.min(100, evidence.readingProgress)) : null
  const reasons: string[] = []

  const freshnessSource = evidence.lastPracticedAt ?? evidence.lastRevisedAt
  const freshness = freshnessSource
    ? Math.round(Math.max(0, 100 - daysBetween(freshnessSource, nowMs) * (100 / (C.staleRevisionDays * 2))))
    : 0

  const enough = attempts.length >= C.minAttempts
  let score: number | null = null
  let band: MasteryBand = 'insufficient'

  if (enough && accuracy !== null) {
    score = Math.round(
      C.weights.reading * (reading ?? 0) + C.weights.accuracy * accuracy + C.weights.freshness * freshness,
    )
    score = Math.max(0, Math.min(100, score))
    band = bandFor(score)
    reasons.push(`Recent practice accuracy ${accuracy}% across ${attempts.length} attempts`)
    if (reading !== null) reasons.push(`Chapter reading ${Math.round(reading)}%`)
    if (repeatedMistakes(attempts)) reasons.push('Repeated errors in the last few questions')
  } else {
    reasons.push(
      `Only ${attempts.length} of ${C.minAttempts} practice attempts needed before a mastery estimate`,
    )
    if (reading !== null && reading > 0) reasons.push(`Chapter reading ${Math.round(reading)}%`)
  }

  const revisionStale = evidence.lastRevisedAt
    ? daysBetween(evidence.lastRevisedAt, nowMs) > C.staleRevisionDays
    : (reading ?? 0) > 50
  const needsRevision = revisionStale && (band === 'needs_work' || band === 'developing' || band === 'insufficient')
  if (needsRevision && evidence.lastRevisedAt) {
    reasons.push(`Last revised ${Math.round(daysBetween(evidence.lastRevisedAt, nowMs))} days ago`)
  }

  return {
    topicId: evidence.topicId,
    topicName: evidence.topicName,
    subjectId: evidence.subjectId,
    subjectName: evidence.subjectName,
    chapterId: evidence.chapterId,
    scope: evidence.scope,
    examKey: evidence.examKey,
    score,
    band,
    attemptCount: attempts.length,
    recentAccuracy: accuracy,
    readingProgress: reading,
    reasons,
    needsRevision,
    lastPracticedAt: evidence.lastPracticedAt,
    lastRevisedAt: evidence.lastRevisedAt,
  }
}

export function weakTopics(results: MasteryResult[]): MasteryResult[] {
  return results
    .filter((result) => result.band !== 'insufficient' && (result.recentAccuracy ?? 100) < C.weakAccuracy)
    .sort((a, b) => (a.recentAccuracy ?? 100) - (b.recentAccuracy ?? 100))
}

export function strongTopics(results: MasteryResult[]): MasteryResult[] {
  return results
    .filter((result) => result.band === 'strong' || (result.recentAccuracy ?? 0) >= C.strongAccuracy)
    .sort((a, b) => (b.recentAccuracy ?? 0) - (a.recentAccuracy ?? 0))
}

/** Weighted chapter/subject roll-up: bigger units count more, so averages are honest. */
export function weightedCompletion(units: Array<{ completed: number; total: number }>): number | null {
  const total = units.reduce((sum, unit) => sum + unit.total, 0)
  if (total === 0) return null
  const completed = units.reduce((sum, unit) => sum + Math.min(unit.completed, unit.total), 0)
  return Math.round((completed / total) * 100)
}
