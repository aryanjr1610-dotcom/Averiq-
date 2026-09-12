type JsonRecord = Record<string, unknown>

export type NormalizedBlock = {
  id?: string
  block_key: string
  block_type: string
  position: number
  depth_level?: string
  heading?: string | null
  body: string
  metadata?: JsonRecord
}

export type NormalizedTerm = {
  id?: string
  term: string
  definition: string
  position: number
}

export type NormalizedFormula = {
  id: string
  formula_key: string
  position: number
  kind: string
  name: string
  statement: string
  expression_latex?: string | null
  derivation?: string | null
  conditions?: string | null
  variables?: Array<{ symbol?: string; meaning?: string; unit?: string }>
  units_notes?: string | null
  common_mistakes?: string | null
}

export type NormalizedExample = {
  id: string
  example_key: string
  position: number
  title?: string | null
  problem_statement: string
  given_data?: string | null
  approach?: string | null
  solution: string
  final_answer?: string | null
  explanation?: string | null
  difficulty?: string
}

export type NormalizedExercise = {
  id: string
  question_key: string
  position: number
  question_type: string
  question_text: string
  options?: unknown
  answer?: unknown
  solution?: string | null
  explanation?: string | null
  difficulty?: string
  marks?: number | null
  competency_tags?: string[]
}

export type NormalizedSource = {
  id?: string
  source_name?: string
  source_url?: string | null
  source_role?: string
  authority_level?: string
}

export type NormalizedStudyResources = {
  versionId: string
  lessonId: string
  blocks: NormalizedBlock[]
  keyTerms: NormalizedTerm[]
  formulas: NormalizedFormula[]
  examples: NormalizedExample[]
  exercises: NormalizedExercise[]
  sources: NormalizedSource[]
}

type NormalizedRow = Record<string, unknown>

type InlineText = { type: 'text'; text: string; marks: string[] }
const rich = (text: string): InlineText[] => [{ type: 'text', text: text.trim() || '—', marks: [] }]

function array<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function safeId(prefix: string, value: string, index = 0): string {
  const compact = value
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${prefix}${compact || index}`.slice(0, 79)
}

function tagsFor(block: NormalizedBlock): Array<'learn' | 'concept' | 'exam' | 'revision' | 'advanced'> {
  const tags: Array<'learn' | 'concept' | 'exam' | 'revision' | 'advanced'> = ['learn']
  if (['concept', 'definition', 'explanation', 'law', 'principle', 'theorem'].includes(block.block_type)) tags.push('concept')
  if (['exam_note'].includes(block.block_type)) tags.push('exam')
  if (['summary', 'quick_revision', 'detailed_revision', 'key_points', 'common_mistake', 'misconception'].includes(block.block_type)) tags.push('revision')
  if (block.depth_level === 'advanced') tags.push('advanced')
  return [...new Set(tags)]
}

export function parseNormalizedResources(row: NormalizedRow): NormalizedStudyResources {
  return {
    versionId: stringValue(row.version_id),
    lessonId: stringValue(row.lesson_id),
    blocks: array<NormalizedBlock>(row.blocks).sort((a, b) => a.position - b.position),
    keyTerms: array<NormalizedTerm>(row.key_terms).sort((a, b) => a.position - b.position),
    formulas: array<NormalizedFormula>(row.formulas).sort((a, b) => a.position - b.position),
    examples: array<NormalizedExample>(row.examples).sort((a, b) => a.position - b.position),
    exercises: array<NormalizedExercise>(row.exercises).sort((a, b) => a.position - b.position),
    sources: array<NormalizedSource>(row.sources),
  }
}

/**
 * Converts normalized-v3 database content into the reader's validated v2
 * document shape. This is presentation adaptation only; the normalized rows
 * remain the source of truth for formulas, exercises, terms and provenance.
 */
export function normalizedResourcesToDocument(resources: NormalizedStudyResources): unknown {
  const blocks: JsonRecord[] = []

  resources.blocks.forEach((item, index) => {
    const base = safeId('b-', item.block_key, index)
    const tags = tagsFor(item)
    if (item.heading?.trim()) {
      blocks.push({
        id: safeId('h-', item.block_key, index),
        type: 'heading',
        data: { level: 2, text: item.heading.trim() },
        tags,
      })
    }

    const body = item.body?.trim()
    if (!body) return

    if (item.block_type === 'definition') {
      blocks.push({ id: base, type: 'definition', data: { title: item.heading || 'Definition', content: rich(body) }, tags })
    } else if (item.block_type === 'concept' || item.block_type === 'overview') {
      blocks.push({ id: base, type: 'keyConcept', data: { title: item.heading || 'Key concept', content: rich(body) }, tags })
    } else if (item.block_type === 'common_mistake' || item.block_type === 'misconception') {
      blocks.push({ id: base, type: 'commonMistake', data: { title: item.heading || 'Common mistake', content: rich(body) }, tags })
    } else if (item.block_type === 'exam_note') {
      blocks.push({ id: base, type: 'examTip', data: { title: item.heading || 'Exam note', content: rich(body), contexts: [] }, tags })
    } else if (['summary', 'quick_revision', 'detailed_revision', 'key_points'].includes(item.block_type)) {
      blocks.push({ id: base, type: 'summary', data: { title: item.heading || 'Revision', content: rich(body) }, tags })
    } else if (item.block_type === 'application') {
      blocks.push({ id: base, type: 'important', data: { title: item.heading || 'Application', content: rich(body) }, tags })
    } else {
      blocks.push({ id: base, type: 'paragraph', data: { content: rich(body) }, tags })
    }
  })

  resources.keyTerms.forEach((term, index) => {
    blocks.push({
      id: safeId('term-', term.term, index),
      type: 'definition',
      data: { title: term.term, content: rich(term.definition) },
      tags: ['concept', 'revision'],
    })
  })

  resources.formulas.forEach((formula, index) => {
    const latex = formula.expression_latex?.trim()
    if (latex) {
      const variables = array<{ symbol?: string; meaning?: string; unit?: string }>(formula.variables)
        .filter((variable) => variable.symbol && variable.meaning)
        .map((variable) => ({
          symbol: stringValue(variable.symbol),
          meaning: stringValue(variable.meaning),
          ...(variable.unit ? { unit: variable.unit } : {}),
        }))
      blocks.push({
        id: safeId('formula-', formula.formula_key, index),
        type: 'formula',
        data: {
          name: formula.name,
          latex,
          alternative: formula.statement || formula.name,
          meaning: rich(formula.statement || formula.name),
          variables,
          ...(formula.units_notes ? { siUnits: formula.units_notes } : {}),
          conditions: formula.conditions ? [formula.conditions] : [],
          relatedFormulaIds: [],
        },
        tags: ['concept', 'exam', 'revision'],
      })
    }
    if (formula.derivation?.trim()) {
      blocks.push({
        id: safeId('derive-', formula.formula_key, index),
        type: 'important',
        data: { title: `Derivation — ${formula.name}`, content: rich(formula.derivation) },
        tags: ['concept', 'exam', 'revision'],
      })
    }
    if (formula.common_mistakes?.trim()) {
      blocks.push({
        id: safeId('fmistake-', formula.formula_key, index),
        type: 'commonMistake',
        data: { title: `${formula.name}: common mistake`, content: rich(formula.common_mistakes) },
        tags: ['exam', 'revision'],
      })
    }
  })

  resources.examples.forEach((example, index) => {
    const parts = [
      `Problem: ${example.problem_statement}`,
      example.given_data ? `Given: ${example.given_data}` : '',
      example.approach ? `Approach: ${example.approach}` : '',
      `Solution: ${example.solution}`,
      example.final_answer ? `Final answer: ${example.final_answer}` : '',
      example.explanation ? `Why it works: ${example.explanation}` : '',
    ].filter(Boolean).join('\n\n')
    blocks.push({
      id: safeId('example-', example.example_key, index),
      type: 'callout',
      data: { title: example.title || `Worked example ${index + 1}`, content: rich(parts) },
      tags: ['learn', 'exam'],
    })
  })

  return { schemaVersion: 2, blocks: blocks.slice(0, 300) }
}
