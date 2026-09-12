import { supabase } from '../lib/supabase'

export type BoardCode = 'cbse' | 'cisce'

export async function getRelease(
  boardCode: BoardCode,
  gradeLevel: number,
  academicYear = '2026-27'
) {
  const { data: board, error: boardError } = await supabase
    .from('education_boards')
    .select('id')
    .eq('code', boardCode)
    .single()

  if (boardError) {
    throw boardError
  }

  const { data: year, error: yearError } = await supabase
    .from('academic_years')
    .select('id')
    .eq('code', academicYear)
    .single()

  if (yearError) {
    throw yearError
  }

  const { data: tracks, error: trackError } = await supabase
    .from('curriculum_tracks')
    .select(`
      id,
      minimum_grade,
      maximum_grade
    `)
    .eq('board_id', board.id)
    .eq('learning_context', 'school')
    .eq('status', 'active')

  if (trackError) {
    throw trackError
  }

  const track = tracks?.find(
    item =>
      (item.minimum_grade === null || item.minimum_grade <= gradeLevel) &&
      (item.maximum_grade === null || item.maximum_grade >= gradeLevel)
  )

  if (!track) {
    throw new Error(
      `No curriculum track found for ${boardCode} Class ${gradeLevel}`
    )
  }

  const { data: release, error: releaseError } = await supabase
    .from('curriculum_releases')
    .select(`
      id,
      grade_level,
      status,
      verification_status,
      source_name,
      source_url
    `)
    .eq('academic_year_id', year.id)
    .eq('track_id', track.id)
    .eq('grade_level', gradeLevel)
    .eq('status', 'published')
    .maybeSingle()

  if (releaseError) {
    throw releaseError
  }

  return release
}

export async function getSubjects(releaseId: string) {
  const { data, error } = await supabase
    .from('curriculum_subjects')
    .select(`
      id,
      subject_id,
      title,
      slug,
      position,
      status
    `)
    .eq('release_id', releaseId)
    .eq('status', 'published')
    .order('position', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getChapters(curriculumSubjectId: string) {
  const { data, error } = await supabase
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

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getChapterTree(chapterId: string) {
  const { data, error } = await supabase
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

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getLessonContent(lessonId: string) {
  const { data, error } = await supabase
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

  if (error) {
    throw error
  }

  return data
}
