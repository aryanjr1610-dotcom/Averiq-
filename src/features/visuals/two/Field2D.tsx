import { useId } from 'react';
import { ChargeMarker } from '@/components/visual/ChargeMarker';
import { Button } from '@/components/ui/Button';

import {
  chargesFromParameters,
  electricField,
} from '../physics';

import type { VisualProps } from '../types';

export default function Field2D({ parameters, labels, onSelect }: VisualProps) {
  const marker = useId();
  const charges = chargesFromParameters(parameters);

  const sx = (x: number) => 300 + x * 150;
  const sy = (y: number) => 210 - y * 150;

  type ArrowPoint = {
    x: number;
    y: number;
    dx: number;
    dy: number;
    magnitude: number;
    row: number;
    column: number;
  };

  const points: ArrowPoint[] = [];

  for (let row = -5; row <= 5; row += 1) {
    for (let column = -8; column <= 8; column += 1) {
      const x = column * 0.2;
      const y = row * 0.2;
      const vector = electricField([x, y, 0], charges, 0.14);

      if (!vector) continue;

      const magnitude = Math.hypot(...vector);
      if (magnitude < 1e-10) continue;

      const dx = (vector[0] / magnitude) * 0.12;
      const dy = (vector[1] / magnitude) * 0.12;

      points.push({ x, y, dx, dy, magnitude, row, column });
    }
  }

  const maxMagnitude = points.reduce((max, p) => Math.max(max, p.magnitude), 1e-10);

  const arrows = points.map((p) => {
    const opacity = 0.25 + 0.65 * Math.min(1, p.magnitude / maxMagnitude);
    return (
      <line
        key={`${p.row}:${p.column}`}
        x1={sx(p.x)}
        y1={sy(p.y)}
        x2={sx(p.x + p.dx)}
        y2={sy(p.y + p.dy)}
        stroke="rgb(var(--subject-accent))"
        strokeOpacity={opacity}
        strokeWidth={0.8 + opacity}
        markerEnd={`url(#${marker})`}
      />
    );
  });

  return (
    <div>
      <svg
        viewBox="0 0 600 420"
        className="educational-svg"
        role="img"
        aria-label="Resultant electric field vectors and point charges. Use the charge buttons for descriptions."
      >
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="rgb(var(--subject-accent))" />
          </marker>
        </defs>

        <g className="field-arrows">{arrows}</g>

        {charges.map((charge, index) => (
          <ChargeMarker
            key={charge.id}
            x={sx(charge.position[0])}
            y={sy(charge.position[1])}
            sign={charge.q >= 0 ? 1 : -1}
            label={labels ? `q${index + 1}` : `${(charge.q * 1e6).toFixed(1)} μC`}
          />
        ))}
      </svg>

      <div className="actions mt-4 flex flex-wrap gap-2">
        {charges.map((charge, index) => (
          <Button
            variant="secondary"
            size="sm"
            key={charge.id}
            onClick={() => onSelect({
              id: charge.id,
              name: `Charge ${index + 1}`,
              description: `${(charge.q * 1e6).toFixed(1)} μC at (${charge.position[0].toFixed(1)}, ${charge.position[1].toFixed(1)}) m. Positive charges produce outward fields; negative charges produce inward fields.`,
            })}
          >
            Inspect charge {index + 1}
          </Button>
        ))}
      </div>

      <p className="t-caption mt-3 text-content-tertiary">
        Electric field vector field in the z = 0 plane. Arrow opacity scales with field strength.
      </p>
    </div>
  );
}
