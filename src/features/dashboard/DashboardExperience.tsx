import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  BrainCircuit,
  NotebookPen,
  Orbit,
  RotateCcw,
  Search,
  Sigma,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'

import { AnimatedBeam } from '@/components/design/AnimatedBeam'
import { AnimatedList } from '@/components/design/AnimatedList'
import { AndroidMockup } from '@/components/design/AndroidMockup'
import { AuroraText } from '@/components/design/AuroraText'
import { AvatarCircles, type AvatarCircleItem } from '@/components/design/AvatarCircles'
import { BentoCard, BentoGrid } from '@/components/design/BentoGrid'
import { Dock, DockIcon } from '@/components/design/Dock'
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider'

interface SubjectSummary {
  id: string
  name: string
}

interface DashboardExperienceProps {
  subjects: SubjectSummary[]
  recentActivity: string[]
  tutorAvailable: boolean
  openTutor: () => void
  showBiology: boolean
  neetUser: boolean
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function LearningFlow({ reducedMotion }: { reducedMotion: boolean }) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const learnRef = React.useRef<HTMLDivElement | null>(null)
  const practiceRef = React.useRef<HTMLDivElement | null>(null)
  const revisionRef = React.useRef<HTMLDivElement | null>(null)
  const masteryRef = React.useRef<HTMLDivElement | null>(null)

  return (
    <div ref={containerRef} className="averiq-flow-map">
      <div ref={learnRef} className="averiq-flow-node averiq-flow-node--learn"><BookOpen size={18} aria-hidden="true" /><span>Learn</span></div>
      <div ref={practiceRef} className="averiq-flow-node averiq-flow-node--practice"><Target size={18} aria-hidden="true" /><span>Practice</span></div>
      <div ref={revisionRef} className="averiq-flow-node averiq-flow-node--revision"><RotateCcw size={18} aria-hidden="true" /><span>Revision</span></div>
      <div ref={masteryRef} className="averiq-flow-node averiq-flow-node--mastery"><TrendingUp size={18} aria-hidden="true" /><span>Mastery</span></div>
      <AnimatedBeam containerRef={containerRef} fromRef={learnRef} toRef={practiceRef} curvature={34} duration={4.2} reducedMotion={reducedMotion} />
      <AnimatedBeam containerRef={containerRef} fromRef={practiceRef} toRef={revisionRef} curvature={-22} duration={4.7} delay={0.45} reducedMotion={reducedMotion} />
      <AnimatedBeam containerRef={containerRef} fromRef={revisionRef} toRef={masteryRef} curvature={30} duration={5.1} delay={0.8} reducedMotion={reducedMotion} />
    </div>
  )
}

function QuickDock({ showBiology, neetUser, tutorAvailable, openTutor, reducedMotion }: {
  showBiology: boolean
  neetUser: boolean
  tutorAvailable: boolean
  openTutor: () => void
  reducedMotion: boolean
}) {
  return (
    <div className="averiq-quick-dock-wrap">
      <Dock disableMagnification={reducedMotion} iconSize={38} iconMagnification={56} iconDistance={124}>
        {tutorAvailable ? (
          <DockIcon title="Ask Averiq AI">
            <button type="button" className="averiq-dock-link" onClick={openTutor} aria-label="Ask Averiq AI"><Sparkles size={20} aria-hidden="true" /></button>
          </DockIcon>
        ) : null}
        <DockIcon title="Revision"><Link className="averiq-dock-link" to="/app/revision" aria-label="Revision"><RotateCcw size={20} aria-hidden="true" /></Link></DockIcon>
        <DockIcon title="Practice"><Link className="averiq-dock-link" to="/app/practice" aria-label="Practice"><Target size={20} aria-hidden="true" /></Link></DockIcon>
        <DockIcon title="Formula library"><Link className="averiq-dock-link" to="/app/formulas" aria-label="Formula library"><Sigma size={20} aria-hidden="true" /></Link></DockIcon>
        <DockIcon title="Visual Lab"><Link className="averiq-dock-link" to="/app/visual-lab/electric-field-2d" aria-label="Visual Lab"><Orbit size={20} aria-hidden="true" /></Link></DockIcon>
        <DockIcon title="Notes"><Link className="averiq-dock-link" to="/app/notes" aria-label="Notes"><NotebookPen size={20} aria-hidden="true" /></Link></DockIcon>
        <DockIcon title="Search"><Link className="averiq-dock-link" to="/app/search" aria-label="Search"><Search size={20} aria-hidden="true" /></Link></DockIcon>
        {showBiology || neetUser ? (
          <DockIcon title="Anatomy Explorer"><Link className="averiq-dock-link" to="/app/anatomy" aria-label="Anatomy Explorer"><Activity size={20} aria-hidden="true" /></Link></DockIcon>
        ) : null}
      </Dock>
      <p className="averiq-quick-dock-hint">Move across the dock to open a study tool.</p>
    </div>
  )
}

export function DashboardExperience({ subjects, recentActivity, tutorAvailable, openTutor, showBiology, neetUser }: DashboardExperienceProps) {
  const { reducedMotion } = useAcademicTheme()
  const subjectAvatars = React.useMemo<AvatarCircleItem[]>(() => subjects.slice(0, 7).map((subject, index) => ({
    id: subject.id,
    label: subject.name,
    initials: initials(subject.name),
    tone: `color-mix(in srgb, rgb(var(--subject-accent)) ${72 - index * 5}%, rgb(var(--surface-raised)))`,
  })), [subjects])

  return (
    <section className="dash-block dash-experience" aria-labelledby="dash-experience-title">
      <div className="dash-experience__head">
        <div>
          <p className="magic-section-kicker">Your learning environment</p>
          <h2 id="dash-experience-title">Study space</h2>
        </div>
        <p className="dash-note">A calmer way to move between learning, practice, revision and your tools.</p>
      </div>

      <BentoGrid>
        <BentoCard
          className="magic-bento-card--flow"
          eyebrow="Learning path"
          title="One connected study loop"
          description="Concepts move from learning to practice, then revision and long-term mastery."
          icon={BrainCircuit}
          background={<div className="magic-bento-orbit" />}
        >
          <LearningFlow reducedMotion={reducedMotion} />
        </BentoCard>

        <BentoCard
          className="magic-bento-card--ai"
          eyebrow="AI tutor"
          title={<AuroraText speed={0.62}>Averiq AI</AuroraText>}
          description="Ask from any subject, chapter or lesson without leaving your study flow."
          icon={Sparkles}
          action={tutorAvailable ? <button type="button" onClick={openTutor}>Ask a question</button> : <span>Available outside exam mode</span>}
        >
          <div className="magic-ai-pulse" aria-hidden="true"><span /><span /><span /></div>
        </BentoCard>

        <BentoCard
          className="magic-bento-card--dock"
          eyebrow="Quick launch"
          title="Your study tools, one movement away"
          description="A dock-inspired launcher keeps useful tools close without turning the dashboard into a wall of buttons."
          icon={Orbit}
        >
          <QuickDock showBiology={showBiology} neetUser={neetUser} tutorAvailable={tutorAvailable} openTutor={openTutor} reducedMotion={reducedMotion} />
        </BentoCard>

        <BentoCard
          className="magic-bento-card--subjects"
          eyebrow="Subjects"
          title="Your subject constellation"
          description={subjects.length > 0 ? `${subjects.length} subject${subjects.length === 1 ? '' : 's'} connected to your current profile.` : 'Your selected subjects will gather here.'}
          icon={BookOpen}
          action={<Link to="/app/learn">Open subjects</Link>}
        >
          {subjectAvatars.length > 0 ? <AvatarCircles items={subjectAvatars} maxVisible={5} numPeople={Math.max(0, subjects.length - 5)} /> : <p className="dash-note">Finish your academic setup to populate this view.</p>}
        </BentoCard>

        <BentoCard
          className="magic-bento-card--mobile"
          eyebrow="Responsive"
          title="Averiq follows you"
          description="The same Living Nature language scales down to a focused phone layout."
          icon={Orbit}
          interactive={false}
        >
          <div className="averiq-phone-stage">
            <AndroidMockup width={148}>
              <div className="averiq-phone-preview">
                <div className="averiq-phone-preview__sky" />
                <div className="averiq-phone-preview__brand">Averiq</div>
                <div className="averiq-phone-preview__greeting">Good evening</div>
                <div className="averiq-phone-preview__card"><span>Continue learning</span><strong>Physics</strong></div>
                <div className="averiq-phone-preview__dock"><span /><span /><span /><span /></div>
              </div>
            </AndroidMockup>
          </div>
        </BentoCard>

        <BentoCard
          className="magic-bento-card--activity"
          eyebrow="Activity"
          title="Recent learning"
          description="New activity settles in gently instead of jumping into the interface."
          icon={TrendingUp}
          action={<Link to="/app/progress">View progress</Link>}
        >
          {recentActivity.length > 0 ? (
            <AnimatedList delay={560} reducedMotion={reducedMotion} maxItems={4}>
              {recentActivity.slice(0, 4).map((entry, index) => (
                <div key={`${entry}-${index}`} className="averiq-activity-row"><span className="averiq-activity-dot" aria-hidden="true" /><span>{entry}</span></div>
              ))}
            </AnimatedList>
          ) : (
            <p className="dash-note">Your next completed lesson or study session will appear here.</p>
          )}
        </BentoCard>
      </BentoGrid>
    </section>
  )
}
