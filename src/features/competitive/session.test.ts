import { describe, expect, it } from 'vitest'
import type { BridgeQuestion } from './practice-bridge'
import {
  computeResult,
  createSession,
  formatClock,
  paletteStatus,
  sessionReducer,
} from './session'

const mcq = (id: string, correctOption: string): BridgeQuestion => ({
  id,
  type: 'mcq',
  prompt: `Question ${id}`,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  answer: { optionIds: [correctOption] },
})

const shortAnswer: BridgeQuestion = {
  id: 'q-short',
  type: 'short-answer',
  prompt: 'State the law.',
  answer: { keyPoints: ['inverse square', 'along the line joining charges'] },
}

describe('competitive session', () => {
  it('marks only the first question visited initially', () => {
    const state = createSession({ questions: [mcq('q1', 'a'), mcq('q2', 'b')], mode: 'learn' })
    expect(paletteStatus(state.questions[0]!)).toBe('unanswered')
    expect(paletteStatus(state.questions[1]!)).toBe('unvisited')
  })

  it('blocks per-question reveal in exam mode', () => {
    const exam = sessionReducer(
      createSession({ questions: [mcq('q1', 'a')], mode: 'exam' }),
      { type: 'revealCurrent' },
    )
    expect(exam.questions[0]!.revealed).toBe(false)
    const learn = sessionReducer(
      createSession({ questions: [mcq('q1', 'a')], mode: 'learn' }),
      { type: 'revealCurrent' },
    )
    expect(learn.questions[0]!.revealed).toBe(true)
  })

  it('tracks answered + marked for review', () => {
    let state = createSession({ questions: [mcq('q1', 'a')], mode: 'exam' })
    state = sessionReducer(state, { type: 'respond', response: { kind: 'options', optionIds: ['a'] } })
    state = sessionReducer(state, { type: 'toggleReview' })
    expect(paletteStatus(state.questions[0]!)).toBe('answered-review')
  })

  it('auto-submits when the timer reaches zero', () => {
    let state = createSession({ questions: [mcq('q1', 'a')], mode: 'exam', durationSeconds: 1 })
    state = sessionReducer(state, { type: 'tick' })
    expect(state.submitted).toBe(true)
    expect(state.remainingSeconds).toBe(0)
  })

  it('uses configurable marking and never auto-scores short answers', () => {
    let state = createSession({
      questions: [mcq('q1', 'a'), mcq('q2', 'a'), shortAnswer],
      mode: 'exam',
      marking: { correctMarks: 4, incorrectMarks: -1, unattemptedMarks: 0 },
    })
    state = sessionReducer(state, { type: 'respond', response: { kind: 'options', optionIds: ['a'] } })
    state = sessionReducer(state, { type: 'next' })
    state = sessionReducer(state, { type: 'respond', response: { kind: 'options', optionIds: ['b'] } })
    state = sessionReducer(state, { type: 'next' })
    state = sessionReducer(state, { type: 'respond', response: { kind: 'text', text: 'Inverse square law.' } })
    const result = computeResult(sessionReducer(state, { type: 'submit' }))
    expect(result.score).toBe(3)
    expect(result.correct).toBe(1)
    expect(result.incorrect).toBe(1)
    expect(result.ungraded).toBe(1)
    expect(result.accuracy).toBe(50)
  })

  it('formats the clock', () => {
    expect(formatClock(59)).toBe('00:59')
    expect(formatClock(3661)).toBe('1:01:01')
  })
})
