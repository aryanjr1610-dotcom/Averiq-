'use client';
import * as React from 'react';
import { motion } from 'framer-motion';
import { duration, ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

/** ≤900ms, and skipped entirely for returning sessions. */
export function Splash({
  onDone,
  onComplete,
}: {
  onDone?: () => void;
  onComplete?: () => void;
}) {
  const reduced = usePrefersReducedMotion();

  React.useEffect(() => {
    const finish = onDone || onComplete || (() => {});
    const returning = sessionStorage.getItem('averiq:seen-splash') === 'true';
    const ms = returning || reduced ? 0 : 900;
    const t = setTimeout(() => { sessionStorage.setItem('averiq:seen-splash', 'true'); finish(); }, ms);
    return () => clearTimeout(t);
  }, [onDone, onComplete, reduced]);

  return (
    <div className="flex h-dvh items-center justify-center bg-canvas">
      <motion.div
        initial={{ opacity: 0, y: reduced ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: duration.slow, ease: ease.out }}
        className="relative flex flex-col items-center"
      >
        {!reduced && (
          <motion.span
            aria-hidden
            className="absolute -inset-16 rounded-full"
            style={{ background: 'radial-gradient(circle, var(--accent-quiet) 0%, transparent 65%)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0.35], scale: 1 }}
            transition={{ duration: 0.9, ease: ease.out }}
          />
        )}
        <p className="relative text-display tracking-[-0.03em] text-ink">Averiq</p>
        <p className="relative mt-2 text-caption text-ink-secondary">Learn deeply.</p>
      </motion.div>
    </div>
  );
}

export function BrandLoading({ message = 'Preparing Averiq' }: { message?: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-canvas" role="status">
      <p className="text-display tracking-[-0.03em] text-ink">Averiq</p>
      <p className="text-caption text-ink-secondary">{message}</p>
    </div>
  );
}
