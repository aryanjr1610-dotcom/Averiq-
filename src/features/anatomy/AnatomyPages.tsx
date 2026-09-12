import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { EmptyState, ErrorState } from '@/components/system/States'
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider'
import { useAITutor } from '@/features/ai/AITutorProvider'
import { ANATOMY_LAYERS, HEART_MODEL_CREDIT, type AnatomyLayer, type AnatomyOrgan, type AnatomySystem } from './model'
import { anatomyRepository } from './repository'
import { useProcessPlayer } from './process'
import { BodyMap2D } from './two/BodyMap2D'
import { Heart2D } from './two/Heart2D'
import './anatomy.css'

const SceneHost = lazy(() => import('@/features/visuals/three/SceneHost').then((m) => ({ default: m.SceneHost })))

function useCatalog() {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'error'; systems: AnatomySystem[]; source?: string; message?: string }>({
    status: 'loading',
    systems: [],
  })
  useEffect(() => {
    let active = true
    anatomyRepository
      .listSystemCatalog()
      .then((result) => {
        if (active) setState({ status: 'ready', systems: result.systems, source: result.source })
      })
      .catch((error: unknown) => {
        if (active) setState({ status: 'error', systems: [], message: error instanceof Error ? error.message : 'Failed to load anatomy.' })
      })
    return () => {
      active = false
    }
  }, [])
  return state
}

export function AnatomyHomePage() {
  const catalog = useCatalog()
  const [region, setRegion] = useState<string | undefined>(undefined)

  if (catalog.status === 'loading') return <Container>Loading the body map…</Container>
  if (catalog.status === 'error') return <Container><ErrorState title="Anatomy unavailable" message={catalog.message ?? 'Anatomy service is currently unavailable.'} /></Container>

  const populated = catalog.systems.filter((system) => system.organs.length > 0)

  return (
    <Container>
      <h1>Human anatomy</h1>
      <p className="anatomy-lede">Explore the human body in layers. Educational reference only — not for diagnosis.</p>

      <div className="anatomy-home">
        <BodyMap2D activeSlug={region} onSelect={setRegion} />
        <div>
          <h2>Body systems</h2>
          <ul className="anatomy-systems">
            {catalog.systems.map((system) => {
              const ready = system.organs.length > 0
              return (
                <li key={system.slug} className={region === system.slug ? 'anatomy-system anatomy-system--on' : 'anatomy-system'}>
                  {ready ? (
                    <Link to={`/app/anatomy/${system.slug}`}>
                      <strong>{system.name}</strong>
                      <span>{system.summary}</span>
                      <em>{system.organs.length} organ{system.organs.length === 1 ? '' : 's'} available</em>
                    </Link>
                  ) : (
                    <div className="anatomy-system__pending">
                      <strong>{system.name}</strong>
                      <span>{system.summary}</span>
                      <em>Content not published yet</em>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {populated.length === 0 ? <EmptyState title="No anatomy content published yet" description="Please check back later or review published systems." /> : null}
          {catalog.source === 'bundled' ? (
            <p className="anatomy-note">Showing the bundled reference dataset — no published anatomy rows found in the database.</p>
          ) : null}
        </div>
      </div>
    </Container>
  )
}

export function AnatomySystemPage() {
  const { systemSlug = '' } = useParams()
  const catalog = useCatalog()
  const system = catalog.systems.find((item) => item.slug === systemSlug)

  if (catalog.status === 'loading') return <Container>Loading…</Container>
  if (!system) return <Container><EmptyState title="System not found" description="The requested body system does not exist or has not been published." /></Container>

  return (
    <Container>
      <p className="anatomy-crumb"><Link to="/app/anatomy">Human anatomy</Link></p>
      <h1>{system.name}</h1>
      <p className="anatomy-lede">{system.summary}</p>
      {system.organs.length === 0 ? (
        <EmptyState title="No organs published for this system yet" description="Organs for this system are currently in preparation." />
      ) : (
        <ul className="anatomy-plain">
          {system.organs.map((organ) => (
            <li key={organ.slug}>
              <Link to={`/app/anatomy/${system.slug}/${organ.slug}`}><strong>{organ.name}</strong></Link>
              <p>{organ.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}

type ViewMode = '3d' | '2d'

export function AnatomyOrganPage() {
  const { systemSlug = '', organSlug = '' } = useParams()
  const catalog = useCatalog()
  const tutor = useAITutor()
  const { reducedMotion } = useAcademicTheme()

  const system = catalog.systems.find((item) => item.slug === systemSlug)
  const organ: AnatomyOrgan | undefined = system?.organs.find((item) => item.slug === organSlug)

  const [selected, setSelected] = useState<string | null>(null)
  const [labels, setLabels] = useState(true)
  const [isolated, setIsolated] = useState<string | null>(null)
  const [hiddenLayers, setHiddenLayers] = useState<AnatomyLayer[]>([])
  const [view, setView] = useState<ViewMode>(organ?.visualizationId ? '3d' : '2d')
  const [sceneFailed, setSceneFailed] = useState(false)

  const process = organ?.processes[0]
  const player = useProcessPlayer(process, reducedMotion)

  const structure = organ?.structures.find((item) => item.objectKey === selected)

  useEffect(() => {
    if (!organ) return
    tutor.setLearningContext({
      bodySystem: system?.name,
      organ: organ.name,
      structure: structure?.name,
      subject: 'Biology',
      topic: organ.name,
    })
  }, [organ, system?.name, structure?.name, tutor])

  const sceneState = useMemo(
    () => ({
      hiddenLayers,
      isolated,
      emphasis: [...player.highlight, ...(selected ? [selected] : [])],
    }),
    [hiddenLayers, isolated, player.highlight, selected],
  )

  const toggleLayer = useCallback((layer: AnatomyLayer) => {
    setHiddenLayers((previous) => (previous.includes(layer) ? previous.filter((item) => item !== layer) : [...previous, layer]))
  }, [])

  if (catalog.status === 'loading') return <Container>Loading…</Container>
  if (!organ || !system) return <Container><EmptyState title="Organ not found" description="The requested organ could not be found." /></Container>

  const use3D = view === '3d' && Boolean(organ.visualizationId) && !sceneFailed

  return (
    <Container>
      <p className="anatomy-crumb">
        <Link to="/app/anatomy">Human anatomy</Link>{' · '}
        <Link to={`/app/anatomy/${system.slug}`}>{system.name}</Link>
      </p>
      <h1>{organ.name}</h1>
      <p className="anatomy-lede">{organ.summary}</p>

      <div className="anatomy-stage">
        <div className="anatomy-viewport">
          {use3D ? (
            <Suspense fallback={<p className="anatomy-note">Loading the 3D scene…</p>}>
              <SceneHost
                visualizationId={organ.visualizationId ?? 'anatomy-heart-3d'}
                state={sceneState}
                onSelect={(id: string) => setSelected(id)}
                onError={() => setSceneFailed(true)}
              />
            </Suspense>
          ) : (
            <Heart2D
              structures={organ.structures}
              selected={selected ?? undefined}
              highlight={player.highlight}
              labels={labels}
              onSelect={setSelected}
            />
          )}

          {sceneFailed ? (
            <p className="anatomy-error" role="alert">
              The 3D model couldn’t load.{' '}
              <button type="button" onClick={() => { setSceneFailed(false); setView('3d') }}>Retry</button>
              <button type="button" onClick={() => setView('2d')}>View 2D</button>
            </p>
          ) : null}

          <div className="anatomy-controls">
            {organ.visualizationId ? (
              <button type="button" onClick={() => setView(view === '3d' ? '2d' : '3d')}>{view === '3d' ? 'View 2D' : 'View 3D'}</button>
            ) : null}
            <button type="button" aria-pressed={labels} onClick={() => setLabels(!labels)}>{labels ? 'Labels on' : 'Labels off'}</button>
            {selected ? (
              isolated ? (
                <button type="button" onClick={() => setIsolated(null)}>Restore body</button>
              ) : (
                <button type="button" onClick={() => setIsolated(selected)}>Isolate</button>
              )
            ) : null}
          </div>

          <fieldset className="anatomy-layers">
            <legend>Layers</legend>
            {ANATOMY_LAYERS.map((layer) => (
              <label key={layer}>
                <input type="checkbox" checked={!hiddenLayers.includes(layer)} onChange={() => toggleLayer(layer)} />
                <span>{layer}</span>
              </label>
            ))}
          </fieldset>
        </div>

        <aside className="anatomy-panel" aria-label="Structure information">
          <h2>Structures</h2>
          <ul className="anatomy-structure-list">
            {organ.structures.filter((item) => labels || item.essential).map((item) => (
              <li key={item.slug}>
                <button type="button" aria-pressed={selected === item.objectKey} onClick={() => setSelected(item.objectKey)}>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>

          {structure ? (
            <section className="anatomy-detail">
              <h3>{structure.name}</h3>
              <p><strong>Location.</strong> {structure.location}</p>
              <p><strong>Structure.</strong> {structure.structure}</p>
              <p><strong>Function.</strong> {structure.function}</p>
              {structure.flowRole ? <p><strong>In the circuit.</strong> {structure.flowRole}</p> : null}
              <p className="anatomy-note">System: {system.name}</p>
              <div className="anatomy-actions">
                {structure.curriculum?.lessonId ? (
                  <Link to={`/app/learn/lessons/${structure.curriculum.lessonId}`}>Learn this concept</Link>
                ) : null}
                {tutor.available ? (
                  <>
                    <button type="button" onClick={() => tutor.openTutor('explain', `Explain the ${structure.name}.`, { context: { bodySystem: system.name, organ: organ.name, structure: structure.name } })}>
                      Explain this
                    </button>
                    <button type="button" onClick={() => tutor.openTutor('quiz-me', `Quiz me on the ${organ.name}, starting with the ${structure.name}.`, { context: { bodySystem: system.name, organ: organ.name, structure: structure.name } })}>
                      Quiz me
                    </button>
                  </>
                ) : null}
              </div>
            </section>
          ) : (
            <p className="anatomy-note">Select a structure in the diagram or the list.</p>
          )}
        </aside>
      </div>

      {process ? (
        <section className="anatomy-process">
          <h2>{process.name}</h2>
          <p>{process.summary}</p>
          <div className="anatomy-actions">
            {player.playing ? (
              <button type="button" onClick={player.pause}>Pause</button>
            ) : (
              <button type="button" onClick={player.play} disabled={reducedMotion}>Play</button>
            )}
            <button type="button" onClick={player.previous}>Back</button>
            <button type="button" onClick={player.next}>Step</button>
            <button type="button" onClick={player.reset}>Reset</button>
            <span className="anatomy-note">Step {player.index + 1} of {player.total}</span>
          </div>
          {reducedMotion ? <p className="anatomy-note">Reduced motion is on, so the process steps manually.</p> : null}
          {player.step ? (
            <div className="anatomy-step" aria-live="polite">
              <h3>{player.step.title}</h3>
              <p>{player.step.description}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      <p className="anatomy-credit">
        {HEART_MODEL_CREDIT.credit} · {HEART_MODEL_CREDIT.license} · review: {HEART_MODEL_CREDIT.reviewStatus} · accuracy: {HEART_MODEL_CREDIT.accuracyStatus}
      </p>
    </Container>
  )
}
