// Reads competitive tables defensively: selects "*" and normalises column
// aliases, so it survives small naming differences in migration 004.
// Only tables created by migration 202609090004 are queried here.
import { getSupabase } from '@/lib/supabase'

export class CompetitiveUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompetitiveUnavailableError'
  }
}

type Row = Record<string, unknown>

type Builder = {
  select: (columns: string) => Builder
  order: (column: string, opts: { ascending: boolean }) => Builder
  range: (from: number, to: number) => Promise<{ data: Row[] | null; error: { message: string } | null }>
}

type Client = {
  from: (table: string) => Builder
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

const client = (): Client => getSupabase() as unknown as Client

const PAGE = 200
const MAX_ROWS = 5000

async function all(table: string): Promise<Row[]> {
  const sb = client()
  const out: Row[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new CompetitiveUnavailableError(error.message)
    const batch = data ?? []
    out.push(...batch)
    if (batch.length < PAGE) break
  }
  return out
}

function pick(row: Row, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return undefined
}

function pickNumber(row: Row, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return undefined
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export type ExamSummary = {
  examId: string
  key: string
  name: string
  shortName: string
  authority?: string
  cycleId?: string
  cycleCode?: string
  cycleLabel?: string
  dataKind?: string
  sourceName?: string
  sourceUrl?: string
  lastVerifiedAt?: string
  reviewerPreview: boolean
}

export type ExamSubject = { id: string; examId?: string; slug: string; name: string; position: number }
export type ExamUnit = { id: string; subjectId?: string; key: string; name: string; position: number }
export type ExamTopic = { id: string; unitId?: string; key: string; name: string; position: number }

export type ConceptLink = {
  id: string
  topicId?: string
  depthLayer: 'core' | 'board' | 'competitive' | 'advanced'
  linkKind: 'chapter' | 'topic' | 'lesson' | 'formula' | 'visualization'
  label?: string
  chapterId?: string
  contentTopicId?: string
  lessonId?: string
  formulaKey?: string
  visualizationId?: string
}

export type MockDefinition = {
  id: string
  examId?: string
  key: string
  name: string
  durationMinutes?: number
  dataKind?: string
}

export type MockSection = {
  id: string
  mockId?: string
  name: string
  questionCount?: number
  correctMarks: number
  incorrectMarks: number
  unattemptedMarks: number
  position: number
}

function toSummaryFromRpc(row: Row): ExamSummary | null {
  const examId = pick(row, ['examId', 'exam_id', 'id'])
  const key = pick(row, ['key', 'examKey', 'exam_key'])
  const name = pick(row, ['name', 'examName'])
  if (!examId || !key || !name) return null
  return {
    examId,
    key,
    name,
    shortName: pick(row, ['shortName', 'short_name']) ?? name,
    authority: pick(row, ['authority', 'organisation', 'organization']),
    cycleId: pick(row, ['cycleId', 'cycle_id']),
    cycleCode: pick(row, ['cycleCode', 'cycle_code']),
    cycleLabel: pick(row, ['cycleLabel', 'cycle_label']),
    dataKind: pick(row, ['dataKind', 'data_kind']),
    sourceName: pick(row, ['sourceName', 'source_name']),
    sourceUrl: pick(row, ['sourceUrl', 'source_url']),
    lastVerifiedAt: pick(row, ['lastVerifiedAt', 'last_verified_at']),
    reviewerPreview: row['reviewerPreview'] === true || row['reviewer_preview'] === true,
  }
}

export const competitiveRepository = {
  async resolveMyExams(): Promise<ExamSummary[]> {
    const { data, error } = await client().rpc('resolve_my_exams')
    if (error) throw new CompetitiveUnavailableError(error.message)
    const list = Array.isArray(data) ? (data as Row[]) : []
    const seen = new Set<string>()
    const exams: ExamSummary[] = []
    for (const row of list) {
      const summary = toSummaryFromRpc(row)
      if (!summary) continue
      const dedupe = `${summary.key}:${summary.cycleId ?? ''}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      exams.push(summary)
    }
    return exams
  },

  async getExamByKey(key: string): Promise<ExamSummary | undefined> {
    const exams = await this.resolveMyExams()
    return exams.find((exam) => exam.key === key)
  },

  async getSubjects(examId: string): Promise<ExamSubject[]> {
    const rows = await all('exam_subjects')
    return rows
      .filter((row) => pick(row, ['exam_id', 'cycle_id']) === examId || pick(row, ['cycle_id']) === examId)
      .map((row, index) => {
        const name = pick(row, ['name', 'title', 'label']) ?? 'Subject'
        return {
          id: pick(row, ['id']) ?? `${index}`,
          examId,
          slug: pick(row, ['slug', 'subject_slug', 'key']) ?? slugify(name),
          name,
          position: pickNumber(row, ['position', 'sort_order', 'display_order']) ?? index,
        }
      })
      .sort((a, b) => a.position - b.position)
  },

  async getUnits(subjectId: string): Promise<ExamUnit[]> {
    const rows = await all('exam_units')
    return rows
      .filter((row) => pick(row, ['subject_id', 'exam_subject_id']) === subjectId)
      .map((row, index) => {
        const name = pick(row, ['name', 'title', 'label']) ?? 'Unit'
        return {
          id: pick(row, ['id']) ?? `${index}`,
          subjectId,
          key: pick(row, ['key', 'slug']) ?? slugify(name),
          name,
          position: pickNumber(row, ['position', 'sort_order', 'display_order']) ?? index,
        }
      })
      .sort((a, b) => a.position - b.position)
  },

  async getTopics(unitIds: string[]): Promise<ExamTopic[]> {
    if (unitIds.length === 0) return []
    const wanted = new Set(unitIds)
    const rows = await all('exam_topics')
    return rows
      .filter((row) => {
        const unitId = pick(row, ['unit_id', 'exam_unit_id'])
        return unitId !== undefined && wanted.has(unitId)
      })
      .map((row, index) => {
        const name = pick(row, ['name', 'title', 'label']) ?? 'Topic'
        return {
          id: pick(row, ['id']) ?? `${index}`,
          unitId: pick(row, ['unit_id', 'exam_unit_id']),
          key: pick(row, ['key', 'slug']) ?? slugify(name),
          name,
          position: pickNumber(row, ['position', 'sort_order', 'display_order']) ?? index,
        }
      })
      .sort((a, b) => a.position - b.position)
  },

  async getTopicById(topicId: string): Promise<ExamTopic | undefined> {
    const rows = await all('exam_topics')
    const row = rows.find((candidate) => pick(candidate, ['id']) === topicId)
    if (!row) return undefined
    const name = pick(row, ['name', 'title', 'label']) ?? 'Topic'
    return {
      id: topicId,
      unitId: pick(row, ['unit_id', 'exam_unit_id']),
      key: pick(row, ['key', 'slug']) ?? slugify(name),
      name,
      position: pickNumber(row, ['position', 'sort_order', 'display_order']) ?? 0,
    }
  },

  async getConceptLinks(topicIds: string[]): Promise<ConceptLink[]> {
    if (topicIds.length === 0) return []
    const wanted = new Set(topicIds)
    const rows = await all('exam_concept_links')
    const layers = new Set(['core', 'board', 'competitive', 'advanced'])
    const kinds = new Set(['chapter', 'topic', 'lesson', 'formula', 'visualization'])
    return rows
      .filter((row) => {
        const topicId = pick(row, ['exam_topic_id', 'topic_id'])
        return topicId !== undefined && wanted.has(topicId)
      })
      .map((row, index) => {
        const depth = pick(row, ['depth_layer']) ?? 'board'
        const kind = pick(row, ['link_kind']) ?? 'lesson'
        return {
          id: pick(row, ['id']) ?? `${index}`,
          topicId: pick(row, ['exam_topic_id', 'topic_id']),
          depthLayer: (layers.has(depth) ? depth : 'board') as ConceptLink['depthLayer'],
          linkKind: (kinds.has(kind) ? kind : 'lesson') as ConceptLink['linkKind'],
          label: pick(row, ['label', 'name', 'title']),
          chapterId: pick(row, ['chapter_id']),
          contentTopicId: pick(row, ['content_topic_id']),
          lessonId: pick(row, ['lesson_id']),
          formulaKey: pick(row, ['formula_key']),
          visualizationId: pick(row, ['visualization_id']),
        }
      })
  },

  async getMocks(examId: string): Promise<MockDefinition[]> {
    const rows = await all('mock_definitions')
    return rows
      .filter((row) => pick(row, ['exam_id', 'cycle_id']) === examId || pick(row, ['cycle_id']) === examId)
      .map((row, index) => {
        const name = pick(row, ['name', 'title', 'label']) ?? 'Mock test'
        return {
          id: pick(row, ['id']) ?? `${index}`,
          examId,
          key: pick(row, ['key', 'slug']) ?? slugify(name),
          name,
          durationMinutes: pickNumber(row, ['duration_minutes', 'duration']),
          dataKind: pick(row, ['data_kind']),
        }
      })
  },

  async getMockSections(mockId: string): Promise<MockSection[]> {
    const rows = await all('mock_sections')
    return rows
      .filter((row) => pick(row, ['mock_id', 'mock_definition_id']) === mockId)
      .map((row, index) => ({
        id: pick(row, ['id']) ?? `${index}`,
        mockId,
        name: pick(row, ['name', 'title', 'label']) ?? 'Section',
        questionCount: pickNumber(row, ['question_count']),
        correctMarks: pickNumber(row, ['correct_marks']) ?? 1,
        incorrectMarks: pickNumber(row, ['incorrect_marks']) ?? 0,
        unattemptedMarks: pickNumber(row, ['unattempted_marks']) ?? 0,
        position: pickNumber(row, ['position', 'sort_order']) ?? index,
      }))
      .sort((a, b) => a.position - b.position)
  },
}
