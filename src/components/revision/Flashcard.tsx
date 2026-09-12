'use client';
import * as React from 'react';
import { motion } from 'framer-motion';
import { duration, ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

export function Flashcard({ front, back, onRate }: { front: React.ReactNode; back: React.ReactNode; onRate: (r: 'again' | 'good' | 'easy') => void }) {
  const [flipped, setFlipped] = React.useState(false);
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setFlipped((v) => !v); }
      if (flipped && ['1', '2', '3'].includes(e.key)) {
        onRate(e.key === '1' ? 'again' : e.key === '2' ? 'good' : 'easy');
        setFlipped(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, onRate]);

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <button
        onClick={() => setFlipped((v) => !v)}
        aria-expanded={flipped}
        className="relative w-full"
        style={{ perspective: 1200 }}
      >
        <motion.div
          animate={{ rotateY: reduced ? 0 : flipped ? 180 : 0 }}
          transition={{ duration: reduced ? 0.01 : duration.medium, ease: ease.inOut }}
          style={{ transformStyle: 'preserve-3d' }}
          className="relative min-h-[240px] w-full"
        >
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-edge-subtle bg-surface-1 p-8 text-center text-body-lg text-ink"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {front}
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center rounded-xl border border-edge bg-surface-2 p-8 text-center text-body text-ink"
            style={{ backfaceVisibility: 'hidden', transform: reduced ? undefined : 'rotateY(180deg)', opacity: reduced && !flipped ? 0 : 1 }}
          >
            {back}
          </div>
        </motion.div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2" aria-live="polite">
        {(['again', 'good', 'easy'] as const).map((r, i) => (
          <button
            key={r}
            onClick={() => { onRate(r); setFlipped(false); }}
            disabled={!flipped}
            className="min-h-[44px] rounded-md border border-edge bg-surface-1 text-body-sm capitalize transition-colors duration-fast hover:bg-surface-2 active:scale-[.98] disabled:opacity-45 text-ink"
          >
            {r} <span className="text-ink-tertiary">{i + 1}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-caption text-ink-secondary">Space to flip · 1–3 to rate</p>
    </div>
  );
}
