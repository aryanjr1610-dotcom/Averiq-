'use client';
import { Check } from 'lucide-react';

export function PlannerDay({
  date, tasks, onToggle,
}: {
  date: string;
  tasks: Array<{ id: string; title: string; subject?: string; minutes?: number; done: boolean }>;
  onToggle: (id: string) => void;
}) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="mb-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-section text-ink">{date}</h2>
        <span className="tabular text-caption text-ink-secondary">{done}/{tasks.length} done</span>
      </div>
      <ul className="overflow-hidden rounded-lg border border-edge-subtle bg-surface-1">
        {tasks.map((t, i) => (
          <li key={t.id} className={i > 0 ? 'border-t border-edge-subtle' : ''}>
            <button
              onClick={() => onToggle(t.id)}
              aria-pressed={t.done}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-surface-2"
            >
              <span
                aria-hidden
                className={
                  'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-xs border transition-colors duration-fast ' +
                  (t.done ? 'border-transparent bg-accent text-accent-on' : 'border-edge-strong')
                }
              >
                {t.done && <Check size={12} strokeWidth={2.5} />}
              </span>
              <span className={'min-w-0 flex-1 text-body ' + (t.done ? 'text-ink-tertiary line-through' : 'text-ink')}>{t.title}</span>
              {t.subject && <span className="shrink-0 text-caption text-ink-tertiary">{t.subject}</span>}
              {t.minutes && <span className="w-12 shrink-0 text-right tabular text-caption text-ink-secondary">{t.minutes}m</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
