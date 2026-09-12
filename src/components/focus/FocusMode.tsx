'use client';
import { X, Pause, Play } from 'lucide-react';

export function FocusMode({
  taskLabel,
  seconds,
  running,
  onToggle,
  onExit,
}: {
  taskLabel?: string;
  seconds: number;
  running: boolean;
  onToggle: () => void;
  onExit: () => void;
}) {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    // atmosphere disabled here via data-surface; nothing decorative survives
    <div data-surface="immersive" className="flex h-dvh flex-col items-center justify-center bg-surface-immersive px-6">
      <button
        onClick={onExit}
        aria-label="Exit focus"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-ink-tertiary transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
        style={{ top: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <X size={18} strokeWidth={1.75} />
      </button>

      {taskLabel && <p className="mb-6 max-w-[36ch] text-center text-body text-ink-secondary">{taskLabel}</p>}

      <p
        className="tabular text-ink"
        style={{ fontSize: 'clamp(56px, 16vw, 112px)', lineHeight: 1, fontWeight: 500, letterSpacing: '-0.03em' }}
        aria-live="off"
      >
        {mm}:{ss}
      </p>

      <button
        onClick={onToggle}
        className="mt-10 flex h-12 items-center gap-2.5 rounded-md border border-edge px-6 text-body text-ink transition-colors duration-fast hover:bg-surface-2 active:scale-[.98]"
      >
        {running ? <Pause size={18} strokeWidth={1.75} aria-hidden /> : <Play size={18} strokeWidth={1.75} aria-hidden />}
        {running ? 'Pause' : 'Start'}
      </button>
    </div>
  );
}
