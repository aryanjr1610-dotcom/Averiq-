// src/components/visual/ChargeMarker.tsx
export function ChargeMarker({
  x,
  y,
  cx,
  cy,
  sign,
  label,
}: {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  sign: 1 | -1;
  label: string;
}) {
  const posX = cx ?? x ?? 0;
  const posY = cy ?? y ?? 0;
  const fill = sign > 0 ? "var(--aq-pos, #C65F58)" : "var(--aq-neg, #5E89B2)";

  return (
    <g>
      <circle cx={posX} cy={posY} r="14" fill={fill} opacity="0.16" />
      <circle cx={posX} cy={posY} r="9" fill={fill} stroke="#EDEEF1" strokeWidth="1.5" />
      {/* Sign glyph — colour-blind safe, readable at any zoom */}
      <path
        d={sign > 0 ? `M${posX - 4} ${posY}h8M${posX} ${posY - 4}v8` : `M${posX - 4} ${posY}h8`}
        stroke="#0F1013"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Label offset ABOVE the marker so it stops colliding with arrows */}
      <text
        x={posX}
        y={posY - 21}
        textAnchor="middle"
        fill="#EDEEF1"
        fontSize="12"
        fontWeight="500"
        stroke="#0F1013"
        strokeWidth="3.5"
        paintOrder="stroke"
      >
        {label}
      </text>
    </g>
  );
}
