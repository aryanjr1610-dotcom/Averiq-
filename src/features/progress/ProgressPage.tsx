import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { competitiveRepository, type ExamSummary } from '@/features/competitive/repository'
import { loadAnalytics, type AnalyticsSnapshot } from './analytics'
import { BAND_LABEL, type MasteryScope } from './model'
import './progress.css'

const minutes = (seconds: number) => `${Math.floor(seconds / 60)} min`

function Sparkline(props: { points: Array<{ day: string; seconds: number }> }) {
  if (props.points.length < 2) return null
  const max = Math.max(...props.points.map((point) => point.seconds), 1)
  const path = props.points
    .map((point, index) => {
      const x = (index / (props.points.length - 1)) * 100
      const y = 30 - (point.seconds / max) * 28
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className="prog-spark" viewBox="0 0 100 32" role="img" aria-label="Study time over the last 14 days">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

export function ProgressPage() {
  const [scope, setScope] = useState<MasteryScope>('board')
  const [examKey, setExamKey] = useState<string | undefined>(undefined)
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    competitiveRepository.resolveMyExams().then(setExams).catch(() => setExams([]))
  }, [])

  useEffect(() => {
    let active = true
    setSnapshot(null)
    loadAnalytics(scope, examKey)
      .then((next) => { if (active) setSnapshot(next) })
      .catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : 'Progress unavailable.') })
    return () => { active = false }
  }, [scope, examKey])

  const bySubject = useMemo(() => {
    const map = new Map<string, { name: string; scores: number[]; weak: number; strong: number }>()
    for (const item of snapshot?.mastery ?? []) {
      const key = item.subjectId ?? 'unknown'
      const entry = map.get(key) ?? { name: item.subjectName ?? 'Subject', scores: [], weak: 0, strong: 0 }
      if (typeof item.score === 'number') entry.scores.push(item.score)
      if ((item.recentAccuracy ?? 100) < 55) entry.weak += 1
      if (item.band === 'strong') entry.strong += 1
      map.set(key, entry)
    }
    return [...map.entries()]
  }, [snapshot?.mastery])

  if (error) return <Container><p role="alert">Progress unavailable. {error}</p></Container>
  if (!snapshot) return <Container><div className="prog-skeleton" /><div className="prog-skeleton" /></Container>

  if (!snapshot.hasEvidence) {
    return (
      <Container>
        <h1>Progress</h1>
        <p className="prog-note">Your progress will appear as you study. Open a lesson or complete some practice to begin.</p>
        <Link className="prog-cta" to="/app/learn">Start learning</Link>
      </Container>
    )
  }

  return (
    <Container>
      <h1>Progress</h1>
      {exams.length > 0 ? (
        <div className="prog-switch" role="group" aria-label="Progress scope">
          <button type="button" aria-pressed={scope === 'board'} onClick={() => { setScope('board'); setExamKey(undefined) }}>School</button>
          {exams.map((exam) => (
            <button key={exam.key} type="button" aria-pressed={examKey === exam.key}
              onClick={() => { setScope('competitive'); setExamKey(exam.key) }}>{exam.shortName}</button>
          ))}
        </div>
      ) : null}

      <section className="prog-block">
        <h2>Study</h2>
        {snapshot.studySecondsTotal > 0 ? (
          <>
            <p className="prog-figure">{minutes(snapshot.studySecondsTotal)} <span>active study, last 14 days</span></p>
            <Sparkline points={snapshot.studyTrend} />
          </>
        ) : (
          <p className="prog-note">Active study time will appear once you spend time in a lesson.</p>
        )}
      </section>

      <section className="prog-block">
        <h2>Reading</h2>
        {snapshot.lessons.length > 0 ? (
          <ul className="prog-list">
            {snapshot.lessons.slice(0, 6).map((lesson) => (
              <li key={lesson.lessonId}>
                <Link to={`/app/learn/lessons/${lesson.lessonId}`}>Lesson</Link>
                <span>{lesson.status === 'completed' ? 'Completed' : `${Math.round(lesson.readingProgress)}% read`}</span>
              </li>
            ))}
          </ul>
        ) : <p className="prog-note">No lessons opened yet.</p>}
        <p className="prog-note">Reading is tracked separately from mastery — finishing a chapter is not the same as mastering it.</p>
      </section>

      <section className="prog-block">
        <h2>Mastery</h2>
        {snapshot.mastery.length === 0 ? (
          <p className="prog-note">Mastery needs practice evidence. Complete some questions and it will appear here.</p>
        ) : (
          <>
            <ul className="prog-list">
              {bySubject.map(([id, entry]) => (
                <li key={id}>
                  <strong>{entry.name}</strong>
                  <span>
                    {entry.scores.length > 0
                      ? `Mastery ${Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)}%`
                      : 'Not enough evidence'}
                    {entry.weak > 0 ? ` • ${entry.weak} weak` : ''}{entry.strong > 0 ? ` • ${entry.strong} strong` : ''}
                  </span>
                </li>
              ))}
            </ul>
            <h3>Needs attention</h3>
            {snapshot.weak.length === 0 ? <p className="prog-note">No weak topics identified from your current evidence.</p> : (
              <ul className="prog-list">
                {snapshot.weak.slice(0, 5).map((topic) => (
                  <li key={topic.topicId}>
                    <strong>{topic.topicName ?? 'Topic'}</strong>
                    <span>{topic.reasons[0]}</span>
                    <span className="prog-actions">
                      <Link to="/app/revision">Review concept</Link>
                      <Link to={`/app/practice?topic=${encodeURIComponent(topic.topicId)}`}>Practice</Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <h3>Strengths</h3>
            {snapshot.strong.length === 0 ? <p className="prog-note">Strengths appear once you are consistently accurate on a topic.</p> : (
              <ul className="prog-list">
                {snapshot.strong.slice(0, 4).map((topic) => (
                  <li key={topic.topicId}>
                    <strong>{topic.topicName ?? 'Topic'}</strong>
                    <span>{BAND_LABEL[topic.band]} • {topic.recentAccuracy ?? 0}% recent accuracy</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {snapshot.activity.length > 0 ? (
        <section className="prog-block">
          <h2>Recent activity</h2>
          <ul className="prog-activity">
            {snapshot.activity.map((entry, index) => (
              <li key={index}>{entry.kind.replace(/_/g, ' ')} · {new Date(entry.occurredAt).toLocaleDateString()}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  )
}
