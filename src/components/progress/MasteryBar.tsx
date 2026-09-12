const LEVELS = [
  { min: 0, label: 'Not started', glyph: '○', tone: 'text-ink-tertiary', bar: 'bg-surface-3' },
  { min: 25, label: 'Learning', glyph: '◔', tone: 'text-warning', bar: 'bg-warning' },
  { min: 60, label: 'Familiar', glyph: '◕', tone: 'text-accent', bar: 'bg-accent' },
  { min: 85, label: 'Mastered', glyph: '●', tone: 'text-success', bar: 'bg-success' },
];

export function MasteryBar({ label, value }: { label: string; value: number }) {
  const level = [...LEVELS].reverse().find((l) => value >= l.min) ?? LEVELS[0]!;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{label}</span>
      <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-3">
        <span className={'block h-full origin-left rounded-full ' + level.bar} style={{ transform: `scaleX(${value / 100})`, width: '100%' }} />
      </span>
      <span className={'flex w-[104px] shrink-0 items-center justify-end gap-1.5 text-caption ' + level.tone}>
        <span aria-hidden>{level.glyph}</span>
        {level.label}
      </span>
      <span className="w-9 shrink-0 text-right tabular text-caption text-ink-secondary">{Math.round(value)}%</span>
    </div>
  );
}

export function ProgressBar({
  label,
  value,
  max = 100,
  showValue = true,
}: {
  label: string;
  value: number;
  max?: number;
  showValue?: boolean;
}) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = Math.min(safeMax, Math.max(0, safeValue));
  const percentage = (clamped / safeMax) * 100;

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div className="flex items-center justify-between text-caption text-ink-secondary">
        <span>{label}</span>
        {showValue && <span className="tabular">{Math.round(percentage)}%</span>}
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={clamped}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
      >
        <div
          className="h-full origin-left rounded-full bg-accent transition-transform duration-medium ease-standard"
          style={{ transform: `scaleX(${percentage / 100})`, width: '100%' }}
        />
      </div>
    </div>
  );
}

