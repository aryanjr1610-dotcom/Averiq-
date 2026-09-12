// src/components/ui/Slider.tsx
export function Slider({
  label, value, min, max, step = 0.01, unit, onChange,
}: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="flex flex-col gap-2 py-1">
      <span className="flex items-baseline justify-between gap-3">
        <span className="t-label text-content-secondary">{label}</span>
        <span className="t-label num tabular-nums text-content">
          {value.toFixed(step < 1 ? 2 : 0)}{unit ? ` ${unit}` : ""}
        </span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
        aria-label={label}
      />
    </label>
  );
}
