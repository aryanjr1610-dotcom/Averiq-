import type { BridgeEvaluation, BridgeQuestion, BridgeResponse } from './practice-bridge'
import { evaluateBridgeAnswer } from './practice-bridge'

export type SessionMode = 'learn' | 'exam'

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

export type QuestionState = {
  question: BridgeQuestion
  response: BridgeResponse | null
  visited: boolean
  markedForReview: boolean
  revealed: boolean
}

export type SessionState = {
  mode: SessionMode
  marking: MarkingRule
  index: number
  questions: QuestionState[]
  remainingSeconds: number | null
  submitted: boolean
  startedAt: string
}

export type SessionAction =
  | { type: 'goto'; index: number }
  | { type: 'next' }
  | { type: 'previous' }
  | { type: 'respond'; response: BridgeResponse }
  | { type: 'clear' }
  | { type: 'toggleReview' }
  | { type: 'revealCurrent' }
  | { type: 'tick' }
  | { type: 'submit' }

export function createSession(args: {
  questions: BridgeQuestion[]
  mode: SessionMode
  marking?: MarkingRule
  durationSeconds?: number | null
}): SessionState {
  return {
    mode: args.mode,
    marking: args.marking ?? DEFAULT_MARKING,
    index: 0,
    questions: args.questions.map((question, position) => ({
      question,
      response: null,
      visited: position === 0,
      markedForReview: false,
      revealed: false,
    })),
    remainingSeconds: args.durationSeconds ?? null,
    submitted: false,
    startedAt: new Date().toISOString(),
  }
}

export function hasResponse(state: QuestionState): boolean {
  const response = state.response
  if (!response) return false
  if (response.kind === 'options') return response.optionIds.length > 0
  if (response.kind === 'numeric') return response.raw.trim().length > 0
  return response.text.trim().length > 0
}

function replaceCurrent(state: SessionState, patch: Partial<QuestionState>): SessionState {
  const questions = state.questions.map((item, position) =>
    position === state.index ? { ...item, ...patch } : item,
  )
  return { ...state, questions }
}

function move(state: SessionState, index: number): SessionState {
  const bounded = Math.max(0, Math.min(index, state.questions.length - 1))
  const questions = state.questions.map((item, position) =>
    position === bounded ? { ...item, visited: true } : item,
  )
  return { ...state, index: bounded, questions }
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (state.submitted && action.type !== 'goto') return state
  switch (action.type) {
    case 'goto':
      return move(state, action.index)
    case 'next':
      return move(state, state.index + 1)
    case 'previous':
      return move(state, state.index - 1)
    case 'respond':
      return replaceCurrent(state, { response: action.response, visited: true })
    case 'clear':
      return replaceCurrent(state, { response: null })
    case 'toggleReview': {
      const current = state.questions[state.index]
      if (!current) return state
      return replaceCurrent(state, { markedForReview: !current.markedForReview })
    }
    case 'revealCurrent':
      // Exam mode never reveals solutions before submission.
      if (state.mode === 'exam') return state
      return replaceCurrent(state, { revealed: true })
    case 'tick': {
      if (state.remainingSeconds === null) return state
      const remaining = state.remainingSeconds - 1
      if (remaining <= 0) return { ...state, remainingSeconds: 0, submitted: true }
      return { ...state, remainingSeconds: remaining }
    }
    case 'submit':
      return { ...state, submitted: true }
    default:
      return state
  }
}

export type PaletteStatus = 'unvisited' | 'unanswered' | 'answered' | 'review' | 'answered-review'

export function paletteStatus(state: QuestionState): PaletteStatus {
  const answered = hasResponse(state)
  if (state.markedForReview) return answered ? 'answered-review' : 'review'
  if (answered) return 'answered'
  return state.visited ? 'unanswered' : 'unvisited'
}

export type SessionResult = {
  total: number
  attempted: number
  unattempted: number
  correct: number
  incorrect: number
  ungraded: number
  score: number
  maxScore: number
  accuracy: number
  evaluations: Array<{ questionId: string; evaluation: BridgeEvaluation }>
}

export function computeResult(state: SessionState): SessionResult {
  let attempted = 0
  let correct = 0
  let incorrect = 0
  let ungraded = 0
  let score = 0
  const evaluations: SessionResult['evaluations'] = []

  for (const item of state.questions) {
    const answered = hasResponse(item)
    if (!answered) {
      score += state.marking.unattemptedMarks
      evaluations.push({
        questionId: item.question.id,
        evaluation: { outcome: 'ungraded', explanation: 'Not attempted.' },
      })
      continue
    }
    attempted += 1
    const evaluation = evaluateBridgeAnswer(item.question, item.response)
    evaluations.push({ questionId: item.question.id, evaluation })
    if (evaluation.outcome === 'correct') {
      correct += 1
      score += item.question.marks ?? state.marking.correctMarks
    } else if (evaluation.outcome === 'incorrect') {
      incorrect += 1
      score += item.question.negativeMarks ?? state.marking.incorrectMarks
    } else {
      ungraded += 1
    }
  }

  const total = state.questions.length
  const graded = correct + incorrect
  return {
    total,
    attempted,
    unattempted: total - attempted,
    correct,
    incorrect,
    ungraded,
    score,
    maxScore: total * state.marking.correctMarks,
    accuracy: graded === 0 ? 0 : Math.round((correct / graded) * 100),
    evaluations,
  }
}

export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`
}
