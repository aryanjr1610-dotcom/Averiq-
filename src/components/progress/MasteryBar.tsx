import { motion, useReducedMotion } from 'framer-motion'

const LEVELS = [
  { min: 0, label: 'Not started', glyph: '○', tone: 'text-ink-tertiary', bar: 'bg-surface-3' },
  { min: 25, label: 'Learning', glyph: '◔', tone: 'text-warning', bar: 'bg-warning' },
  { min: 60, label: 'Familiar', glyph: '◕', tone: 'text-accent', bar: 'bg-accent' },
  { min: 85, label: 'Mastered', glyph: '●', tone: 'text-success', bar: 'bg-success' },
];

const spring = { type: 'spring' as const, stiffness: 100, damping: 16, mass: 0.72 };

export function MasteryBar({ label, value }: { label: string; value: number }) {
  const reduceMotion = useReducedMotion();
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  const level = [...LEVELS].reverse().find((l) => safeValue >= l.min) ?? LEVELS[0]!;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1 truncate text-body-sm text-ink">{label}</span>
      <span className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-surface-3">
        <motion.span
          className={'block h-full origin-left rounded-full ' + level.bar}
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: safeValue / 100 }}
          transition={reduceMotion ? { duration: 0 } : spring}
          style={{ width: '100%' }}
        />
      </span>
      <span className={'flex w-[104px] shrink-0 items-center justify-end gap-1.5 text-caption ' + level.tone}>
        <span aria-hidden>{level.glyph}</span>
        {level.label}
      </span>
      <span className="w-9 shrink-0 text-right tabular text-caption text-ink-secondary">{Math.round(safeValue)}%</span>
    </div>
  );
}

type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  showValue?: boolean;
  color?: string;
  className?: string;
  barClassName?: string;
  labelClassName?: string;
};

export function ProgressBar({
  label,
  value,
  max = 100,
  showValue = true,
  color,
  className = '',
  barClassName = '',
  labelClassName = '',
}: ProgressBarProps) {
  const reduceMotion = useReducedMotion();
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const clamped = Math.min(safeMax, Math.max(0, safeValue));
  const percentage = (clamped / safeMax) * 100;

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`.trim()}>
      <div className={`flex items-center justify-between text-caption text-ink-secondary ${labelClassName}`.trim()}>
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
        <motion.div
          className={`h-full origin-left rounded-full bg-accent ${barClassName}`.trim()}
          initial={reduceMotion ? false : { scaleX: 0 }}
          animate={{ scaleX: percentage / 100 }}
          transition={reduceMotion ? { duration: 0 } : spring}
          style={{ width: '100%', backgroundColor: color }}
        />
      </div>
    </div>
  );
}
