import { curriculumRepository } from '@/features/curriculum/repository'
import { competitiveRepository, type ExamSummary } from '@/features/competitive/repository'
import type { Recommendation } from '@/features/progress/model'
import { buildRecommendations, loadAnalytics } from '@/features/progress/analytics'
import { progressRepository } from '@/features/progress/repository'
import { plannerRepository } from '../planner/repository'
import { gamificationRepository } from '../gamification/repository'
import { buildToday } from '../planner/model'
import { localDay } from '@/lib/day'
import { getSupabase } from '@/lib/supabase'

export type SectionState<T> =
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'unavailable'; message: string }

export type ContinueLearning = {
  subjectName: string
  chapterName?: string
  lessonName?: string
  lessonId?: string
  percentRead?: number
}

export type SubjectSummary = { id: string; name: string; slug?: string; currentChapter?: string; lessonId?: string }
export type RevisionSummary = { title: string; href: string }
export type PracticeSummary = { title: string; href: string }
export type ProgressSummary = { lessonsCompleted?: number; practiceAccuracy?: number; studyMinutes?: number; streakDays?: number }

export type TodayPlanSummary = {
  tasks: Array<{ id: string; title: string; type: string; done: boolean }>
  streak: number
  focusMinutesToday: number
}

/**
 * Phase 9-11 and future progress services live outside this repository's
 * migrations, so the dashboard reads them ONLY through this registration.
 * Nothing here queries an unverified table.
 */
export type DashboardSources = {
  continueLearning?: () => Promise<ContinueLearning | null>
  revision?: () => Promise<RevisionSummary | null>
  practice?: () => Promise<PracticeSummary | null>
  progress?: () => Promise<ProgressSummary | null>
  recentActivity?: () => Promise<string[]>
  weakTopics?: () => Promise<Array<{ name: string; lessonId?: string }>>
  todayPlan?: () => Promise<TodayPlanSummary | null>
}

let sources: DashboardSources = {}
export function registerDashboardSources(next: DashboardSources): void {
  sources = { ...sources, ...next }
}

export function greeting(date: Date, name?: string): string {
  const hour = date.getHours()
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${part}, ${name} 👋` : `${part} 👋`
}

async function section<T>(loader: (() => Promise<T | null>) | undefined): Promise<SectionState<T>> {
  if (!loader) return { status: 'empty' }
  try {
    const data = await loader()
    return data === null || data === undefined ? { status: 'empty' } : { status: 'ready', data }
  } catch (error) {
    return { status: 'unavailable', message: error instanceof Error ? error.message : 'Section unavailable.' }
  }
}

export type DashboardData = {
  subjects: SectionState<SubjectSummary[]>
  continueLearning: SectionState<ContinueLearning>
  exams: SectionState<ExamSummary[]>
  revision: SectionState<RevisionSummary>
  practice: SectionState<PracticeSummary>
  progress: SectionState<ProgressSummary>
  weakTopics: SectionState<Array<{ name: string; lessonId?: string }>>
  recentActivity: SectionState<string[]>
  recommendations: SectionState<Recommendation[]>
  today: SectionState<TodayPlanSummary>
}

async function currentUserId(): Promise<string | null> {
  const { data } = await getSupabase().auth.getUser()
  return data.user?.id ?? null
}

export async function loadDashboardData(): Promise<DashboardData> {
  const [subjects, exams, continueLearning, revision, practice, progress, weakTopics, recentActivity, recommendations, today] = await Promise.all([
    (async (): Promise<SectionState<SubjectSummary[]>> => {
      try {
        const bundle = await curriculumRepository.resolveMyCurriculum()
        const list = bundle.subjects.map((item) => ({ id: item.id, name: item.title, slug: item.slug }))
        return list.length === 0 ? { status: 'empty' } : { status: 'ready', data: list }
      } catch (error) {
        return { status: 'unavailable', message: error instanceof Error ? error.message : 'Curriculum unavailable.' }
      }
    })(),
    (async (): Promise<SectionState<ExamSummary[]>> => {
      try {
        const list = await competitiveRepository.resolveMyExams()
        return list.length === 0 ? { status: 'empty' } : { status: 'ready', data: list }
      } catch (error) {
        return { status: 'unavailable', message: error instanceof Error ? error.message : 'Exams unavailable.' }
      }
    })(),
    section(sources.continueLearning),
    section(sources.revision),
    section(sources.practice),
    section(sources.progress),
    section(sources.weakTopics ? async () => {
      const list = await sources.weakTopics!()
      return list.length === 0 ? null : list
    } : undefined),
    section(sources.recentActivity ? async () => {
      const list = await sources.recentActivity!()
      return list.length === 0 ? null : list
    } : undefined),
    section(async () => {
      const snapshot = await loadAnalytics('board')
      const list = await buildRecommendations(snapshot)
      return list.length === 0 ? null : list
    }),
    section(sources.todayPlan ? async () => {
      const plan = await sources.todayPlan!()
      if (!plan) return null
      if (plan.tasks.length === 0 && plan.streak === 0 && plan.focusMinutesToday === 0) return null
      return plan
    } : undefined),
  ])

  return { subjects, continueLearning, exams, revision, practice, progress, weakTopics, recentActivity, recommendations, today }
}

// Real defaults so the dashboard stops being empty
registerDashboardSources({
  continueLearning: async () => {
    const lessons = await progressRepository.recentLessons(5)
    const target = lessons.find((lesson) => lesson.status === 'in_progress') ?? lessons[0]
    if (!target) return null
    const reader = await curriculumRepository.getReader(target.lessonId).catch(() => null)
    return {
      subjectName: reader?.subject.title ?? 'Pick up where you left off',
      chapterName: reader?.chapter.title,
      lessonName: reader?.lesson.title,
      lessonId: target.lessonId,
      percentRead: Math.round(target.readingProgress),
    }
  },
  progress: async () => {
    const trend = await progressRepository.studyTrend(14)
    const seconds = trend.reduce((sum, entry) => sum + entry.seconds, 0)
    const lessons = await progressRepository.recentLessons(50)
    const completed = lessons.filter((lesson) => lesson.status === 'completed').length
    if (seconds === 0 && completed === 0) return null
    return { studyMinutes: Math.round(seconds / 60), lessonsCompleted: completed }
  },
  recentActivity: async () => {
    const events = await progressRepository.recentActivity(5)
    return events.map((event) => `${event.kind.replace(/_/g, ' ')} · ${new Date(event.occurredAt).toLocaleDateString()}`)
  },
  weakTopics: async () => {
    const snapshot = await loadAnalytics('board')
    return snapshot.weak.slice(0, 3).map((topic) => ({ name: topic.topicName ?? 'Topic', lessonId: undefined }))
  },
  todayPlan: async () => {
    const userId = await currentUserId()
    if (!userId) return { tasks: [], streak: 0, focusMinutesToday: 0 }
    const day = localDay()
    const [tasks, summary] = await Promise.all([
      plannerRepository.listRange(userId, day, day),
      gamificationRepository.summary(userId),
    ])
    const view = buildToday(tasks, day)
    return {
      tasks: [...view.overdue, ...view.scheduled, ...view.completed].slice(0, 5).map((task) => ({
        id: task.id,
        title: task.title,
        type: task.type,
        done: task.status === 'completed',
      })),
      streak: summary.streak.current,
      focusMinutesToday: Math.round(summary.today.focusSeconds / 60),
    }
  },
})
