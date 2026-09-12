import { useId, useState } from 'react';
import { ChargeMarker } from '@/components/visual/ChargeMarker';

function FieldCanvas({ q1, q2, x1, x2 }: { q1: number; q2: number; x1: number; x2: number }) {
  const marker = useId();
  const sx = (x: number) => 300 + x * 150;
  const sy = (y: number) => 210 - y * 150;

  type Arrow = { x: number; y: number; dx: number; dy: number; mag: number; id: string };
  const points: Arrow[] = [];

  for (let row = -5; row <= 5; row += 1) {
    for (let col = -8; col <= 8; col += 1) {
      const px = col * 0.2;
      const py = row * 0.2;

      // Distance to charge 1 and 2
      const r1sq = (px - x1) ** 2 + py ** 2;
      const r2sq = (px - x2) ** 2 + py ** 2;
      if (r1sq < 0.02 || r2sq < 0.02) continue; // skip points too close to charge core

      const r1 = Math.sqrt(r1sq);
      const r2 = Math.sqrt(r2sq);

      // E = k * q / r^2 * (r_hat)
      const k = 8.988e9;
      const e1x = (k * q1 * 1e-6 * (px - x1)) / (r1 ** 3);
      const e1y = (k * q1 * 1e-6 * py) / (r1 ** 3);
      const e2x = (k * q2 * 1e-6 * (px - x2)) / (r2 ** 3);
      const e2y = (k * q2 * 1e-6 * py) / (r2 ** 3);

      const ex = e1x + e2x;
      const ey = e1y + e2y;
      const mag = Math.hypot(ex, ey);
      if (mag < 1e-6) continue;

      const norm = 0.12;
      points.push({
        x: px,
        y: py,
        dx: (ex / mag) * norm,
        dy: (ey / mag) * norm,
        mag,
        id: `${row}:${col}`,
      });
    }
  }

  const maxMag = points.reduce((m, p) => Math.max(m, p.mag), 1e-6);

  return (
    <svg
      viewBox="0 0 600 420"
      className="w-full h-auto block"
      style={{ maxHeight: '480px' }}
      role="img"
      aria-label="Two-charge electric field diagram"
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
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--aq-accent, #7A98BA)" />
        </marker>
      </defs>

      <g>
        {points.map((p) => {
          const opacity = 0.25 + 0.65 * Math.min(1, p.mag / maxMag);
          return (
            <line
              key={p.id}
              x1={sx(p.x)}
              y1={sy(p.y)}
              x2={sx(p.x + p.dx)}
              y2={sy(p.y + p.dy)}
              stroke="var(--aq-accent, #7A98BA)"
              strokeOpacity={opacity}
              strokeWidth={0.8 + opacity}
              markerEnd={`url(#${marker})`}
            />
          );
        })}
      </g>

      <ChargeMarker cx={sx(x1)} cy={sy(0)} sign={q1 >= 0 ? 1 : -1} label="q1" />
      <ChargeMarker cx={sx(x2)} cy={sy(0)} sign={q2 >= 0 ? 1 : -1} label="q2" />
    </svg>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="aq-readout__row">
      <span className="aq-readout__k">{k}</span>
      <span className="aq-readout__v">{v}</span>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="aq-field">
      <span className="aq-field__head">
        <span className="aq-field__label">{label}</span>
        <span className="aq-field__value">{value.toFixed(2)} {unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${fill}%` }}
        aria-label={`${label} in ${unit}`}
      />
    </label>
  );
}

// src/pages/VisualLab.tsx (or wherever the two-charge sim lives)
export default function VisualLab() {
  const [q1, setQ1] = useState(2);
  const [q2, setQ2] = useState(-2);
  const [x1, setX1] = useState(-0.6);
  const [x2, setX2] = useState(0.6);

  const distance = Math.abs(x2 - x1);
  const force = (8.988e9 * Math.abs(q1 * q2) * 1e-12) / (distance * distance);
  const attractive = q1 * q2 < 0;

  return (
    <div className="aq-page aq-stack">
      <div className="aq-row">
        <button className="aq-btn aq-btn--ghost" onClick={() => history.back()}>← Averiq</button>
      </div>

      <header className="aq-stack" style={{ gap: 6 }}>
        <h1 className="aq-title">Two-charge electric field</h1>
        <p className="aq-sub">Change charge signs, magnitudes and positions.</p>
      </header>

      <div className="aq-card">
        <FieldCanvas q1={q1} q2={q2} x1={x1} x2={x2} />
        <div className="aq-row" style={{ marginTop: 16 }}>
          <button className="aq-btn">Inspect charge 1</button>
          <button className="aq-btn">Inspect charge 2</button>
          <span className="aq-spacer" />
          <button className="aq-btn aq-btn--primary">Ask Averiq AI</button>
        </div>
        <p className="aq-caption" style={{ marginTop: 12 }}>
          Field directions in the z = 0 plane. Arrow opacity indicates relative strength.
        </p>
      </div>

      <div className="aq-card aq-stack">
        <h2 className="aq-section">Controls</h2>
        <div className="aq-controls">
          <Slider label="Charge 1"     value={q1} min={-5}   max={5}   step={0.1}  unit="µC" onChange={setQ1} />
          <Slider label="Charge 2"     value={q2} min={-5}   max={5}   step={0.1}  unit="µC" onChange={setQ2} />
          <Slider label="Charge 1 · x" value={x1} min={-1.5} max={1.5} step={0.05} unit="m"  onChange={setX1} />
          <Slider label="Charge 2 · x" value={x2} min={-1.5} max={1.5} step={0.05} unit="m"  onChange={setX2} />
        </div>

        <div className="aq-readout">
          <Row k="Distance"        v={`${distance.toFixed(2)} m`} />
          <Row k="Force magnitude" v={`${force.toFixed(4)} N`} />
          <Row k="Interaction"     v={attractive ? 'Attractive' : 'Repulsive'} />
        </div>

        <div className="aq-row">
          <button className="aq-btn" onClick={() => { setQ1(2); setQ2(-2); setX1(-0.6); setX2(0.6); }}>Reset</button>
          <button className="aq-btn">Expand</button>
          <button className="aq-btn aq-btn--ghost">Explain with AI</button>
        </div>
      </div>
    </div>
  );
}
