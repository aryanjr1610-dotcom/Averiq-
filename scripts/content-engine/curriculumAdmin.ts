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
  focus: string
  /**
   * Prefer `Concept name::Detailed explanation` entries.
   * The v2 database seeder turns each item into its own structured
   * explanation block and key-term record.
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

  if (error) throw error
  return data as string
}

export async function seedUnit(options: {
  board: BoardCode
  grade: number
  academicYear?: string
  subjectSlug: string
  curriculumSubjectId: string
  unit: UnitInput
}) {
  const {
    board,
    grade,
    academicYear = '2026-27',
    subjectSlug,
    curriculumSubjectId,
    unit,
  } = options

  const jobKey = [
    'averiq',
    academicYear,
    board,
    grade,
    subjectSlug,
    unit.slug,
  ].join(':')

  const { data, error } = await supabaseAdmin.rpc('seed_curriculum_unit_v2', {
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

  if (error) throw error
  return data
}

/**
 * Preferred high-volume import path.
 * One RPC call seeds the subject and all of its units atomically through
 * the server-only v2 ingestion pipeline.
 */
export async function seedSubject(options: {
  releaseId: string
  board: BoardCode
  grade: number
  subject: SubjectInput
  units: UnitInput[]
}) {
  const { releaseId, board, grade, subject, units } = options

  if (units.length === 0) {
    throw new Error(`Cannot seed ${subject.title}: no units supplied`)
  }

  const source = units[0]
  const payload = units.map(unit => ({
    number: unit.number,
    title: unit.title,
    slug: unit.slug,
    position: unit.position,
    focus: unit.focus,
    concepts: unit.concepts,
  }))

  const { data, error } = await supabaseAdmin.rpc('seed_subject_units_v2', {
    p_release_id: releaseId,
    p_subject_code: subject.code,
    p_subject_title: subject.title,
    p_subject_slug: subject.slug,
    p_subject_position: subject.position,
    p_board_code: board,
    p_grade_level: grade,
    p_units: payload,
    p_source_name: source.sourceName,
    p_source_url: source.sourceUrl,
    p_source_document: source.sourceDocument,
  })

  if (error) throw error

  console.log(`✓ ${subject.title}: ${units.length} units seeded`)
  return data
}
