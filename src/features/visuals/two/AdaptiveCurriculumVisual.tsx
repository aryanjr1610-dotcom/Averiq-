import type { KeyboardEvent, ReactNode } from 'react';

import type { AdaptiveVisualFamily } from '../curriculum';
import type { VisualProps, VisualSelection } from '../types';

const stopWords = new Set([
  'and', 'the', 'of', 'in', 'to', 'a', 'an', 'for', 'with', 'on', 'from',
  'introduction', 'chapter', 'lesson', 'study', 'understanding', 'basic', 'basics',
]);

function words(topic: string) {
  const result = topic
    .replace(/[-_]+/g, ' ')
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word.toLocaleLowerCase()));

  return Array.from(new Set(result)).slice(0, 5);
}

function title(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function nodeSelection(id: string, name: string, description: string): VisualSelection {
  return { id, name, description };
}

function Selectable({
  id,
  label,
  description,
  x,
  y,
  active,
  onSelect,
}: {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  active: boolean;
  onSelect: VisualProps['onSelect'];
}) {
  const select = () => onSelect(nodeSelection(id, label, description));
  const key = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  };

  return (
    <g
      className={`adaptive-node${active ? ' adaptive-node--active' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${label}: ${description}`}
      onClick={select}
      onKeyDown={key}
      transform={`translate(${x} ${y})`}
    >
      <circle r="42" />
      <text textAnchor="middle" y="5">{label.length > 13 ? `${label.slice(0, 12)}…` : label}</text>
    </g>
  );
}

function ProcessVisual({
  labels,
  stage,
  topic,
  onSelect,
}: {
  labels: string[];
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const names = [labels[0] ?? 'Input', labels[1] ?? 'Change', labels[2] ?? 'Result', labels[3] ?? 'Feedback'];
  const xs = [120, 340, 560, 780] as const;

  return (
    <>
      <path className="adaptive-link" d="M162 220 H298 M382 220 H518 M602 220 H738" markerEnd="url(#adaptive-arrow)" />
      {names.map((name, index) => (
        <Selectable
          key={`${name}:${index}`}
          id={`stage-${index}`}
          label={title(name)}
          description={`Stage ${index + 1} in the conceptual model for ${topic}. Compare it with the lesson text for the exact subject-specific mechanism.`}
          x={xs[index] ?? 120}
          y={220}
          active={index === stage}
          onSelect={onSelect}
        />
      ))}
      <text className="adaptive-caption" x="450" y="350" textAnchor="middle">Change the stage control to trace the process from left to right.</text>
    </>
  );
}

function TimelineVisual({ labels, stage, topic, onSelect }: {
  labels: string[];
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const names = labels.length >= 4 ? labels.slice(0, 4) : ['Context', 'Trigger', 'Change', 'Legacy'];
  const xs = [130, 345, 560, 775] as const;

  return (
    <>
      <line className="adaptive-link" x1="100" y1="235" x2="810" y2="235" />
      {names.map((name, index) => (
        <g key={`${name}:${index}`}>
          <line className="adaptive-tick" x1={xs[index] ?? 130} y1="195" x2={xs[index] ?? 130} y2="275" />
          <Selectable
            id={`event-${index}`}
            label={title(name)}
            description={`A timeline checkpoint for ${topic}. Use it as a causal organizer rather than an exact historical date unless the lesson provides a date.`}
            x={xs[index] ?? 130}
            y={index % 2 === 0 ? 135 : 335}
            active={index === stage}
            onSelect={onSelect}
          />
        </g>
      ))}
      <text className="adaptive-caption" x="450" y="425" textAnchor="middle">Concept timeline · exact dates and boundaries come from the lesson content.</text>
    </>
  );
}

function MapVisual({ labels, stage, topic, onSelect }: {
  labels: string[];
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const names = labels.length >= 3 ? labels.slice(0, 4) : ['Place', 'Pattern', 'Movement', 'Impact'];
  const points = [[210, 165], [640, 145], [300, 330], [690, 325]] as const;

  return (
    <>
      <path className="adaptive-region" d="M95 120 C165 68 270 82 335 135 C405 192 458 166 505 112 C572 38 752 82 807 180 C854 264 783 389 668 397 C572 403 540 332 450 331 C356 330 316 404 205 388 C96 372 48 218 95 120 Z" />
      <path className="adaptive-map-grid" d="M95 205 H807 M95 290 H807 M250 90 V390 M450 90 V390 M650 90 V390" />
      <path className="adaptive-link adaptive-link--dashed" d="M235 180 C355 130 515 125 615 155 M325 315 C455 262 555 258 660 305" markerEnd="url(#adaptive-arrow)" />
      {points.map(([x, y], index) => (
        <Selectable
          key={index}
          id={`map-${index}`}
          label={title(names[index] ?? `Zone ${index + 1}`)}
          description={`A schematic spatial marker for ${topic}; it does not claim an exact real-world coordinate.`}
          x={x}
          y={y}
          active={index === stage}
          onSelect={onSelect}
        />
      ))}
      <text className="adaptive-warning" x="450" y="445" textAnchor="middle">Schematic / not to scale — use verified lesson maps for real boundaries and locations.</text>
    </>
  );
}

function GraphVisual({ stage, topic, onSelect }: {
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const offset = stage * 24;
  const path = `M100 350 C210 ${320 - offset} 275 ${115 + offset} 390 205 S600 ${360 - offset} 790 ${105 + offset / 2}`;
  const select = () => onSelect(nodeSelection('graph', 'Graph relationship', `The curve is a conceptual relationship for ${topic}. Read exact axes, equations and units from the lesson.`));

  return (
    <>
      <path className="graph-grid" d="M100 80 V380 M100 380 H820 M100 305 H820 M100 230 H820 M100 155 H820 M220 80 V380 M340 80 V380 M460 80 V380 M580 80 V380 M700 80 V380" />
      <path className="graph-axis" d="M100 80 V380 H820" />
      <path className="graph-curve" d={path} />
      <g
        className="adaptive-hit"
        role="button"
        tabIndex={0}
        aria-label={`Graph for ${topic}`}
        onClick={select}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            select();
          }
        }}
      >
        <rect x="95" y="75" width="730" height="310" fill="transparent" />
      </g>
      <text className="adaptive-caption" x="450" y="430" textAnchor="middle">Concept graph · the stage control changes the shape so you can discuss trends and turning points.</text>
    </>
  );
}

function WaveVisual({ stage, topic, onSelect }: {
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const phase = stage * 40;
  const points = Array.from({ length: 73 }, (_, index) => {
    const x = 90 + index * 10;
    const y = 230 - Math.sin((index * 10 + phase) / 62) * 95;
    return `${x},${y}`;
  }).join(' ');

  return (
    <>
      <line className="graph-axis" x1="80" y1="230" x2="830" y2="230" />
      <polyline className="graph-curve" points={points} />
      <Selectable id="crest" label="Crest" description={`A high point in the wave model for ${topic}.`} x={260} y={120} active={stage === 1} onSelect={onSelect} />
      <Selectable id="cycle" label="Cycle" description={`One repeating part of the wave model for ${topic}.`} x={580} y={340} active={stage === 3} onSelect={onSelect} />
      <text className="adaptive-caption" x="450" y="430" textAnchor="middle">Use Play or the stage slider to relate phase, repetition and propagation.</text>
    </>
  );
}

function ParticleVisual({ stage, topic, onSelect }: {
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const spread = 25 + stage * 14;
  const particles = Array.from({ length: 24 }, (_, index) => {
    const column = index % 6;
    const row = Math.floor(index / 6);
    return [270 + column * spread, 140 + row * spread] as const;
  });

  return (
    <>
      <rect className="adaptive-vessel" x="170" y="80" width="560" height="320" rx="28" />
      {particles.map(([x, y], index) => {
        const select = () => onSelect(nodeSelection(`particle-${index}`, 'Particle model', `A representative particle in the conceptual model for ${topic}. Particle size and spacing are not to scale.`));
        return (
          <circle
            key={index}
            className={`adaptive-particle${index % 3 === 0 ? ' adaptive-particle--accent' : ''}`}
            cx={x}
            cy={y}
            r={11}
            role="button"
            tabIndex={0}
            aria-label={`Particle ${index + 1}`}
            onClick={select}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                select();
              }
            }}
          />
        );
      })}
      <text className="adaptive-caption" x="450" y="445" textAnchor="middle">Particle model · spacing is exaggerated so changes are visible.</text>
    </>
  );
}

function AnatomyVisual({ labels, stage, topic, onSelect }: {
  labels: string[];
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const names = labels.length >= 3 ? labels : ['Structure', 'Transport', 'Control', 'Response'];
  const points = [[450, 115], [370, 225], [530, 225], [450, 345]] as const;

  return (
    <>
      <path className="adaptive-body" d="M450 62 C418 62 395 88 395 119 C395 144 409 162 426 174 L408 204 C372 220 344 260 350 309 L369 405 H531 L550 309 C556 260 528 220 492 204 L474 174 C491 162 505 144 505 119 C505 88 482 62 450 62 Z" />
      <path className="adaptive-link adaptive-link--dashed" d="M450 155 L370 225 L450 345 L530 225 Z" />
      {points.map(([x, y], index) => (
        <Selectable
          key={index}
          id={`anatomy-${index}`}
          label={title(names[index] ?? `Part ${index + 1}`)}
          description={`A structure/function checkpoint for ${topic}. The body outline is schematic and is not a diagnostic or surgical representation.`}
          x={x}
          y={y}
          active={index === stage}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

function GeometryVisual({ labels, stage, topic, onSelect }: {
  labels: string[];
  stage: number;
  topic: string;
  onSelect: VisualProps['onSelect'];
}) {
  const shift = stage * 12;
  return (
    <>
      <polygon className="adaptive-geometry" points={`180,350 420,${110 + shift} 730,350`} />
      <line className="adaptive-link adaptive-link--dashed" x1="420" y1={110 + shift} x2="420" y2="350" />
      <Selectable id="vertex-a" label={title(labels[0] ?? 'Vertex A')} description={`A selectable geometric feature in the model for ${topic}.`} x={180} y={350} active={stage === 0} onSelect={onSelect} />
      <Selectable id="vertex-b" label={title(labels[1] ?? 'Vertex B')} description={`A selectable geometric feature in the model for ${topic}.`} x={420} y={110 + shift} active={stage === 1} onSelect={onSelect} />
      <Selectable id="vertex-c" label={title(labels[2] ?? 'Vertex C')} description={`A selectable geometric feature in the model for ${topic}.`} x={730} y={350} active={stage === 2} onSelect={onSelect} />
      <text className="adaptive-caption" x="450" y="440" textAnchor="middle">Schematic geometry · exact measures come from the worked problem.</text>
    </>
  );
}

function layoutFor(family: AdaptiveVisualFamily) {
  if (family === 'physics-wave') return 'wave';
  if (family === 'chemistry-particles') return 'particles';
  if (family === 'biology-anatomy' || family === 'physical-education') return 'anatomy';
  if (family === 'math-graph' || family === 'math-probability') return 'graph';
  if (family === 'math-geometry') return 'geometry';
  if (family === 'geography-map' || family === 'geography-earth') return 'map';
  if (family === 'history-timeline') return 'timeline';
  return 'process';
}

export default function AdaptiveCurriculumVisual({
  parameters,
  elapsed,
  labels: showLabels,
  onSelect,
  context,
}: VisualProps) {
  const family = context?.family ?? 'general-concept';
  const topic = context?.topic ?? 'this concept';
  const terms = words(topic);
  const stage = Math.max(0, Math.min(3, Math.round(parameters.stage ?? 0)));
  const layout = layoutFor(family);
  const motionStage = elapsed > 0 ? Math.floor(elapsed / 1.6) % 4 : stage;
  const activeStage = context?.animatedByClock ? motionStage : stage;

  let body: ReactNode;
  if (layout === 'wave') body = <WaveVisual stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'particles') body = <ParticleVisual stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'anatomy') body = <AnatomyVisual labels={terms} stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'graph') body = <GraphVisual stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'geometry') body = <GeometryVisual labels={terms} stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'map') body = <MapVisual labels={terms} stage={activeStage} topic={topic} onSelect={onSelect} />;
  else if (layout === 'timeline') body = <TimelineVisual labels={terms} stage={activeStage} topic={topic} onSelect={onSelect} />;
  else body = <ProcessVisual labels={terms} stage={activeStage} topic={topic} onSelect={onSelect} />;

  return (
    <svg
      className="educational-svg adaptive-curriculum-visual"
      viewBox="0 0 900 470"
      role="img"
      aria-label={`Interactive conceptual visualization for ${topic}`}
    >
      <defs>
        <marker id="adaptive-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path className="adaptive-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {showLabels && (
        <text className="adaptive-topic" x="450" y="42" textAnchor="middle">{topic}</text>
      )}
      {body}
    </svg>
  );
}
