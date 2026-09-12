import { useEffect, useMemo, useReducer, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { EmptyState, ErrorState } from '@/components/system/States'
import { getCompetitiveIntegration } from './practice-bridge'
import type { BridgeQuestion, QuestionFetchFilter } from './practice-bridge'
import { competitiveRepository } from './repository'
import {
  computeResult,
  createSession,
  formatClock,
  hasResponse,
  paletteStatus,
  sessionReducer,
  type MarkingRule,
  type SessionMode,
  type SessionState,
} from './session'
import './competitive.css'

type Boot =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty'; message: string }
  | { status: 'ready'; questions: BridgeQuestion[]; marking: MarkingRule; duration: number | null; mode: SessionMode; examKey: string }

export function ExamTestRunner() {
  const { examKey = '' } = useParams()
  const [params] = useSearchParams()
  const [boot, setBoot] = useState<Boot>({ status: 'loading' })
  const [paletteOpen, setPaletteOpen] = useState(false)

  const mode: SessionMode = params.get('mode') === 'learn' ? 'learn' : 'exam'
  const minutes = Number(params.get('minutes') ?? '')
  const count = Math.min(Math.max(Number(params.get('count') ?? '10') || 10, 1), 50)
  const topic = params.get('topic')
  const unit = params.get('unit')
  const subject = params.get('subject')
  const mockKey = params.get('mock')

  useEffect(() => {
    let active = true
    const run = async () => {
      const integration = getCompetitiveIntegration()
      if (!integration) {
        setBoot({ status: 'empty', message: 'The practice engine is not connected to the competitive layer yet.' })
        return
      }
      const exam = await competitiveRepository.getExamByKey(examKey)
      if (!exam) {
        setBoot({ status: 'empty', message: 'This exam is not available for your profile.' })
        return
      }
      let marking: MarkingRule = { correctMarks: 1, incorrectMarks: 0, unattemptedMarks: 0 }
      let duration: number | null = Number.isFinite(minutes) && minutes > 0 ? minutes * 60 : null

      if (mockKey) {
        const mocks = await competitiveRepository.getMocks(exam.examId)
        const mock = mocks.find((item) => item.key === mockKey)
        if (mock) {
          const sections = await competitiveRepository.getMockSections(mock.id)
          const first = sections[0]
          if (first) {
            marking = {
              correctMarks: first.correctMarks,
              incorrectMarks: first.incorrectMarks,
              unattemptedMarks: first.unattemptedMarks,
            }
          }
          if (mock.durationMinutes) duration = mock.durationMinutes * 60
        }
      }

      const filter: QuestionFetchFilter = {
        examId: exam.examId,
        examKey: exam.key,
        subjectId: subject ?? undefined,
        unitId: unit ?? undefined,
        examTopicIds: topic ? [topic] : undefined,
        count,
        includeSolutions: true,
      }
      const questions = await integration.fetchQuestions(filter)
      if (!active) return
      if (questions.length === 0) {
        setBoot({ status: 'empty', message: 'No questions are published for this selection yet.' })
        return
      }
      setBoot({ status: 'ready', questions, marking, duration, mode, examKey: exam.key })
    }
    run().catch((error: unknown) => {
      if (active) {
        setBoot({ status: 'error', message: error instanceof Error ? error.message : 'Could not start the test.' })
      }
    })
    return () => {
      active = false
    }
  }, [examKey, count, topic, unit, subject, mockKey, mode, minutes])

  return boot.status === 'ready' ? (
    <RunnerBody
      key={`${examKey}-${topic ?? unit ?? subject ?? mockKey ?? 'mixed'}`}
      questions={boot.questions}
      marking={boot.marking}
      duration={boot.duration}
      mode={boot.mode}
      examKey={boot.examKey}
      paletteOpen={paletteOpen}
      onPaletteToggle={setPaletteOpen}
    />
  ) : (
    <Container>
      {boot.status === 'loading' ? 'Preparing your test…' : null}
      {boot.status === 'error' ? <ErrorState title="Test unavailable" message={boot.message} /> : null}
      {boot.status === 'empty' ? <EmptyState title="Nothing to attempt yet" description={boot.message} /> : null}
    </Container>
  )
}

function RunnerBody(props: {
  questions: BridgeQuestion[]
  marking: MarkingRule
  duration: number | null
  mode: SessionMode
  examKey: string
  paletteOpen: boolean
  onPaletteToggle: (open: boolean) => void
}) {
  const initial = useMemo(
    () =>
      createSession({
        questions: props.questions,
        mode: props.mode,
        marking: props.marking,
        durationSeconds: props.duration,
      }),
    [props.questions, props.mode, props.marking, props.duration],
  )
  const [state, dispatch] = useReducer(sessionReducer, initial)

  useEffect(() => {
    if (state.remainingSeconds === null || state.submitted) return
    const id = window.setInterval(() => dispatch({ type: 'tick' }), 1000)
    return () => window.clearInterval(id)
  }, [state.remainingSeconds, state.submitted])

  const current = state.questions[state.index]
  const result = state.submitted ? computeResult(state) : null
  const integration = getCompetitiveIntegration()

  useEffect(() => {
    if (!result || !integration?.recordSession) return
    integration
      .recordSession({
        examKey: props.examKey,
        mode: state.mode,
        startedAt: state.startedAt,
        submittedAt: new Date().toISOString(),
        score: result.score,
        maxScore: result.maxScore,
        answers: state.questions.map((item, index) => ({
          questionId: item.question.id,
          outcome: result.evaluations[index]?.evaluation.outcome ?? 'ungraded',
          response: item.response,
        })),
      })
      .catch(() => undefined)
  }, [result, integration, props.examKey, state])

  if (result) {
    return (
      <Container>
        <h1>Results</h1>
        <ul className="result-grid">
          <li><strong>{result.score}</strong><span>Score (max {result.maxScore})</span></li>
          <li><strong>{result.accuracy}%</strong><span>Accuracy</span></li>
          <li><strong>{result.attempted}</strong><span>Attempted</span></li>
          <li><strong>{result.unattempted}</strong><span>Unattempted</span></li>
          <li><strong>{result.correct}</strong><span>Correct</span></li>
          <li><strong>{result.incorrect}</strong><span>Incorrect</span></li>
          {result.ungraded > 0 ? <li><strong>{result.ungraded}</strong><span>Needs self-review</span></li> : null}
        </ul>

        <h2>Review answers</h2>
        <ol className="review-list">
          {state.questions.map((item, index) => {
            const evaluation = result.evaluations[index]?.evaluation
            return (
              <li key={item.question.id}>
                <p className="review-prompt">{item.question.prompt}</p>
                <p className={`review-outcome review-outcome--${evaluation?.outcome ?? 'ungraded'}`}>
                  {evaluation?.outcome === 'correct' ? 'Correct' : evaluation?.outcome === 'incorrect' ? 'Incorrect' : 'Self-review'}
                  {evaluation?.explanation ? ` — ${evaluation.explanation}` : ''}
                </p>
                {item.question.solution ? <p className="review-solution">{item.question.solution}</p> : null}
                <p className="review-links">
                  {item.question.lessonId ? (
                    <Link to={integration?.lessonHref?.(item.question.lessonId) ?? `/app/learn/lessons/${item.question.lessonId}`}>
                      Related lesson
                    </Link>
                  ) : null}
                  {item.question.visualizationId ? (
                    <Link to={`/app/visual-lab/${item.question.visualizationId}`}>Visualise</Link>
                  ) : null}
                  {item.question.formulaKeys?.length ? <Link to="/app/formulas">Formula</Link> : null}
                </p>
              </li>
            )
          })}
        </ol>
        <Link className="exam-link" to={`/app/exams/${props.examKey}`}>Back to {props.examKey.toUpperCase()}</Link>
      </Container>
    )
  }

  if (!current) return <Container><EmptyState title="Nothing to attempt" description="There are no questions in this test session." /></Container>

  const answeredCount = state.questions.filter(hasResponse).length

  return (
    <Container>
      <header className="runner-bar">
        <span>Question {state.index + 1} of {state.questions.length}</span>
        <span aria-live="polite">
          {state.remainingSeconds !== null ? (
            <span className={state.remainingSeconds <= 60 ? 'runner-clock runner-clock--soon' : 'runner-clock'}>
              {formatClock(state.remainingSeconds)} left
            </span>
          ) : (
            `${answeredCount} answered`
          )}
        </span>
        {state.mode === 'exam' ? (
          <button type="button" className="runner-palette-toggle" onClick={() => props.onPaletteToggle(!props.paletteOpen)}>
            Questions
          </button>
        ) : null}
      </header>

      <div className="runner-layout">
        <div className="runner-main">
          <p className="runner-prompt">{current.question.prompt}</p>
          <QuestionInput
            question={current.question}
            value={current.response}
            onChange={(response) => dispatch({ type: 'respond', response })}
          />

          {state.mode === 'learn' ? (
            <div className="runner-learn-tools">
              {current.question.hint ? <details><summary>Hint</summary><p>{current.question.hint}</p></details> : null}
              <button type="button" onClick={() => dispatch({ type: 'revealCurrent' })}>Show solution</button>
              {current.revealed && current.question.solution ? <p className="review-solution">{current.question.solution}</p> : null}
            </div>
          ) : null}

          <div className="runner-controls">
            <button type="button" onClick={() => dispatch({ type: 'previous' })} disabled={state.index === 0}>Previous</button>
            <button type="button" onClick={() => dispatch({ type: 'clear' })}>Clear</button>
            <button type="button" aria-pressed={current.markedForReview} onClick={() => dispatch({ type: 'toggleReview' })}>
              Mark for review
            </button>
            {state.index === state.questions.length - 1 ? (
              <button type="button" className="runner-submit" onClick={() => dispatch({ type: 'submit' })}>Submit</button>
            ) : (
              <button type="button" onClick={() => dispatch({ type: 'next' })}>Next</button>
            )}
          </div>
          {state.mode === 'exam' ? (
            <button type="button" className="runner-submit-early" onClick={() => dispatch({ type: 'submit' })}>
              Submit test
            </button>
          ) : null}
        </div>

        {state.mode === 'exam' ? (
          <nav className={props.paletteOpen ? 'runner-palette runner-palette--open' : 'runner-palette'} aria-label="Question palette">
            <ul>
              {state.questions.map((item, index) => (
                <li key={item.question.id}>
                  <button
                    type="button"
                    className={`palette-dot palette-dot--${paletteStatus(item)}`}
                    aria-current={index === state.index}
                    aria-label={`Question ${index + 1}, ${paletteStatus(item).replace('-', ' and ')}`}
                    onClick={() => {
                      dispatch({ type: 'goto', index })
                      props.onPaletteToggle(false)
                    }}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </Container>
  )
}

function QuestionInput(props: {
  question: BridgeQuestion
  value: SessionState['questions'][number]['response']
  onChange: (response: NonNullable<SessionState['questions'][number]['response']>) => void
}) {
  const { question, value } = props
  if (question.type === 'mcq' || question.type === 'multiple-select') {
    const selected = value?.kind === 'options' ? value.optionIds : []
    const multiple = question.type === 'multiple-select'
    return (
      <fieldset className="runner-options">
        <legend className="runner-legend">{multiple ? 'Select all that apply' : 'Select one'}</legend>
        {(question.options ?? []).map((option) => (
          <label key={option.id}>
            <input
              type={multiple ? 'checkbox' : 'radio'}
              name={`q-${question.id}`}
              checked={selected.includes(option.id)}
              onChange={() => {
                const next = multiple
                  ? selected.includes(option.id)
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id]
                  : [option.id]
                props.onChange({ kind: 'options', optionIds: next })
              }}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </fieldset>
    )
  }
  if (question.type === 'numeric') {
    const raw = value?.kind === 'numeric' ? value.raw : ''
    return (
      <label className="runner-field">
        <span>Your answer</span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(event) => {
            const text = event.target.value
            const parsed = Number(text)
            props.onChange({ kind: 'numeric', value: text.trim() === '' || Number.isNaN(parsed) ? null : parsed, raw: text })
          }}
        />
      </label>
    )
  }
  const text = value?.kind === 'text' ? value.text : ''
  return (
    <label className="runner-field">
      <span>Your answer</span>
      <textarea rows={5} value={text} onChange={(event) => props.onChange({ kind: 'text', text: event.target.value })} />
    </label>
  )
}
