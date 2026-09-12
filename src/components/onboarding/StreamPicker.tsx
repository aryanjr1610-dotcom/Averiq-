'use client';
import { Check } from 'lucide-react';
import type { Stream } from '@/components/system/Atmosphere';

const STREAMS: Array<{ id: Stream; label: string; blurb: string }> = [
  { id: 'pcm', label: 'PCM', blurb: 'Physics · Chemistry · Maths' },
  { id: 'pcb', label: 'PCB', blurb: 'Physics · Chemistry · Biology' },
  { id: 'pcmb', label: 'PCMB', blurb: 'All four sciences' },
  { id: 'commerce', label: 'Commerce', blurb: 'Accounts · Business · Economics' },
  { id: 'humanities', label: 'Humanities', blurb: 'History · Geography · Political Science' },
  { id: 'foundation', label: 'Classes 6–10', blurb: 'Foundation across subjects' },
];

/**
 * Selection updates the atmosphere live via the parent's data-stream.
 * No reload, no remount — the CSS variable transition does the work.
 */
export function StreamPicker({ value, onChange }: { value?: Stream; onChange: (s: Stream) => void }) {
  return (
    <fieldset className="mx-auto w-full max-w-[560px]">
      <legend className="text-page-title text-ink">Which stream are you studying?</legend>
      <p className="mt-2 text-body-sm text-ink-secondary">You can change this any time in Settings.</p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {STREAMS.map((s) => {
          const selected = value === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(s.id)}
              className={
                'flex min-h-[68px] items-center gap-3 rounded-lg border p-4 text-left transition-[background-color,border-color,transform] duration-base ease-standard active:scale-[.995] ' +
                (selected
                  ? 'border-accent-border bg-accent-quiet'
                  : 'border-edge bg-surface-1 hover:border-edge-strong hover:bg-surface-2')
              }
            >
              <span className="min-w-0 flex-1">
                <span className="block text-card-title text-ink">{s.label}</span>
                <span className="mt-0.5 block text-caption text-ink-secondary">{s.blurb}</span>
              </span>
              {selected && <Check size={17} strokeWidth={2} className="shrink-0 text-accent" aria-hidden />}
              {selected && <span className="sr-only">Selected</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
