import { competitiveRepository } from '@/features/competitive/repository'
import { computeMastery, strongTopics, weakTopics } from './mastery'
import { MASTERY_CONFIG, type MasteryResult, type MasteryScope, type Recommendation, type TopicEvidence } from './model'
import { hasPracticeSignals, progressSignalSources } from './practice-signals'
import { progressRepository, type LessonProgressRow } from './repository'

export type AnalyticsSnapshot = {
  hasEvidence: boolean
  lessons: LessonProgressRow[]
  mastery: MasteryResult[]
  weak: MasteryResult[]
  strong: MasteryResult[]
  studyTrend: Array<{ day: string; seconds: number }>
  studySecondsTotal: number
  activity: Array<{ kind: string; occurredAt: string }>
}

const LOOKBACK_DAYS = 90

export async function loadAnalytics(scope: MasteryScope = 'board', examKey?: string): Promise<AnalyticsSnapshot> {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString()
  const sources = progressSignalSources()

  const [lessons, studyTrend, activity, attempts] = await Promise.all([
    progressRepository.recentLessons(20).catch(() => []),
    progressRepository.studyTrend(14).catch(() => []),
    progressRepository.recentActivity(8).catch(() => []),
    hasPracticeSignals() ? sources.attempts!({ since, scope, examKey }).catch(() => []) : Promise.resolve([]),
  ])

  const topicIds = [...new Set(attempts.map((attempt) => attempt.topicId).filter(Boolean))]
  const [meta, revised] = await Promise.all([
    topicIds.length > 0 && sources.topicMeta ? sources.topicMeta(topicIds).catch(() => []) : Promise.resolve([]),
    topicIds.length > 0 && sources.lastRevisedAt ? sources.lastRevisedAt(topicIds).catch(() => ({})) : Promise.resolve({}),
  ])

  const mastery = topicIds.map((topicId) => {
    const topicAttempts = attempts.filter((attempt) => attempt.topicId === topicId)
    const info = meta.find((item) => item.topicId === topicId)
    const lastPracticedAt = topicAttempts
      .map((attempt) => attempt.at)
      .sort((a, b) => Date.parse(b) - Date.parse(a))[0]
    const evidence: TopicEvidence = {
      topicId,
      topicName: info?.topicName,
      subjectId: info?.subjectId,
      subjectName: info?.subjectName,
      chapterId: info?.chapterId,
      scope,
      examKey,
      attempts: topicAttempts,
      lastPracticedAt,
      lastRevisedAt: (revised as Record<string, string>)[topicId],
    }
    return computeMastery(evidence)
  })

  void progressRepository.cacheMastery(mastery).catch(() => undefined)

  const studySecondsTotal = studyTrend.reduce((sum, entry) => sum + entry.seconds, 0)

  return {
    hasEvidence: lessons.length > 0 || mastery.length > 0 || studySecondsTotal > 0,
    lessons,
    mastery,
    weak: weakTopics(mastery),
    strong: strongTopics(mastery),
    studyTrend,
    studySecondsTotal,
    activity,
  }
}

/** Deterministic, reason-carrying recommendations. Highest priority first. */
export async function buildRecommendations(snapshot: AnalyticsSnapshot): Promise<Recommendation[]> {
  const out: Recommendation[] = []

  const unfinished = snapshot.lessons.find((lesson) => lesson.status === 'in_progress' && lesson.readingProgress < 95)
  if (unfinished) {
    out.push({
      id: `continue:${unfinished.lessonId}`,
      type: 'continue_lesson',
      title: 'Continue where you left off',
      reason: `You are ${Math.round(unfinished.readingProgress)}% through this lesson.`,
      priority: 90,
      lessonId: unfinished.lessonId,
      targetRoute: `/app/learn/lessons/${unfinished.lessonId}${unfinished.lastPosition ? `#${unfinished.lastPosition}` : ''}`,
      actionLabel: 'Continue',
    })
  }

  for (const topic of snapshot.weak.slice(0, 3)) {
    const missed = topic.attemptCount
    out.push({
      id: `practice:${topic.topicId}`,
      type: 'practice_weak_topic',
      title: `Practice ${topic.topicName ?? 'this topic'}`,
      reason: `Recent accuracy ${topic.recentAccuracy ?? 0}% across ${missed} attempts.`,
      priority: 85 - Math.round(topic.recentAccuracy ?? 0) / 10,
      topicId: topic.topicId,
      subjectId: topic.subjectId,
      chapterId: topic.chapterId,
      targetRoute: `/app/practice?topic=${encodeURIComponent(topic.topicId)}`,
      actionLabel: 'Practice',
    })
  }

  for (const topic of snapshot.mastery.filter((item) => item.needsRevision).slice(0, 2)) {
    out.push({
      id: `revise:${topic.topicId}`,
      type: 'revise_concept',
      title: `Revise ${topic.topicName ?? 'this concept'}`,
      reason: topic.lastRevisedAt
        ? `Not revised for over ${MASTERY_CONFIG.staleRevisionDays} days.`
        : 'You have read this but not revised it yet.',
      priority: 70,
      topicId: topic.topicId,
      subjectId: topic.subjectId,
      targetRoute: '/app/revision',
      actionLabel: 'Revise',
    })
  }

  const sources = progressSignalSources()
  const focusTopic = snapshot.weak[0]
  if (focusTopic && sources.topicLinks) {
    const links: { formulaHref?: string; derivationHref?: string; visualizationId?: string } =
      (await sources.topicLinks(focusTopic.topicId).catch(() => ({}))) ?? {}
    if (links.formulaHref) {
      out.push({
        id: `formula:${focusTopic.topicId}`,
        type: 'review_formula',
        title: `Review the key formulae for ${focusTopic.topicName ?? 'this topic'}`,
        reason: 'Formula errors are a common cause of low accuracy here.',
        priority: 60,
        topicId: focusTopic.topicId,
        targetRoute: links.formulaHref,
        actionLabel: 'Open',
      })
    }
    if (links.visualizationId) {
      out.push({
        id: `visual:${focusTopic.topicId}`,
        type: 'open_visualization',
        title: `Visualise ${focusTopic.topicName ?? 'this concept'}`,
        reason: 'A linked visualisation exists for this topic.',
        priority: 45,
        topicId: focusTopic.topicId,
        targetRoute: `/app/visual-lab/${links.visualizationId}`,
        actionLabel: 'Explore',
      })
    }
  }

  const exams = await competitiveRepository.resolveMyExams().catch(() => [])
  const exam = exams[0]
  if (exam && snapshot.weak.length > 0) {
    out.push({
      id: `competitive:${exam.key}`,
      type: 'resume_competitive',
      title: `Resume ${exam.shortName} preparation`,
      reason: 'Your weakest board topics also appear in your exam syllabus.',
      priority: 55,
      examKey: exam.key,
      targetRoute: `/app/exams/${exam.key}`,
      actionLabel: 'Open',
    })
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 5)
}
