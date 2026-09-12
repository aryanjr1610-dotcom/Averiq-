import { z } from 'zod'

export const DEPTH_LAYERS = ['core', 'board', 'competitive', 'advanced'] as const
export const COMPETITIVE_LEVELS = ['foundation', 'standard', 'advanced'] as const
export const SOURCE_TYPES = ['original', 'sample', 'board-style', 'pyq'] as const

export type DepthLayer = (typeof DEPTH_LAYERS)[number]
export type CompetitiveLevel = (typeof COMPETITIVE_LEVELS)[number]
export type SourceType = (typeof SOURCE_TYPES)[number]

const uuid = z.string().uuid()
const slug = z.string().min(1).max(120)

export const ExamSummarySchema = z.object({
  examId: uuid,
  key: slug,
  name: z.string().min(1),
  shortName: z.string().min(1),
  authority: z.string().nullable().default(null),
  cycleId: uuid,
  cycleCode: slug,
  cycleLabel: z.string().min(1),
  dataKind: z.enum(['sample', 'official']),
  sourceName: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
  lastVerifiedAt: z.string().nullable().default(null),
  reviewerPreview: z.boolean(),
})
export type ExamSummary = z.infer<typeof ExamSummarySchema>

export const ExamSubjectSchema = z.object({
  id: uuid,
  cycle_id: uuid,
  subject_id: uuid,
  title: z.string(),
  slug,
  position: z.number().int(),
  status: z.string(),
})
export type ExamSubjectRow = z.infer<typeof ExamSubjectSchema>

export const ExamUnitSchema = z.object({
  id: uuid,
  exam_subject_id: uuid,
  title: z.string(),
  slug,
  position: z.number().int(),
  description: z.string(),
  status: z.string(),
})
export type ExamUnitRow = z.infer<typeof ExamUnitSchema>

export const ExamTopicSchema = z.object({
  id: uuid,
  unit_id: uuid,
  title: z.string(),
  slug,
  position: z.number().int(),
  depth_note: z.string(),
  status: z.string(),
})
export type ExamTopicRow = z.infer<typeof ExamTopicSchema>

export const ConceptLinkSchema = z.object({
  id: uuid,
  exam_topic_id: uuid,
  depth_layer: z.enum(DEPTH_LAYERS),
  link_kind: z.enum(['chapter', 'topic', 'lesson', 'formula', 'visualization']),
  chapter_id: uuid.nullable(),
  content_topic_id: uuid.nullable(),
  lesson_id: uuid.nullable(),
  formula_key: z.string().nullable(),
  visualization_id: z.string().nullable(),
  note: z.string(),
  position: z.number().int(),
})
export type ConceptLink = z.infer<typeof ConceptLinkSchema>

export const QuestionTagSchema = z.object({
  id: uuid,
  question_id: uuid,
  exam_id: uuid,
  exam_topic_id: uuid.nullable(),
  competitive_level: z.enum(COMPETITIVE_LEVELS),
  source_type: z.enum(SOURCE_TYPES),
  source_year: z.number().int().nullable(),
  paper_session: z.string().nullable(),
  source_reference: z.string().nullable(),
  source_url: z.string().nullable(),
})
export type QuestionTag = z.infer<typeof QuestionTagSchema>

export const MockDefinitionSchema = z.object({
  id: uuid,
  cycle_id: uuid,
  key: slug,
  title: z.string(),
  duration_minutes: z.number().int(),
  data_kind: z.string(),
  navigation: z.record(z.unknown()),
  status: z.string(),
})
export type MockDefinition = z.infer<typeof MockDefinitionSchema>

export const MockSectionSchema = z.object({
  id: uuid,
  mock_id: uuid,
  exam_subject_id: uuid.nullable(),
  title: z.string(),
  position: z.number().int(),
  question_count: z.number().int(),
  question_types: z.array(z.string()),
  difficulty_levels: z.array(z.string()),
  competitive_levels: z.array(z.string()),
  correct_marks: z.coerce.number(),
  incorrect_marks: z.coerce.number(),
  unattempted_marks: z.coerce.number(),
})
export type MockSection = z.infer<typeof MockSectionSchema>

/** Marking is always configuration, never a hard-coded +4/-1. */
export type MarkingRule = {
  correctMarks: number
  incorrectMarks: number
  unattemptedMarks: number
}

export const DEFAULT_MARKING: MarkingRule = {
  correctMarks: 1,
  incorrectMarks: 0,
  unattemptedMarks: 0,
}

export function markingFromSection(section: MockSection): MarkingRule {
  return {
    correctMarks: section.correct_marks,
    incorrectMarks: section.incorrect_marks,
    unattemptedMarks: section.unattempted_marks,
  }
}

export function depthLayerLabel(layer: DepthLayer): string {
  switch (layer) {
    case 'core':
      return 'Core idea'
    case 'board':
      return 'Board depth'
    case 'competitive':
      return 'Competitive depth'
    case 'advanced':
      return 'Advanced extension'
  }
}
