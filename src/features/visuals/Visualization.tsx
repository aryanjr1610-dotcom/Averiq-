import { readVisualQuality } from './saved-quality';
import {
  Component,
  Suspense,
  lazy,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ErrorInfo, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Dialog } from '@/components/ui/Dialog';
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';

import { blockAnchor, useBlockReading } from '@/features/learning/reading';
import { useAITutor } from '@/features/ai/AITutorProvider';

import { visualizationDefinition, initialParameters } from './registry';
import { useAnimationClock } from './useAnimationClock';
import { chargePairValues, chargesFromParameters } from './physics';

import type {
  Parameters,
  Quality,
  VisualSelection,
} from './types';

import './visuals.css';

class VisualBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Visualization failure', error, info);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Visualization({
  id,
  initial = {},
  opened = false,
}: {
  id: string;
  initial?: Parameters;
  opened?: boolean;
}) {
  const definition = visualizationDefinition(id);

  if (!definition) {
    return (
      <p className="content-unavailable">
        This visualization has not been installed. Continue with the lesson explanation.
      </p>
    );
  }

  return (
    <VisualInstance
      key={definition.id}
      id={definition.id}
      initial={initial}
      opened={opened}
    />
  );
}

function VisualInstance({
  id,
  initial,
  opened,
}: {
  id: string;
  initial: Parameters;
  opened: boolean;
}) {
  const definition = visualizationDefinition(id)!;
  const location = useLocation();
  const reading = useBlockReading();
  const { reducedMotion } = useAcademicTheme();
  const tutor = useAITutor();

  const root = useRef<HTMLDivElement>(null);
  const [parameters, setParameters] = useState(
    () => initialParameters(definition, initial),
  );

  const [active, setActive] = useState(opened);
  const [expanded, setExpanded] = useState(false);
  const [labels, setLabels] = useState(true);
  const [quality, setQuality] = useState<Quality>(readVisualQuality);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resetToken, setResetToken] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [selection, setSelection] = useState<VisualSelection | null>(null);
  const [notice, setNotice] = useState('');

  const effective = fallback && definition.fallbackId
    ? visualizationDefinition(definition.fallbackId)!
    : definition;

  const Engine = useMemo(
    () => lazy(effective.load),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effective, attempt],
  );

  const elapsed = useAnimationClock(
    active && playing && !reducedMotion,
    speed,
    resetToken,
    root,
  );

  function reset() {
    setParameters(initialParameters(definition, initial));
    setPlaying(false);
    setSelection(null);
    setResetToken((value) => value + 1);
  }

  const pair = definition.category === 'field'
    ? chargePairValues(chargesFromParameters(parameters))
    : null;

  function readerReturn() {
    if (!reading.lessonId || !reading.blockId) return undefined;

    const anchor = blockAnchor(reading.lessonId, reading.blockId);
    const offset = document.getElementById(anchor)?.getBoundingClientRect().top ?? 0;

    return {
      path: location.pathname,
      anchor,
      offset: Math.max(-2000, Math.min(2000, offset)),
      mode: reading.mode,
    };
  }

  const labPrefix = location.pathname.startsWith('/dev/')
    ? '/dev/visual-lab/'
    : '/app/visual-lab/';

  const errorPanel = (
    <div role="alert" className="visual-error">
      <p>Interactive {effective.dimension}D is unavailable on this device or connection.</p>

      <div className="actions">
        <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
          Retry
        </Button>

        {definition.fallbackId && !fallback && (
          <Button variant="secondary" onClick={() => setFallback(true)}>
            View 2D version
          </Button>
        )}
      </div>

      <p>{definition.explanation}</p>
    </div>
  );

  function canvas() {
    return (
      <VisualBoundary
        key={`${effective.id}:${attempt}`}
        fallback={errorPanel}
      >
        <Suspense fallback={<p role="status">Loading interactive view…</p>}>
          <Engine
            parameters={parameters}
            elapsed={elapsed}
            labels={labels}
            quality={quality}
            resetToken={resetToken}
            onSelect={setSelection}
          />
        </Suspense>
      </VisualBoundary>
    );
  }

  function controls() {
    return (
      <div className="visual-controls">
        {definition.parameters.map((parameter) => (
          <Slider
            key={parameter.key}
            label={parameter.label}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={parameters[parameter.key] ?? parameter.initial}
            unit={parameter.unit}
            onChange={(value) => {
              setParameters((current) => ({ ...current, [parameter.key]: value }));
            }}
          />
        ))}

        {effective.dimension === 3 && (
          <label className="visual-parameter">
            <span className="t-label text-content-secondary">3D quality</span>
            <select
              value={quality}
              onChange={(event) => setQuality(event.target.value as Quality)}
              className="h-10 rounded-sm border border-line bg-surface-interactive px-3 t-body-sm text-content outline-none"
            >
              <option value="auto">Auto</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        )}

        <label className="flex items-center gap-2.5 t-label text-content-secondary cursor-pointer py-1">
          <input
            type="checkbox"
            checked={labels}
            onChange={(event) => setLabels(event.target.checked)}
          />
          Show labels
        </label>

        {definition.animated && (
          <div className="actions">
            <Button
              variant="outline"
              disabled={reducedMotion}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing && !reducedMotion ? 'Pause' : 'Play'}
            </Button>

            <label>
              Speed
              <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={2}>2×</option>
              </select>
            </label>

            {reducedMotion && <p>Automatic motion is disabled by your motion preference.</p>}
          </div>
        )}

        {pair && (
          <dl className="symbol-list">
            <div><dt>Distance</dt><dd>{pair.distance.toFixed(2)} m</dd></div>
            <div>
              <dt>Force magnitude</dt>
              <dd>
                {pair.force === null
                  ? 'Undefined for coincident point charges'
                  : `${pair.force.toPrecision(3)} N`}
              </dd>
            </div>
            <div><dt>Interaction</dt><dd>{pair.interaction}</dd></div>
          </dl>
        )}

        {selection && (
          <section aria-live="polite">
            <strong>{selection.name}</strong>
            <p>{selection.description}</p>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="visualization" ref={root}>
      <header>
        <strong>{definition.title}</strong>
        <p>{definition.description}</p>
      </header>

      {!active ? (
        <div className="visual-preview">
          <p>{definition.explanation}</p>
          <Button variant="secondary" onClick={() => setActive(true)}>
            Open interactive {definition.dimension}D
          </Button>
        </div>
      ) : (
        <>
          {!expanded && <div className="visual-stage">{canvas()}</div>}

          <details className="visual-control-disclosure" open>
            <summary>Controls and live values</summary>
            {controls()}
          </details>

          <div className="actions">
            <Button variant="outline" onClick={reset}>Reset</Button>

            <Dialog
              open={expanded}
              onOpenChange={setExpanded}
              title={definition.title}
              description={definition.description}
              trigger={<Button variant="outline">Expand</Button>}
            >
              {expanded && (
                <div className="visual-expanded">
                  <div className="visual-stage">{canvas()}</div>
                  {controls()}
                </div>
              )}
            </Dialog>

            {definition.fallbackId && (
              <Button variant="quiet" onClick={() => setFallback((value) => !value)}>
                {fallback ? 'Try 3D' : 'Use 2D'}
              </Button>
            )}

            {tutor.available && (
              <Button
                variant="quiet"
                onClick={() =>
                  tutor.openTutor('explain-diagram', 'Explain what I am seeing here.', {
                    context: {
                      visualizationId: definition.id,
                      visualizationParameters: parameters,
                      selectedObject: selection?.id,
                    },
                  })
                }
              >
                Explain with AI
              </Button>
            )}

            {typeof document !== 'undefined' && document.fullscreenEnabled && (
              <Button
                variant="quiet"
                onClick={() => {
                  const operation = document.fullscreenElement
                    ? document.exitFullscreen()
                    : root.current?.requestFullscreen();

                  void operation?.catch(() => setNotice('Fullscreen is unavailable. Use Expand instead.'));
                }}
              >
                Fullscreen
              </Button>
            )}
          </div>
        </>
      )}

      {!opened && (
        <Link
          to={`${labPrefix}${definition.id}`}
          state={{ readerReturn: readerReturn() }}
        >
          Open Visual Lab
        </Link>
      )}

      <details>
        <summary>What you are seeing</summary>
        <p>{definition.explanation}</p>
        <ul>{definition.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
      </details>

      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
