export type CircuitPart =
  | 'wire'
  | 'battery'
  | 'resistor'
  | 'switch'
  | 'ammeter'
  | 'voltmeter';

export function CircuitSymbol({
  part,
  x = 0,
  y = 0,
}: {
  part: CircuitPart;
  x?: number;
  y?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="currentColor" strokeWidth="2">
      {part === 'wire' && <path d="M0 20H80" />}
      {part === 'battery' && <path d="M0 20H30M30 3V37M43 10V30M43 20H80" />}
      {part === 'resistor' && <path d="M0 20H15V10H65V30H15V20M65 20H80" />}
      {part === 'switch' && <path d="M0 20H22M25 20L57 3M60 20H80" />}

      {(part === 'ammeter' || part === 'voltmeter') && (
        <>
          <path d="M0 20H20M60 20H80" />
          <circle cx="40" cy="20" r="20" />
          <text x="40" y="26" textAnchor="middle" stroke="none" fill="currentColor">
            {part === 'ammeter' ? 'A' : 'V'}
          </text>
        </>
      )}
    </g>
  );
}
