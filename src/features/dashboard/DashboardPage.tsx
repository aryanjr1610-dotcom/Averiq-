import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Circle, Clock3 } from 'lucide-react'
import { ProgressBar } from '@/components/progress/MasteryBar'
import { EmptyState } from '@/components/feedback/EmptyState'
import { useProfile } from '@/features/profile/ProfileProvider'
import { useAITutor } from '@/features/ai/AITutorProvider'
import { greeting, type SectionState } from './dashboard-data'
import { useDashboardData } from './useDashboardData'
import './dashboard.css'

function readProfile(profile: unknown) {
  const row = (profile ?? {}) as Record<string, unknown>
  const pick = (keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === 'string' && value.length > 0) return value
    }
    return undefined
  }
  const classLevel = (() => {
    for (const key of ['classLevel', 'class_level', 'grade']) {
      const value = row[key]
      if (typeof value === 'number') return value
      if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
    }
    return undefined
  })()
  const name = pick(['displayName', 'display_name', 'fullName', 'full_name', 'name'])
  return {
    name: name ? name.split(' ')[0] : undefined,
    classLevel,
    board: pick(['board', 'boardKey', 'board_key']),
    stream: pick(['stream', 'streamKey', 'stream_key']),
  }
}

function SectionFallback<T>(props: { state: SectionState<T>; empty: string; onRetry: () => void }) {
  if (props.state.status === 'unavailable') {
    return (
      <p className="dash-note dash-note--warn" role="alert">
        Section unavailable. <button type="button" onClick={props.onRetry}>Retry</button>
      </p>
    )
  }
  return <p className="dash-note">{props.empty}</p>
}

export function DashboardPage() {
  const navigate = useNavigate()
  const profileState = useProfile() as unknown as { profile?: unknown }
  const tutor = useAITutor()
  const { data, loading, refresh } = useDashboardData()
  const profile = useMemo(() => readProfile(profileState.profile), [profileState.profile])
  const [context, setContext] = useState<'school' | string>('school')

  const hello = useMemo(() => greeting(new Date(), profile.name), [profile.name])
  const exams = data?.exams.status === 'ready' ? data.exams.data : []
  const contextLine = [profile.board?.toUpperCase(), profile.classLevel ? `Class ${profile.classLevel}` : undefined, profile.stream?.toUpperCase()]
    .filter(Boolean)
    .join(' • ')

  if (loading && !data) {
    return (
      <div className="dashboard">
        <div className="dash-skeletons" role="status" aria-busy="true">
          <span className="sr-only">Loading your study space</span>
          <div className="dash-skeleton dash-skeleton--head" />
          <div className="dash-skeleton dash-skeleton--hero" />
          <div className="dash-skeleton" />
          <div className="dash-skeleton" />
        </div>
      </div>
    )
  }

  const activeExam = exams.find((exam) => exam.key === context)
  const showBiology = profile.stream ? /pcb|pcmb/i.test(profile.stream) : false
  const neetUser = exams.some((exam) => exam.key === 'neet')

  return (
    <div className="dashboard">
      <header className="dash-head">
        <div className="dash-head__copy"><h1>{hello}</h1>
        {contextLine ? <p className="dash-context">{contextLine}{exams.length > 0 ? ` • ${exams.map((exam) => exam.shortName).join(' / ')}` : ''}</p> : null}
        </div>

      {exams.length > 0 ? (
        <div className="dash-switch" role="group" aria-label="Learning context">
          <button type="button" aria-pressed={context === 'school'} onClick={() => setContext('school')}>School</button>
          {exams.map((exam) => (
            <button key={exam.key} type="button" aria-pressed={context === exam.key} onClick={() => setContext(exam.key)}>
              {exam.shortName}
            </button>
          ))}
        </div>
      ) : null}

      </header>

      <section className="dash-hero" aria-labelledby="continue-heading">
        <div className="dash-hero__copy">
        <h2 id="continue-heading">Continue learning</h2>
        {data?.continueLearning.status === 'ready' ? (
          <>
            <p className="dash-hero__subject"><BookOpen size={16} strokeWidth={1.75} aria-hidden="true" />{data.continueLearning.data.subjectName}</p>
            <h3 className="dash-hero__title">{data.continueLearning.data.chapterName ?? data.continueLearning.data.lessonName ?? data.continueLearning.data.subjectName}</h3>
            {data.continueLearning.data.lessonName ? <p className="dash-hero__lesson">{data.continueLearning.data.lessonName}</p> : null}
            {typeof data.continueLearning.data.percentRead === 'number' ? (
              <ProgressBar label="Chapter progress" value={data.continueLearning.data.percentRead} />
            ) : null}
            {data.continueLearning.data.lessonId ? (
              <Link className="dash-cta" to={`/app/learn/lessons/${data.continueLearning.data.lessonId}`}>Continue learning <ArrowRight size={18} aria-hidden="true" /></Link>
            ) : null}
          </>
        ) : data?.subjects.status === 'ready' ? (
          <>
            <p>Your learning space is ready. Start with one of your subjects.</p>
            <div className="dash-chips">
              {data.subjects.data.slice(0, 4).map((subject) => (
                <Link key={subject.id} to={`/app/learn/subjects/${subject.id}`}>{subject.name}</Link>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            size="inline"
            icon={BookOpen}
            title={profile.classLevel ? 'Pick a subject to start' : 'Finish setting up'}
            body={profile.classLevel
              ? 'Open any subject and Averiq will pick up where you left off from here.'
              : 'Tell Averiq your board, class and stream and your syllabus loads instantly.'}
            action={{
              label: profile.classLevel ? 'Browse subjects' : 'Complete setup',
              onClick: () => navigate(profile.classLevel ? '/app/learn' : '/onboarding'),
            }}
          />
        )}
        </div>
      </section>

      {data?.recommendations.status === 'ready' ? (
        <section className="dash-block">
          <h2>Recommended for you</h2>
          <ul className="dash-subjects">
            {data.recommendations.data.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <span>{item.reason}</span>
                <Link className="dash-cta" to={item.targetRoute}>{item.actionLabel}</Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data?.today.status === 'ready' ? (
        <section className="dash-block dash-plan" aria-labelledby="dash-plan">
          <h2 id="dash-plan"><Clock3 size={18} strokeWidth={1.75} aria-hidden="true" />Today’s plan</h2>
          <p className="dash-note">
            {data.today.data.streak > 0 ? `${data.today.data.streak}-day streak` : 'No streak yet'}
            {data.today.data.focusMinutesToday > 0 ? ` · ${data.today.data.focusMinutesToday} min focused today` : ''}
          </p>
          <ul className="dash-chips">
            {data.today.data.tasks.map((task) => (
              <li key={task.id} className={task.done ? 'dash-chip dash-chip--done' : 'dash-chip'}>
                {task.done ? <Check size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}<span>{task.title}</span>
              </li>
            ))}
          </ul>
          <div className="dash-actions">
            <Link className="dash-cta" to="/app/planner">Open planner</Link>
            <Link className="dash-cta" to="/app/focus">Start focus</Link>
          </div>
        </section>
      ) : null}

      {context === 'school' ? (
        <section className="dash-block">
          <h2>School</h2>
          {data?.subjects.status === 'ready' ? (
            <ul className="dash-subjects">
              {data.subjects.data.map((subject) => (
                <li key={subject.id}>
                  <Link to={`/app/learn/subjects/${subject.id}`}>
                    <span className="dash-subject-copy"><strong>{subject.name}</strong>
                    {subject.currentChapter ? <span>{subject.currentChapter}</span> : null}</span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <SectionFallback state={data?.subjects ?? { status: 'empty' }} empty="No subjects resolved for your profile yet." onRetry={() => void refresh(true)} />
          )}
        </section>
      ) : activeExam ? (
        <section className="dash-block">
          <h2>{activeExam.shortName} preparation</h2>
          <div className="dash-chips">
            <Link to={`/app/exams/${activeExam.key}`}>Open {activeExam.shortName}</Link>
            <Link to="/app/practice">Practice</Link>
            <Link to="/app/revision">Revision</Link>
            <Link to="/app/formulas">Formulae</Link>
          </div>
        </section>
      ) : null}

      <div className="dash-columns">
        <section className="dash-block">
          <h2>Revision</h2>
          {data?.revision.status === 'ready' ? (
            <Link className="dash-cta" to={data.revision.data.href}>{data.revision.data.title}</Link>
          ) : (
            <>
              <SectionFallback state={data?.revision ?? { status: 'empty' }} empty="No revision activity yet." onRetry={() => void refresh(true)} />
              <Link className="dash-cta" to="/app/revision">Start revision</Link>
            </>
          )}
        </section>

        <section className="dash-block">
          <h2>Practice</h2>
          {data?.practice.status === 'ready' ? (
            <Link className="dash-cta" to={data.practice.data.href}>{data.practice.data.title}</Link>
          ) : (
            <>
              <SectionFallback state={data?.practice ?? { status: 'empty' }} empty="No practice history yet." onRetry={() => void refresh(true)} />
              <Link className="dash-cta" to="/app/practice">Start practice</Link>
            </>
          )}
        </section>

        <section className="dash-block">
          <h2>Progress</h2>
          {data?.progress.status === 'ready' ? (
            <ul className="dash-metrics">
              {typeof data.progress.data.lessonsCompleted === 'number' ? <li><strong>{data.progress.data.lessonsCompleted}</strong><span>Lessons completed</span></li> : null}
              {typeof data.progress.data.practiceAccuracy === 'number' ? <li><strong>{data.progress.data.practiceAccuracy}%</strong><span>Practice accuracy</span></li> : null}
              {typeof data.progress.data.studyMinutes === 'number' ? <li><strong>{data.progress.data.studyMinutes}</strong><span>Minutes studied</span></li> : null}
              {typeof data.progress.data.streakDays === 'number' ? <li><strong>{data.progress.data.streakDays} 🔥</strong><span>Day streak</span></li> : null}
            </ul>
          ) : (
            <p className="dash-note">Your learning progress will appear here as you study.</p>
          )}
        </section>
      </div>

      {data?.weakTopics.status === 'ready' ? (
        <section className="dash-block">
          <h2>Needs attention</h2>
          <ul className="dash-subjects">
            {data.weakTopics.data.map((topic) => (
              <li key={topic.name}>
                <strong>{topic.name}</strong>
                <span>
                  {topic.lessonId ? <Link to={`/app/learn/lessons/${topic.lessonId}`}>Review concept</Link> : null}{' '}
                  <Link to="/app/practice">Practice</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="dash-block dash-tools">
        <h2>Tools</h2>
        <div className="dash-chips">
          {tutor.available ? <button type="button" onClick={() => tutor.openTutor()}>Ask Averiq AI</button> : null}
          <Link to="/app/revision">Revision</Link>
          <Link to="/app/practice">Practice</Link>
          <Link to="/app/formulas">Formulae</Link>
          <Link to="/app/visual-lab/electric-field-2d">Visual Lab</Link>
          <Link to="/app/notes">Saved learning</Link>
          <Link to="/app/search">Search</Link>
          {showBiology || neetUser ? <Link to="/app/anatomy">Anatomy Explorer</Link> : null}
        </div>
        {!showBiology && !neetUser ? (
          <p className="dash-note"><Link to="/app/anatomy">Anatomy Explorer</Link> is available to explore any time.</p>
        ) : null}
      </section>

      {data?.recentActivity.status === 'ready' ? (
        <section className="dash-block">
          <h2>Recent activity</h2>
          <ul className="dash-activity">
            {data.recentActivity.data.slice(0, 5).map((entry, index) => <li key={index}>{entry}</li>)}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
