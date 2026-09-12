'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { duration, ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';
import { useLowPower } from '@/components/system/AppShell';

/** One event, ≤700ms, max 10 particles, never in Focus mode. */
export function Celebration({
  show,
  label,
  onDone,
  suppress = false,
}: {
  show: boolean;
  label: string;
  onDone: () => void;
  suppress?: boolean;
}) {
  const reduced = usePrefersReducedMotion(useLowPower());
  const active = show && !suppress;

  React.useEffect(() => {
    if (!active) return;
    const t = setTimeout(onDone, reduced ? 1200 : 1600);
    return () => clearTimeout(t);
  }, [active, reduced, onDone]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.medium, ease: ease.out }}
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] mx-auto flex w-fit items-center gap-3 rounded-xl border border-accent-border bg-surface-3/95 px-5 py-3 shadow-3 backdrop-blur-xl md:bottom-10"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            {!reduced && (
              <motion.span
                className="absolute inset-0 rounded-full bg-accent-quiet"
                initial={{ scale: 0.6, opacity: 0.9 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.7, ease: ease.out }}
              />
            )}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="var(--accent)"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: reduced ? 0 : 0.28, ease: ease.out }}
              />
            </svg>
          </span>
          <p className="text-body font-[550]">{label}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
