// The ONLY door between the competitive layer and the Phase 11 Practice Engine.
// Nothing here queries `questions`, `practice_sessions` or `question_attempts`
// directly, because those tables were created in a different session.

export type BridgeQuestionType = 'mcq' | 'multiple-select' | 'numeric' | 'short-answer'

export type BridgeOption = { id: string; text: string }

export type BridgeAnswerKey = {
  optionIds?: string[]
  value?: number
  tolerance?: number
  keyPoints?: string[]
}

export type BridgeQuestion = {
  id: string
  type: BridgeQuestionType
  prompt: string
  options?: BridgeOption[]
  marks?: number
  negativeMarks?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  competitiveLevel?: 'foundation' | 'standard' | 'advanced'
  hint?: string
  solution?: string
  answer?: BridgeAnswerKey
  lessonId?: string
  formulaKeys?: string[]
  visualizationId?: string
  examTopicId?: string
}

export type BridgeResponse =
  | { kind: 'options'; optionIds: string[] }
  | { kind: 'numeric'; value: number | null; raw: string }
  | { kind: 'text'; text: string }

export type BridgeEvaluation = {
  outcome: 'correct' | 'incorrect' | 'ungraded'
  explanation?: string
}

export type QuestionFetchFilter = {
  examId: string
  examKey: string
  subjectId?: string
  unitId?: string
  examTopicIds?: string[]
  difficulty?: Array<'easy' | 'medium' | 'hard'>
  competitiveLevel?: Array<'foundation' | 'standard' | 'advanced'>
  types?: BridgeQuestionType[]
  sourceType?: Array<'original' | 'sample' | 'board-style' | 'pyq'>
  sourceYear?: number
  count: number
  includeSolutions: boolean
}

export type SessionRecordPayload = {
  examKey: string
  mode: 'learn' | 'exam'
  startedAt: string
  submittedAt: string
  score: number
  maxScore: number
  answers: Array<{ questionId: string; outcome: BridgeEvaluation['outcome']; response: BridgeResponse | null }>
}

export type CompetitiveIntegration = {
  fetchQuestions: (filter: QuestionFetchFilter) => Promise<BridgeQuestion[]>
  evaluate?: (question: BridgeQuestion, response: BridgeResponse) => BridgeEvaluation
  recordSession?: (payload: SessionRecordPayload) => Promise<void>
  lessonHref?: (lessonId: string) => string
  formulaHref?: (formulaKey: string) => string
  revisionHref?: (args: { examKey: string; subjectSlug?: string }) => string
}

let integration: CompetitiveIntegration | null = null

export const INTEGRATION_MISSING_MESSAGE =
  'The practice engine is not connected to the competitive layer yet.'

export function registerCompetitiveIntegration(next: CompetitiveIntegration): void {
  integration = next
}

export function getCompetitiveIntegration(): CompetitiveIntegration | null {
  return integration
}

export function evaluateBridgeAnswer(
  question: BridgeQuestion,
  response: BridgeResponse | null,
): BridgeEvaluation {
  const custom = integration?.evaluate
  if (custom && response) return custom(question, response)
  if (!response) return { outcome: 'incorrect', explanation: 'Not attempted.' }
  const key = question.answer
  if (!key) return { outcome: 'ungraded', explanation: 'No stored answer key was provided.' }

  if (response.kind === 'options' && key.optionIds) {
    const expected = [...key.optionIds].sort().join('|')
    const given = [...response.optionIds].sort().join('|')
    return { outcome: expected === given ? 'correct' : 'incorrect' }
  }
  if (response.kind === 'numeric' && typeof key.value === 'number') {
    if (response.value === null || !Number.isFinite(response.value)) return { outcome: 'incorrect' }
    const tolerance = key.tolerance ?? Math.max(Math.abs(key.value) * 0.01, 1e-9)
    return { outcome: Math.abs(response.value - key.value) <= tolerance ? 'correct' : 'incorrect' }
  }
  if (response.kind === 'text') {
    return {
      outcome: 'ungraded',
      explanation: key.keyPoints?.length
        ? `Compare your answer with these key points: ${key.keyPoints.join('; ')}`
        : 'Short answers are reviewed against stored key points, not auto-scored.',
    }
  }
  return { outcome: 'ungraded' }
}
