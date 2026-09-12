import { useState } from 'react';

import type { VisualProps } from '../types';

const structures = [
  {
    id: 'membrane',
    name: 'Cell membrane',
    description: 'A selectively permeable boundary that regulates exchange and participates in cell communication.',
  },
  {
    id: 'nucleus',
    name: 'Nucleus',
    description: 'Contains most of the cell’s DNA. Gene expression helps coordinate cellular activity.',
  },
  {
    id: 'mitochondrion',
    name: 'Mitochondrion',
    description: 'Participates in aerobic respiration and ATP production. Energy transformation involves multiple cellular processes.',
  },
  {
    id: 'cytoplasm',
    name: 'Cytoplasm',
    description: 'The region between the cell membrane and nucleus, including cytosol and organelles, where many cellular reactions occur.',
  },
];

export default function CellDiagram({ labels, onSelect }: VisualProps) {
  const [selected, setSelected] = useState('');

  function select(id: string) {
    const structure = structures.find((item) => item.id === id);
    if (!structure) return;

    setSelected(id);
    onSelect(structure);
  }

  return (
    <div>
      <svg viewBox="0 0 600 380" className="educational-svg cell-diagram" role="img" aria-label="Simplified animal cell containing a nucleus and a few mitochondria. Select a labeled button below for its function.">
        <ellipse
          cx="300" cy="190" rx="245" ry="145"
          className={selected === 'membrane' ? 'cell-boundary selected' : 'cell-boundary'}
        />

        <ellipse
          cx="275" cy="180" rx="70" ry="63"
          className={selected === 'nucleus' ? 'cell-nucleus selected' : 'cell-nucleus'}
        />

        {[150, 415].map((x, index) => (
          <ellipse
            key={x}
            cx={x}
            cy={index ? 235 : 135}
            rx="35"
            ry="16"
            transform={`rotate(-25 ${x} ${index ? 235 : 135})`}
            className={selected === 'mitochondrion' ? 'cell-mito selected' : 'cell-mito'}
          />
        ))}

        {labels && (
          <>
            <text x="245" y="185">Nucleus</text>
            <text x="320" y="90">Cytoplasm</text>
            <text x="385" y="300">Membrane</text>
          </>
        )}
      </svg>

      <div className="actions">
        {structures.map((structure) => (
          <button
            className="visual-label-button"
            key={structure.id}
            aria-pressed={selected === structure.id}
            onClick={() => select(structure.id)}
          >
            {structure.name}
          </button>
        ))}
      </div>
    </div>
  );
}
