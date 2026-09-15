import type { VisualProps } from '../types';

const chambers = [
  { id: 'right-atrium', name: 'Right atrium', x: 170, y: 105, description: 'Receives deoxygenated blood returning from the body.' },
  { id: 'right-ventricle', name: 'Right ventricle', x: 170, y: 260, description: 'Pumps blood toward the lungs through the pulmonary circulation.' },
  { id: 'left-atrium', name: 'Left atrium', x: 470, y: 105, description: 'Receives oxygenated blood returning from the lungs.' },
  { id: 'left-ventricle', name: 'Left ventricle', x: 470, y: 260, description: 'Pumps blood into the systemic circulation.' },
] as const;

export default function HeartFallback({ labels, onSelect }: VisualProps) {
  return (
    <svg className="educational-svg adaptive-curriculum-visual" viewBox="0 0 800 430" role="img" aria-label="Simplified four chamber heart diagram">
      <path className="adaptive-link" d="M90 105 H125 M215 105 H425 M515 105 H690 M690 105 V260 H515 M425 260 H215 M125 260 H90" />
      <path className="adaptive-link adaptive-link--dashed" d="M170 150 V215 M470 150 V215" />
      {chambers.map((chamber) => (
        <g
          key={chamber.id}
          className="adaptive-node"
          role="button"
          tabIndex={0}
          aria-label={`${chamber.name}: ${chamber.description}`}
          transform={`translate(${chamber.x} ${chamber.y})`}
          onClick={() => onSelect({ id: chamber.id, name: chamber.name, description: chamber.description })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect({ id: chamber.id, name: chamber.name, description: chamber.description });
            }
          }}
        >
          <rect x="-62" y="-42" width="124" height="84" rx="24" />
          {labels && <text textAnchor="middle" y="5">{chamber.name}</text>}
        </g>
      ))}
      <text className="adaptive-warning" x="400" y="390" textAnchor="middle">Simplified educational schematic · not to scale.</text>
    </svg>
  );
}
