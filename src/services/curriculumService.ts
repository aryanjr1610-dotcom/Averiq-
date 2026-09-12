import { getSupabase } from '../lib/supabase'

export type BoardCode = 'cbse' | 'cisce'

type TrackRow = {
  id: string
  minimum_grade: number | null
  maximum_grade: number | null
}

export type ResolvedCurriculum = {
  status: 'ready' | 'profile_required' | 'profile_incomplete' | 'curriculum_pending'
  board?: BoardCode
  class_level?: number
  academic_year?: string
  release_id?: string
  subjects: Array<{
    id: string
    subject_id: string
    title: string
    slug: string
    position: number
    chapters: Array<{
      id: string
      title: string
      slug: string
      position: number
      chapter_number: string | null
      description: string
      topics: Array<{
        id: string
        title: string
        slug: string
        position: number
        lessons: Array<{
          id: string
          title: string
          slug: string
          estimated_minutes: number | null
          lesson_type: string
        }>
      }>
    }>
  }>
}

export type VerifiedLessonContentExport = {
  version_id: string
  lesson_id: string
  blocks: unknown[]
  key_terms: unknown[]
  formulas: unknown[]
  examples: unknown[]
  exercises: unknown[]
  verification_summary: {
    verified: number
    out_of_scope: number
    pending: number
    needs_correction: number
    needs_source: number
    ambiguous: number
  }
  is_fully_verified: boolean
  generated_at: string
}

const client = () => getSupabase()
const DEFAULT_CACHE_TTL_MS = 2 * 60_000
const LESSON_CACHE_TTL_MS = 5 * 60_000

type CacheEntry = { expiresAt: number; value: Promise<unknown> }
const readCache = new Map<string, CacheEntry>()

function cached<T>(key: string, loader: () => Promise<T>, ttlMs = DEFAULT_CACHE_TTL_MS): Promise<T> {
  const now = Date.now()
  const hit = readCache.get(key)
  if (hit && hit.expiresAt > now) return hit.value as Promise<T>
  if (hit) readCache.delete(key)

  const value = loader().catch((error) => {
    readCache.delete(key)
    throw error
  })
  readCache.set(key, { expiresAt: now + ttlMs, value })
  return value
}

/** Clear after an academic-profile edit or when an admin publishes a new release in-session. */
export function clearCurriculumCache(): void {
  readCache.clear()
}

/**
 * Preferred student-facing resolver.
 * Supabase resolves the signed-in user's board, class, academic year and
 * selected subjects. Draft academic releases remain invisible.
 *
 * This call is intentionally not cached because onboarding/profile changes
 * must be reflected immediately.
 */
export async function resolveMyCurriculum(): Promise<ResolvedCurriculum> {
  const { data, error } = await client().rpc('resolve_my_curriculum')

  if (error) throw error

  return (data ?? {
    status: 'curriculum_pending',
    subjects: [],
  }) as ResolvedCurriculum
}

/**
 * Direct lookup is useful for catalog/admin screens. Student dashboards
 * should prefer resolveMyCurriculum() so stream/subject choices are enforced.
 */
export async function getRelease(
  boardCode: BoardCode,
  gradeLevel: number,
  academicYear = '2026-27'
) {
  return cached(`release:${boardCode}:${gradeLevel}:${academicYear}`, async () => {
    const { data: board, error: boardError } = await client()
      .from('education_boards')
      .select('id')
      .eq('code', boardCode)
      .single()

    if (boardError) throw boardError

    const { data: year, error: yearError } = await client()
      .from('academic_years')
      .select('id')
      .eq('code', academicYear)
      .single()

    if (yearError) throw yearError

    const { data: tracks, error: trackError } = await client()
      .from('curriculum_tracks')
      .select('id, minimum_grade, maximum_grade')
      .eq('board_id', board.id)
      .eq('learning_context', 'school')
      .eq('status', 'active')

    if (trackError) throw trackError

    const matchingTracks = ((tracks ?? []) as TrackRow[])
      .filter(
        (item: TrackRow) =>
          (item.minimum_grade === null || item.minimum_grade <= gradeLevel) &&
          (item.maximum_grade === null || item.maximum_grade >= gradeLevel)
      )
      .sort((a: TrackRow, b: TrackRow) => {
        const aSpan = (a.maximum_grade ?? 12) - (a.minimum_grade ?? 6)
        const bSpan = (b.maximum_grade ?? 12) - (b.minimum_grade ?? 6)
        return aSpan - bSpan
      })

    const track = matchingTracks[0]

    if (!track) {
      throw new Error(`No curriculum track found for ${boardCode} Class ${gradeLevel}`)
    }

    const { data: releases, error: releaseError } = await client()
      .from('curriculum_releases')
      .select(`
        id,
        grade_level,
        revision,
        status,
        verification_status,
        source_name,
        source_url
      `)
      .eq('academic_year_id', year.id)
      .eq('track_id', track.id)
      .eq('grade_level', gradeLevel)
      .eq('status', 'published')
      .eq('verification_status', 'verified')
      .order('revision', { ascending: false })
      .limit(1)

    if (releaseError) throw releaseError
    return releases?.[0] ?? null
  })
}

export async function getSubjects(releaseId: string) {
  return cached(`subjects:${releaseId}`, async () => {
    const { data, error } = await client()
      .from('curriculum_subjects')
      .select('id, subject_id, title, slug, position, status')
      .eq('release_id', releaseId)
      .eq('status', 'published')
      .order('position', { ascending: true })

    if (error) throw error
    return data ?? []
  })
}

export async function getChapters(curriculumSubjectId: string) {
  return cached(`chapters:${curriculumSubjectId}`, async () => {
    const { data, error } = await client()
      .from('chapters')
      .select(`
        id,
        chapter_number,
        title,
        slug,
        position,
        description,
        estimated_minutes,
        status
      `)
      .eq('curriculum_subject_id', curriculumSubjectId)
      .eq('status', 'published')
      .order('position', { ascending: true })

    if (error) throw error
    return data ?? []
  })
}

export async function getChapterTree(chapterId: string) {
  return cached(`chapter-tree:${chapterId}`, async () => {
    const { data, error } = await client()
      .from('topics')
      .select(`
        id,
        title,
        slug,
        position,
        lessons (
          id,
          title,
          slug,
          position,
          lesson_type,
          estimated_minutes,
          status
        )
      `)
      .eq('chapter_id', chapterId)
      .eq('status', 'published')
      .order('position', { ascending: true })

    if (error) throw error
    return data ?? []
  })
}

/**
 * Production lesson reader. Only complete lesson versions that passed every
 * publication gate are returned here.
 */
export async function getLessonContent(lessonId: string) {
  return cached(`lesson:${lessonId}`, async () => {
    const { data, error } = await client()
      .from('lesson_version_content_v3')
      .select(`
        version_id,
        lesson_id,
        version,
        status,
        content_schema_version,
        blocks,
        key_terms,
        formulas,
        examples,
        exercises,
        sources
      `)
      .eq('lesson_id', lessonId)
      .eq('status', 'published')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }, LESSON_CACHE_TTL_MS)
}

/**
 * Verified-only content stream for building/previewing the lesson UI while
 * full factual verification is still running. The database export contains
 * only source rows whose extracted claims have no unresolved factual state.
 * Unverified claims never appear in this payload.
 *
 * Do not treat `is_fully_verified=false` as a complete lesson. The production
 * reader above remains the only path for fully published lesson versions.
 */
export async function getVerifiedLessonContent(
  lessonId: string
): Promise<VerifiedLessonContentExport | null> {
  return cached(`verified-lesson:${lessonId}`, async () => {
    const { data, error } = await client()
      .from('lesson_verified_content_exports')
      .select(`
        version_id,
        lesson_id,
        blocks,
        key_terms,
        formulas,
        examples,
        exercises,
        verification_summary,
        is_fully_verified,
        generated_at
      `)
      .eq('lesson_id', lessonId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data as VerifiedLessonContentExport | null
  }, LESSON_CACHE_TTL_MS)
}
