import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { EmptyState, ErrorState } from '@/components/system/States'
import { useAITutor } from '@/features/ai/AITutorProvider'
import { getCompetitiveIntegration } from './practice-bridge'
import type { ConceptLink, ExamSubject, ExamSummary, ExamTopic, ExamUnit } from './repository'
import { competitiveRepository } from './repository'
import './competitive.css'

type LoadState<T> = { status: 'loading' | 'ready' | 'error'; data?: T; message?: string }

function useLoad<T>(load: () => Promise<T>, deps: ReadonlyArray<unknown>): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const runner = useCallback(load, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    runner()
      .then((data) => {
        if (active) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Something went wrong.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [runner])
  return state
}

function SourceNote({ exam }: { exam: ExamSummary }) {
  if (!exam.cycleId) {
    return (
      <p className="exam-source exam-source--warn">
        No published syllabus cycle yet. Structure only — nothing here is an official syllabus.
      </p>
    )
  }
  return (
    <p className="exam-source">
      {exam.cycleLabel ?? exam.cycleCode ?? 'Current cycle'} ·{' '}
      {exam.dataKind === 'official' ? 'Official source' : 'Sample structure (not official)'}
      {exam.sourceName ? ` · ${exam.sourceName}` : ''}
      {exam.sourceUrl ? (
        <>
          {' · '}
          <a href={exam.sourceUrl} target="_blank" rel="noreferrer noopener">
            source
          </a>
        </>
      ) : null}
      {exam.reviewerPreview ? ' · reviewer preview' : ''}
    </p>
  )
}

const DEPTH_LABEL: Record<ConceptLink['depthLayer'], string> = {
  core: 'Core idea',
  board: 'Board depth',
  competitive: 'Exam depth',
  advanced: 'Advanced',
}

function ConceptLinkRow({ link }: { link: ConceptLink }) {
  const integration = getCompetitiveIntegration()
  const label = link.label ?? DEPTH_LABEL[link.depthLayer]
  let href: string | null = null
  if (link.linkKind === 'lesson' && link.lessonId) {
    href = integration?.lessonHref?.(link.lessonId) ?? `/app/learn/lessons/${link.lessonId}`
  } else if (link.linkKind === 'chapter' && link.chapterId) {
    href = `/app/learn/chapters/${link.chapterId}`
  } else if (link.linkKind === 'formula' && link.formulaKey) {
    href = integration?.formulaHref?.(link.formulaKey) ?? null
  } else if (link.linkKind === 'visualization' && link.visualizationId) {
    href = `/app/visual-lab/${link.visualizationId}`
  }

  return (
    <li className="concept-link">
      <span className={`concept-link__depth concept-link__depth--${link.depthLayer}`}>
        {DEPTH_LABEL[link.depthLayer]}
      </span>
      {href ? <Link to={href}>{label}</Link> : <span className="concept-link__plain">{label}</span>}
    </li>
  )
}

export function ExamsHomePage() {
  const state = useLoad(() => competitiveRepository.resolveMyExams(), [])

  if (state.status === 'loading') return <Container>Loading your exams…</Container>
  if (state.status === 'error') return <Container><ErrorState title="Exams unavailable" message={state.message ?? 'Failed to load exams.'} /></Container>

  const exams = state.data ?? []
  if (exams.length === 0) {
    return (
      <Container>
        <h1>Competitive preparation</h1>
        <EmptyState
          title="No competitive exam selected"
          description="Add a competitive goal such as JEE, NEET or NDA in your profile to unlock exam preparation."
        />
      </Container>
    )
  }

  return (
    <Container>
      <h1>Competitive preparation</h1>
      <p className="exam-lede">Board learning stays exactly where it is. This layer adds exam depth on top of it.</p>
      <ul className="exam-list">
        {exams.map((exam) => (
          <li key={`${exam.key}-${exam.cycleId ?? 'none'}`} className="exam-list__item">
            <Link to={`/app/exams/${exam.key}`}>
              <strong>{exam.shortName}</strong>
              <span>{exam.name}</span>
            </Link>
            <SourceNote exam={exam} />
          </li>
        ))}
      </ul>
    </Container>
  )
}

export function ExamPage() {
  const { examKey = '' } = useParams()
  const state = useLoad(async () => {
    const exam = await competitiveRepository.getExamByKey(examKey)
    if (!exam) return { exam: undefined, subjects: [] as ExamSubject[], mocks: [] }
    const [subjects, mocks] = await Promise.all([
      competitiveRepository.getSubjects(exam.examId),
      competitiveRepository.getMocks(exam.examId),
    ])
    return { exam, subjects, mocks }
  }, [examKey])

  if (state.status === 'loading') return <Container>Loading…</Container>
  if (state.status === 'error') return <Container><ErrorState title="Exam unavailable" message={state.message ?? 'Failed to load exam.'} /></Container>

  const exam = state.data?.exam
  if (!exam) {
    return (
      <Container>
        <EmptyState title="Exam not available" description="This exam is not enabled for your class, stream or goals." />
      </Container>
    )
  }

  const subjects = state.data?.subjects ?? []
  const mocks = state.data?.mocks ?? []

  return (
    <Container>
      <h1>{exam.shortName} preparation</h1>
      <SourceNote exam={exam} />

      <section className="exam-block">
        <h2>Subjects</h2>
        {subjects.length === 0 ? (
          <p className="exam-muted">No published subjects for this cycle yet.</p>
        ) : (
          <ul className="exam-chips">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <Link to={`/app/exams/${exam.key}/${subject.slug}`}>{subject.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="exam-block">
        <h2>Practice &amp; tests</h2>
        <div className="exam-actions">
          <Link className="exam-link" to={`/app/exams/${exam.key}/pyq`}>Past year questions</Link>
          <Link className="exam-link" to="/app/practice">Continue practice</Link>
          <Link className="exam-link" to="/app/revision">Revision</Link>
          <Link className="exam-link" to="/app/formulas">Formulae</Link>
        </div>
        <p className="exam-muted">Weak-topic analytics arrives with the progress phase.</p>
      </section>

      <section className="exam-block">
        <h2>Mock tests</h2>
        {mocks.length === 0 ? (
          <p className="exam-muted">Mock architecture is ready. No mock is published yet.</p>
        ) : (
          <ul className="exam-plain">
            {mocks.map((mock) => (
              <li key={mock.id}>
                <Link to={`/app/exams/${exam.key}/test?mock=${mock.key}`}>{mock.name}</Link>
                {mock.dataKind !== 'official-style' ? <span className="exam-muted"> · demo</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  )
}

export function ExamSubjectPage() {
  const { examKey = '', subjectSlug = '' } = useParams()
  const state = useLoad(async () => {
    const exam = await competitiveRepository.getExamByKey(examKey)
    if (!exam) return null
    const subjects = await competitiveRepository.getSubjects(exam.examId)
    const subject = subjects.find((item) => item.slug === subjectSlug)
    if (!subject) return { exam, subject: undefined, units: [] as ExamUnit[], topics: [] as ExamTopic[] }
    const units = await competitiveRepository.getUnits(subject.id)
    const topics = await competitiveRepository.getTopics(units.map((unit) => unit.id))
    return { exam, subject, units, topics }
  }, [examKey, subjectSlug])

  if (state.status === 'loading') return <Container>Loading…</Container>
  if (state.status === 'error') return <Container><ErrorState title="Subject unavailable" message={state.message ?? 'Failed to load subject.'} /></Container>
  if (!state.data?.exam) return <Container><EmptyState title="Exam not available" description="This exam is not available for your profile." /></Container>

  const { exam, subject, units, topics } = state.data
  if (!subject) return <Container><EmptyState title="Subject not found" description="It may not be published for this cycle." /></Container>

  return (
    <Container>
      <p className="exam-crumb"><Link to={`/app/exams/${exam.key}`}>{exam.shortName}</Link></p>
      <h1>{exam.shortName} {subject.name}</h1>
      <SourceNote exam={exam} />

      {units.length === 0 ? (
        <EmptyState title="No units published" description="Import a syllabus cycle to populate units and topics." />
      ) : (
        units.map((unit) => {
          const unitTopics = topics.filter((topic) => topic.unitId === unit.id)
          return (
            <section key={unit.id} className="exam-block">
              <h2>{unit.name}</h2>
              {unitTopics.length === 0 ? (
                <p className="exam-muted">No topics yet.</p>
              ) : (
                <ul className="exam-plain">
                  {unitTopics.map((topic) => (
                    <li key={topic.id}>
                      <Link to={`/app/exams/${exam.key}/${subject.slug}/topics/${topic.id}`}>{topic.name}</Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link className="exam-link" to={`/app/exams/${exam.key}/test?subject=${subject.id}&unit=${unit.id}&count=20`}>
                Unit test
              </Link>
            </section>
          )
        })
      )}
    </Container>
  )
}

export function ExamTopicPage() {
  const { examKey = '', subjectSlug = '', topicId = '' } = useParams()
  const { setLearningContext } = useAITutor()

  const state = useLoad(async () => {
    const exam = await competitiveRepository.getExamByKey(examKey)
    if (!exam) return null
    const topic = await competitiveRepository.getTopicById(topicId)
    if (!topic) return { exam, topic: undefined, links: [] as ConceptLink[] }
    const links = await competitiveRepository.getConceptLinks([topic.id])
    return { exam, topic, links }
  }, [examKey, topicId])

  const exam = state.data?.exam
  const topic = state.data?.topic
  const links = state.data?.links ?? []

  useEffect(() => {
    if (!exam || !topic) return
    setLearningContext({
      examKey: exam.key,
      examTopicId: topic.id,
      subject: subjectSlug,
      topic: topic.name,
      mode: 'competitive',
    })
  }, [exam, topic, subjectSlug, setLearningContext])

  if (state.status === 'loading') return <Container>Loading…</Container>
  if (state.status === 'error') return <Container><ErrorState title="Topic unavailable" message={state.message ?? 'Failed to load topic.'} /></Container>
  if (!exam) return <Container><EmptyState title="Exam not available" description="This exam is not available for your profile." /></Container>
  if (!topic) return <Container><EmptyState title="Topic not found" description="The requested topic could not be found." /></Container>

  const grouped: Array<[ConceptLink['depthLayer'], ConceptLink[]]> = (
    ['core', 'board', 'competitive', 'advanced'] as const
  )
    .map((layer) => [layer, links.filter((link) => link.depthLayer === layer)] as [ConceptLink['depthLayer'], ConceptLink[]])
    .filter(([, group]) => group.length > 0)

  const hasFormula = links.some((link) => link.linkKind === 'formula')
  const hasVisual = links.some((link) => link.linkKind === 'visualization')

  return (
    <Container>
      <p className="exam-crumb">
        <Link to={`/app/exams/${exam.key}`}>{exam.shortName}</Link>
        {' · '}
        <Link to={`/app/exams/${exam.key}/${subjectSlug}`}>{subjectSlug}</Link>
      </p>
      <h1>{topic.name}</h1>
      <SourceNote exam={exam} />

      {grouped.length === 0 ? (
        <EmptyState
          title="No concept mappings yet"
          description="This topic exists in the syllabus but is not linked to canonical content."
        />
      ) : (
        grouped.map(([layer, group]) => (
          <section key={layer} className="exam-block">
            <h2>{DEPTH_LABEL[layer]}</h2>
            <ul className="concept-links">
              {group.map((link) => <ConceptLinkRow key={link.id} link={link} />)}
            </ul>
          </section>
        ))
      )}

      <section className="exam-block">
        <h2>Tools</h2>
        <div className="exam-actions">
          <Link className="exam-link" to={`/app/exams/${exam.key}/test?topic=${topic.id}&count=10&mode=learn`}>Practice</Link>
          <Link className="exam-link" to={`/app/exams/${exam.key}/test?topic=${topic.id}&count=20&mode=exam&minutes=25`}>Topic test</Link>
          <Link className="exam-link" to={`/app/exams/${exam.key}/pyq?topic=${topic.id}`}>PYQs</Link>
          <Link className="exam-link" to="/app/revision">Revision</Link>
          {hasFormula ? <Link className="exam-link" to="/app/formulas">Formulae</Link> : null}
          {hasVisual ? <span className="exam-muted">Visualisations listed above</span> : null}
        </div>
      </section>
    </Container>
  )
}

export function ExamPyqPage() {
  const { examKey = '' } = useParams()
  const [params] = useSearchParams()
  const topicFilter = params.get('topic')

  const state = useLoad(async () => {
    const exam = await competitiveRepository.getExamByKey(examKey)
    if (!exam) return null
    const integration = getCompetitiveIntegration()
    if (!integration) return { exam, questions: [], connected: false }
    const questions = await integration.fetchQuestions({
      examId: exam.examId,
      examKey: exam.key,
      examTopicIds: topicFilter ? [topicFilter] : undefined,
      sourceType: ['pyq'],
      count: 50,
      includeSolutions: false,
    })
    return { exam, questions, connected: true }
  }, [examKey, topicFilter])

  if (state.status === 'loading') return <Container>Loading…</Container>
  if (state.status === 'error') return <Container><ErrorState title="PYQs unavailable" message={state.message ?? 'Failed to load past year questions.'} /></Container>
  if (!state.data?.exam) return <Container><EmptyState title="Exam not available" description="This exam is not available for your profile." /></Container>

  const { exam, questions, connected } = state.data

  return (
    <Container>
      <p className="exam-crumb"><Link to={`/app/exams/${exam.key}`}>{exam.shortName}</Link></p>
      <h1>{exam.shortName} past year questions</h1>
      {!connected ? (
        <EmptyState
          title="Question bank not connected"
          description="Register the practice integration to read the question bank from this layer."
        />
      ) : questions.length === 0 ? (
        <EmptyState
          title="No verified past year questions yet"
          description="Only genuinely sourced PYQs are shown here. Nothing is generated or back-dated."
        />
      ) : (
        <ol className="exam-plain">
          {questions.map((question) => (
            <li key={question.id}>
              <Link to={`/app/exams/${exam.key}/test?question=${question.id}&mode=learn`}>{question.prompt}</Link>
            </li>
          ))}
        </ol>
      )}
    </Container>
  )
}
