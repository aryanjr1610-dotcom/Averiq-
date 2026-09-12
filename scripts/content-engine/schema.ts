import { z } from 'zod';

const metadataSchema = z.record(z.string(), z.unknown()).optional();

export const sourceSchema = z.object({
  source_key: z.string().min(1),
  source_name: z.string().min(1),
  source_url: z.string().url().startsWith('https://'),
  source_role: z.enum([
    'syllabus', 'curriculum', 'textbook_reference', 'oer', 'reference', 'fact_check', 'validation',
  ]),
  authority_level: z.enum([
    'official', 'primary', 'secondary', 'supplementary',
  ]),
  license_code: z.string().optional(),
  rights_status: z.enum([
    'metadata_only', 'reference_only', 'adaptation_allowed', 'commercial_reuse_allowed', 'permission_required',
  ]),
  source_document: z.string().optional(),
  source_publication_date: z.string().optional(),
  metadata: metadataSchema,
});

export const blockSchema = z.object({
  block_key: z.string().min(1),
  position: z.number().int().nonnegative(),
  block_type: z.enum([
    'overview', 'learning_objectives', 'prerequisites', 'introduction', 'concept', 'definition', 'explanation', 'derivation', 'proof', 'law', 'principle', 'theorem', 'formula', 'application', 'worked_example', 'common_mistake', 'misconception', 'exam_note', 'key_points', 'summary', 'quick_revision', 'detailed_revision', 'practice', 'comparison', 'note', 'list', 'table',
  ]),
  depth_level: z.enum([
    'foundation', 'board', 'advanced',
  ]),
  heading: z.string().optional(),
  body: z.string().min(1),
  metadata: metadataSchema,
  visual_slot_key: z.string().optional(),
});

export const keyTermSchema = z.object({
  block_key: z.string().optional(),
  term: z.string().min(1),
  definition: z.string().min(1),
  position: z.number().int().nonnegative(),
  metadata: metadataSchema,
});

export const formulaSchema = z.object({
  block_key: z.string().optional(),
  formula_key: z.string().min(1),
  position: z.number().int().nonnegative(),
  kind: z.enum([
    'formula', 'theorem', 'law', 'principle', 'identity', 'rule',
  ]),
  name: z.string().min(1),
  statement: z.string().min(1),
  expression_latex: z.string().optional(),
  derivation: z.string().optional(),
  conditions: z.string().optional(),
  variables: z.array(
    z.object({
      symbol: z.string().min(1),
      meaning: z.string().min(1),
      unit: z.string().nullable().optional(),
    }),
  ).optional(),
  units_notes: z.string().optional(),
  common_mistakes: z.string().optional(),
  metadata: metadataSchema,
});

export const exampleSchema = z.object({
  block_key: z.string().optional(),
  example_key: z.string().min(1),
  position: z.number().int().nonnegative(),
  title: z.string().optional(),
  problem_statement: z.string().min(1),
  given_data: z.string().optional(),
  approach: z.string().optional(),
  solution: z.string().min(1),
  final_answer: z.string().optional(),
  explanation: z.string().optional(),
  depth_level: z.enum([
    'foundation', 'board', 'advanced',
  ]),
  difficulty: z.enum([
    'easy', 'medium', 'hard', 'advanced',
  ]),
  metadata: metadataSchema,
});

export const exerciseSchema = z.object({
  block_key: z.string().optional(),
  question_key: z.string().min(1),
  position: z.number().int().nonnegative(),
  question_type: z.enum([
    'mcq', 'true_false', 'fill_blank', 'match', 'very_short', 'short_answer', 'long_answer', 'numerical', 'assertion_reason', 'case_based', 'competency', 'hots', 'proof', 'derivation',
  ]),
  question_text: z.string().min(1),
  options: z.array(
    z.object({
      key: z.string().min(1),
      text: z.string().min(1),
    }),
  ).optional(),
  answer: z.unknown().optional(),
  solution: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.enum([
    'easy', 'medium', 'hard', 'advanced',
  ]),
  marks: z.number().int().nonnegative().optional(),
  competency_tags: z.array(z.string()).optional(),
  metadata: metadataSchema,
});

export const lessonPayloadSchema = z.object({
  topic: z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    position: z.number().int().nonnegative(),
  }),
  lesson: z.object({
    title: z.string().min(1),
    slug: z.string().min(1),
    position: z.number().int().nonnegative(),
    lesson_type: z.string().optional(),
    estimated_minutes: z.number().int().positive().optional(),
  }),
  blocks: z.array(blockSchema).min(4),
  key_terms: z.array(keyTermSchema).default([]),
  formulas: z.array(formulaSchema).default([]),
  examples: z.array(exampleSchema).default([]),
  exercises: z.array(exerciseSchema).min(1),
  sources: z.array(sourceSchema).min(1),
});
