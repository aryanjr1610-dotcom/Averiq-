import { useId } from 'react';

import type { VisualProps } from '../types';

type Curve = {
  id: string;
  label: string;
  dashed?: boolean;
  evaluate: (x: number) => number;
};

export function FunctionGraph({
  curves,
  xRange,
  yRange,
  labels = true,
}: {
  curves: Curve[];
  xRange: readonly [number, number];
  yRange: readonly [number, number];
  labels?: boolean;
}) {
  const clip = useId();
  const [xmin, xmax] = xRange;
  const [ymin, ymax] = yRange;

  const x = (value: number) => 45 + (value - xmin) / (xmax - xmin) * 510;
  const y = (value: number) => 320 - (value - ymin) / (ymax - ymin) * 280;

  function path(curve: Curve) {
    let result = '';
    let connected = false;
    let previousY = 0;

    for (let index = 0; index <= 300; index += 1) {
      const coordinate = xmin + (xmax - xmin) * index / 300;
      const value = curve.evaluate(coordinate);

      if (!Number.isFinite(value) || Math.abs(value) > 100000) {
        connected = false;
        continue;
      }

      if (connected && Math.abs(value - previousY) > (ymax - ymin) * 2) {
        connected = false;
      }

      result += `${connected ? 'L' : 'M'}${x(coordinate).toFixed(2)},${y(value).toFixed(2)} `;
      previousY = value;
      connected = true;
    }

    return result;
  }

  return (
    <div>
      <svg viewBox="0 0 600 360" className="educational-svg" role="img" aria-label="Function graph. Solid and dashed curves are identified in the legend.">
        <defs>
          <clipPath id={clip}><rect x="45" y="40" width="510" height="280" /></clipPath>
        </defs>

        {Array.from({ length: 9 }, (_, index) => {
          const xv = xmin + (xmax - xmin) * index / 8;

          return (
            <g key={index} className="graph-grid">
              <line x1={x(xv)} x2={x(xv)} y1="40" y2="320" />
              {labels && index % 2 === 0 && (
                <text x={x(xv)} y="345" textAnchor="middle">{xv.toFixed(1)}</text>
              )}
            </g>
          );
        })}

        {Array.from({ length: 5 }, (_, index) => {
          const yv = ymin + (ymax - ymin) * index / 4;

          return (
            <g key={index} className="graph-grid">
              <line x1="45" x2="555" y1={y(yv)} y2={y(yv)} />
              {labels && <text x="35" y={y(yv) + 5} textAnchor="end">{yv.toFixed(1)}</text>}
            </g>
          );
        })}

        {xmin <= 0 && xmax >= 0 && <line className="graph-axis" x1={x(0)} x2={x(0)} y1="40" y2="320" />}
        {ymin <= 0 && ymax >= 0 && <line className="graph-axis" x1="45" x2="555" y1={y(0)} y2={y(0)} />}

        <g clipPath={`url(#${clip})`}>
          {curves.map((curve) => (
            <path
              key={curve.id}
              d={path(curve)}
              className={curve.dashed ? 'graph-curve graph-curve--reference' : 'graph-curve'}
            />
          ))}
        </g>
      </svg>

      <ul className="graph-legend">
        {curves.map((curve) => (
          <li key={curve.id}>
            {curve.dashed ? 'Dashed' : 'Solid'}: {curve.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SineGraph({ parameters, elapsed, labels }: VisualProps) {
  const amplitude = parameters.amplitude ?? 1;
  const omega = parameters.omega ?? 1;
  const phase = (parameters.phase ?? 0) + elapsed;
  const span = parameters.span ?? 6;

  return (
    <div>
      <FunctionGraph
        xRange={[-span, span]}
        yRange={[-3.5, 3.5]}
        labels={labels}
        curves={[
          {
            id: 'current',
            label: `${amplitude.toFixed(1)} sin(${omega.toFixed(1)}x + ${phase.toFixed(2)})`,
            evaluate: (x) => amplitude * Math.sin(omega * x + phase),
          },
          {
            id: 'reference',
            label: 'sin(x)',
            dashed: true,
            evaluate: (x) => Math.sin(x),
          },
        ]}
      />

      <p>Amplitude: {amplitude.toFixed(1)} · Period: {(2 * Math.PI / omega).toFixed(2)}</p>
      <p>Horizontal displacement: {(-phase / omega).toFixed(2)}</p>
    </div>
  );
}
