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

const client = () => getSupabase()

/**
 * Preferred student-facing resolver.
 * Supabase resolves the signed-in user's board, class, academic year and
 * selected subjects. Draft academic releases remain invisible.
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
}

export async function getSubjects(releaseId: string) {
  const { data, error } = await client()
    .from('curriculum_subjects')
    .select('id, subject_id, title, slug, position, status')
    .eq('release_id', releaseId)
    .eq('status', 'published')
    .order('position', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getChapters(curriculumSubjectId: string) {
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
}

export async function getChapterTree(chapterId: string) {
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
}

export async function getLessonContent(lessonId: string) {
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
}
