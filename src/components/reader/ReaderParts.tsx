'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { duration, ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

const LABELS = { definition: 'Definition', insight: 'Insight', warning: 'Careful', exam: 'Exam tip' } as const;

export function Callout({
  kind = 'definition',
  children,
}: {
  kind?: keyof typeof LABELS;
  children: React.ReactNode;
}) {
  return (
    <aside className="averiq-callout" data-kind={kind}>
      <span className="callout-label">{LABELS[kind]}</span>
      {children}
    </aside>
  );
}

export function MarginNote({ children }: { children: React.ReactNode }) {
  return <aside className="averiq-margin-note">{children}</aside>;
}

/** Derivation: grid-rows trick — animates without layout thrash (emil-design-eng). */
export function Derivation({ title = 'Show derivation', children }: { title?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const reduced = usePrefersReducedMotion();
  const id = React.useId();

  return (
    <div className="mx-auto my-6 max-w-reading rounded-md border border-edge-subtle bg-surface-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-sans text-body-sm font-[550] text-ink transition-colors duration-fast hover:bg-surface-2"
      >
        {title}
        <ChevronDown
          size={16}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0 text-ink-secondary transition-transform duration-base ease-standard"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <div
        id={id}
        hidden={!open}
        className="grid overflow-hidden border-t border-edge-subtle px-4 transition-[grid-template-rows] duration-medium ease-standard"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transitionDuration: reduced ? '1ms' : undefined }}
      >
        <div className="min-h-0 py-4">{children}</div>
      </div>
    </div>
  );
}

/** Sticky slim progress + outline. No floating action clutter. */
export function ReaderChrome({
  chapterTitle,
  sections,
  activeId,
}: {
  chapterTitle: string;
  sections: Array<{ id: string; title: string }>;
  activeId?: string;
}) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div className="sticky top-0 z-[30] border-b border-edge-subtle bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-content items-center gap-3 px-5">
          <p className="truncate font-sans text-body-sm text-ink-secondary">{chapterTitle}</p>
          <span className="ml-auto shrink-0 font-sans text-caption tabular">{Math.round(progress)}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
          className="h-[2px] w-full bg-transparent"
        >
          <div
            className="h-full origin-left bg-accent"
            style={{ transform: `scaleX(${progress / 100})`, width: '100%' }}
          />
        </div>
      </div>

      {/* outline rail, laptop and up only */}
      <nav
        aria-label="Chapter outline"
        className="fixed right-6 top-1/2 hidden w-[180px] -translate-y-1/2 laptop:block"
      >
        <ul className="space-y-1.5 border-l border-edge-subtle pl-3">
          {sections.map((s) => {
            const active = s.id === activeId;
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={active ? 'true' : undefined}
                  className={
                    'block truncate font-sans text-caption transition-colors duration-fast ' +
                    (active ? 'text-ink font-[550]' : 'text-ink-tertiary hover:text-ink-secondary')
                  }
                >
                  {s.title}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** Concept check — inline, calm, colour-blind safe. */
export function ConceptCheck({ question, options, answerIndex }: { question: string; options: string[]; answerIndex: number }) {
  const [picked, setPicked] = React.useState<number | null>(null);
  const reduced = usePrefersReducedMotion();

  return (
    <div className="mx-auto my-8 max-w-reading rounded-lg border border-edge-subtle bg-surface-1 p-5 font-sans">
      <p className="text-label mb-2 text-ink-secondary">Concept check</p>
      <p className="text-body mb-4">{question}</p>
      <div className="space-y-2">
        {options.map((opt, i) => {
          const chosen = picked === i;
          const correct = picked !== null && i === answerIndex;
          return (
            <button
              key={i}
              onClick={() => setPicked(i)}
              disabled={picked !== null}
              className={
                'flex min-h-[44px] w-full items-center gap-2.5 rounded-md border px-3 text-left text-body-sm transition-colors duration-base ' +
                (correct
                  ? 'border-success bg-success-quiet'
                  : chosen
                    ? 'border-danger bg-danger-quiet'
                    : 'border-edge hover:bg-surface-2')
              }
            >
              {correct && <Check size={15} strokeWidth={2.25} aria-hidden className="shrink-0 text-success" />}
              <span>{opt}</span>
              {correct && <span className="sr-only">Correct</span>}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {picked !== null && (
          <motion.p
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: duration.base, ease: ease.out }}
            aria-live="polite"
            className="mt-3 text-body-sm text-ink-secondary"
          >
            {picked === answerIndex ? 'Correct — that follows from the definition above.' : 'Not quite. Re-read the section above and try again.'}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
