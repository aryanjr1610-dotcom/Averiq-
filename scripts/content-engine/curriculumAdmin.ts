import { supabaseAdmin } from './adminClient'

export type BoardCode = 'cbse' | 'cisce'

export interface ReleaseInput {
  board: BoardCode
  trackCode: string
  trackTitle: string
  minimumGrade: number
  maximumGrade: number
  grade: number
  academicYear: string
  sourceName: string
  sourceUrl?: string
  sourceDocument?: string
  verified: boolean
}

export interface SubjectInput {
  code: string
  title: string
  slug: string
  position: number
}

export interface UnitInput {
  number: string
  title: string
  slug: string
  position: number
  /**
   * Detailed explanation of exactly
   * what this chapter/unit must teach.
   */
  focus: string
  /**
   * Every major concept that must
   * occur in this unit.
   */
  concepts: string[]
  sourceName: string
  sourceUrl: string
  sourceDocument: string
}

export async function ensureRelease(input: ReleaseInput) {
  const { data, error } = await supabaseAdmin.rpc(
    'ensure_curriculum_release_v1',
    {
      p_board_code: input.board,
      p_track_code: input.trackCode,
      p_track_title: input.trackTitle,
      p_minimum_grade: input.minimumGrade,
      p_maximum_grade: input.maximumGrade,
      p_grade_level: input.grade,
      p_academic_year_code: input.academicYear,
      p_source_name: input.sourceName,
      p_source_url: input.sourceUrl ?? null,
      p_source_document: input.sourceDocument ?? null,
      p_verified: input.verified,
    }
  )

  if (error) {
    throw error
  }

  return data as string
}

export async function ensureSubject(
  releaseId: string,
  input: SubjectInput
) {
  const { data, error } = await supabaseAdmin.rpc(
    'ensure_curriculum_subject_v1',
    {
      p_release_id: releaseId,
      p_subject_code: input.code,
      p_subject_title: input.title,
      p_subject_slug: input.slug,
      p_position: input.position,
    }
  )

  if (error) {
    throw error
  }

  return data as string
}

export async function seedUnit(options: {
  board: BoardCode
  grade: number
  subjectSlug: string
  curriculumSubjectId: string
  unit: UnitInput
}) {
  const { board, grade, subjectSlug, curriculumSubjectId, unit } = options
  const jobKey = [
    'averiq',
    '2026-27',
    board,
    grade,
    subjectSlug,
    unit.slug,
  ].join(':')

  const { data, error } = await supabaseAdmin.rpc('seed_curriculum_unit_v1', {
    p_curriculum_subject_id: curriculumSubjectId,
    p_chapter_number: unit.number,
    p_title: unit.title,
    p_slug: unit.slug,
    p_position: unit.position,
    p_focus: unit.focus,
    p_concepts: unit.concepts,
    p_source_name: unit.sourceName,
    p_source_url: unit.sourceUrl,
    p_source_document: unit.sourceDocument,
    p_job_key: jobKey,
  })

  if (error) {
    throw error
  }

  return data
}

export async function seedSubject(options: {
  releaseId: string
  board: BoardCode
  grade: number
  subject: SubjectInput
  units: UnitInput[]
}) {
  const { releaseId, board, grade, subject, units } = options
  const subjectId = await ensureSubject(releaseId, subject)
  console.log(`\n${subject.title}`)

  for (const unit of units) {
    try {
      const result = await seedUnit({
        board,
        grade,
        subjectSlug: subject.slug,
        curriculumSubjectId: subjectId,
        unit,
      })
      console.log(`✓ ${unit.number}. ${unit.title}`)
      console.log(result)
    } catch (error) {
      console.error(`✗ ${unit.title}`, error)
    }
  }

  return subjectId
}
