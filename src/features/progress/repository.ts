import { getSupabase } from '@/lib/supabase'
import type { LessonStatus, MasteryResult, MasteryScope } from './model'

type Row = Record<string, unknown>
type Result<T> = { data: T | null; error: { message: string } | null }
type Query = {
  select: (columns: string) => Query
  eq: (column: string, value: string) => Query
  gte: (column: string, value: string) => Query
  order: (column: string, options: { ascending: boolean }) => Query
  limit: (count: number) => Promise<Result<Row[]>>
  maybeSingle: () => Promise<Result<Row>>
}
type Client = {
  from: (table: string) => Query & {
    insert: (values: Row | Row[]) => Promise<Result<Row[]>>
    upsert: (values: Row | Row[], options?: { onConflict: string }) => Promise<Result<Row[]>>
    update: (values: Row) => Query
  }
  auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> }
}
const client = (): Client => getSupabase() as unknown as Client

async function userId(): Promise<string | null> {
  const { data } = await client().auth.getUser()
  return data.user?.id ?? null
}

const text = (row: Row, key: string): string | undefined => (typeof row[key] === 'string' ? (row[key] as string) : undefined)
const num = (row: Row, key: string): number | undefined => (typeof row[key] === 'number' ? (row[key] as number) : undefined)

export type LessonProgressRow = {
  lessonId: string
  status: LessonStatus
  readingProgress: number
  lastPosition?: string
  studySeconds: number
  lastOpenedAt?: string
  completedAt?: string
}

const mapProgress = (row: Row): LessonProgressRow => ({
  lessonId: text(row, 'lesson_id') ?? '',
  status: (text(row, 'status') ?? 'in_progress') as LessonStatus,
  readingProgress: num(row, 'reading_progress') ?? 0,
  lastPosition: text(row, 'last_position'),
  studySeconds: num(row, 'study_seconds') ?? 0,
  lastOpenedAt: text(row, 'last_opened_at'),
  completedAt: text(row, 'completed_at'),
})

export const progressRepository = {
  async recentLessons(limit = 12): Promise<LessonProgressRow[]> {
    const { data, error } = await client()
      .from('lesson_progress')
      .select('*')
      .order('last_opened_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapProgress)
  },

  async getLesson(lessonId: string): Promise<LessonProgressRow | null> {
    const { data, error } = await client().from('lesson_progress').select('*').eq('lesson_id', lessonId).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? mapProgress(data) : null
  },

  async saveLesson(input: {
    lessonId: string
    readingProgress?: number
    lastPosition?: string
    addStudySeconds?: number
    completed?: boolean
  }): Promise<void> {
    const uid = await userId()
    if (!uid) return
    const existing = await this.getLesson(input.lessonId)
    const readingProgress = Math.max(existing?.readingProgress ?? 0, input.readingProgress ?? 0)
    const studySeconds = (existing?.studySeconds ?? 0) + Math.max(0, input.addStudySeconds ?? 0)
    const completed = input.completed === true || existing?.status === 'completed'
    const { error } = await client()
      .from('lesson_progress')
      .upsert(
        {
          user_id: uid,
          lesson_id: input.lessonId,
          status: completed ? 'completed' : 'in_progress',
          reading_progress: completed ? 100 : Math.round(readingProgress * 100) / 100,
          last_position: input.lastPosition ?? existing?.lastPosition ?? null,
          study_seconds: Math.min(studySeconds, 2_000_000),
          last_opened_at: new Date().toISOString(),
          completed_at: completed ? (existing?.completedAt ?? new Date().toISOString()) : null,
        },
        { onConflict: 'user_id,lesson_id' },
      )
    if (error) throw new Error(error.message)
  },

  async logActivity(input: {
    kind:
      | 'lesson_opened' | 'lesson_completed' | 'practice_completed' | 'revision_completed'
      | 'flashcards_completed' | 'formula_viewed' | 'derivation_viewed' | 'visual_opened'
      | 'focus_completed' | 'test_completed'
    subjectId?: string
    chapterId?: string
    topicId?: string
    lessonId?: string
    examKey?: string
    metadata?: Record<string, unknown>
  }): Promise<void> {
    const uid = await userId()
    if (!uid) throw new Error('Sign in to save your study activity.')
    const { error } = await getSupabase().rpc('log_activity_v1', {
      p_kind: input.kind,
      p_subject_id: input.subjectId ?? null,
      p_chapter_id: input.chapterId ?? null,
      p_topic_id: input.topicId ?? null,
      p_lesson_id: input.lessonId ?? null,
      p_exam_key: input.examKey ?? null,
      p_metadata: input.metadata ?? {},
    })
    if (error) throw new Error(error.message)
  },

  async recentActivity(limit = 8): Promise<Array<{ kind: string; occurredAt: string }>> {
    const { data, error } = await client()
      .from('activity_events')
      .select('kind, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data ?? []).map((row) => ({ kind: text(row, 'kind') ?? '', occurredAt: text(row, 'occurred_at') ?? '' }))
  },

  async recordSession(input: {
    activityType: 'lesson' | 'practice' | 'revision' | 'flashcards' | 'focus' | 'visual'
    activeSeconds: number
    subjectId?: string
    chapterId?: string
    lessonId?: string
    examKey?: string
    startedAt: string
  }): Promise<void> {
    const uid = await userId()
    if (!uid || input.activeSeconds < 20) return
    const { error } = await client().from('learning_sessions').insert({
      user_id: uid,
      activity_type: input.activityType,
      subject_id: input.subjectId ?? null,
      chapter_id: input.chapterId ?? null,
      lesson_id: input.lessonId ?? null,
      exam_key: input.examKey ?? null,
      started_at: input.startedAt,
      ended_at: new Date().toISOString(),
      active_seconds: Math.min(input.activeSeconds, 86_400),
    })
    if (error) throw new Error(error.message)
  },

  /** Active study seconds per day for the trend chart. */
  async studyTrend(days = 14): Promise<Array<{ day: string; seconds: number }>> {
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const { data, error } = await client()
      .from('learning_sessions')
      .select('started_at, active_seconds')
      .gte('started_at', since)
      .order('started_at', { ascending: true })
      .limit(1000)
    if (error) throw new Error(error.message)
    const buckets = new Map<string, number>()
    for (const row of data ?? []) {
      const startedAt = text(row, 'started_at')
      if (!startedAt) continue
      const day = new Date(startedAt).toLocaleDateString('en-CA')
      buckets.set(day, (buckets.get(day) ?? 0) + (num(row, 'active_seconds') ?? 0))
    }
    return [...buckets.entries()].map(([day, seconds]) => ({ day, seconds }))
  },

  async loadMastery(scope?: MasteryScope): Promise<Row[]> {
    let query = client().from('topic_mastery').select('*')
    if (scope) query = query.eq('scope', scope)
    const { data, error } = await query.order('computed_at', { ascending: false }).limit(500)
    if (error) throw new Error(error.message)
    return data ?? []
  },

  async cacheMastery(results: MasteryResult[]): Promise<void> {
    const uid = await userId()
    if (!uid || results.length === 0) return
    const { error } = await client()
      .from('topic_mastery')
      .upsert(
        results.map((result) => ({
          user_id: uid,
          topic_id: result.topicId,
          scope: result.scope,
          exam_key: result.examKey ?? '',
          score: result.score,
          band: result.band,
          attempt_count: result.attemptCount,
          recent_accuracy: result.recentAccuracy,
          reading_progress: result.readingProgress,
          evidence: { reasons: result.reasons, needsRevision: result.needsRevision },
          last_practiced_at: result.lastPracticedAt ?? null,
          last_revised_at: result.lastRevisedAt ?? null,
          computed_at: new Date().toISOString(),
        })),
        { onConflict: 'user_id,topic_id,scope,exam_key' },
      )
    if (error) throw new Error(error.message)
  },
}