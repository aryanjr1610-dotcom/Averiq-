'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, SlidersHorizontal } from 'lucide-react';
import { duration, ease, spring } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

/**
 * Chrome recedes, canvas dominates, controls become contextual.
 * apple-design: the content is the interface.
 */
export function ImmersiveShell({
  title,
  onExit,
  canvas,
  controls,
  explanation,
}: {
  title: string;
  onExit: () => void;
  canvas: React.ReactNode;
  controls?: React.ReactNode;
  explanation?: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const [panel, setPanel] = React.useState<'none' | 'controls' | 'info'>('none');
  const [idle, setIdle] = React.useState(false);

  // chrome fades while the user is exploring, returns on any input
  React.useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const wake = () => {
      setIdle(false);
      clearTimeout(t);
      t = setTimeout(() => setIdle(true), 2600);
    };
    wake();
    const events = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    return () => {
      clearTimeout(t);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (panel === 'none') {
          onExit();
        } else {
          setPanel('none');
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [panel, onExit]);

  return (
    <div data-surface="immersive" className="relative h-dvh w-full overflow-hidden bg-surface-immersive">
      <div className="absolute inset-0">{canvas}</div>

      <motion.header
        animate={{ opacity: idle && !reduced ? 0.35 : 1 }}
        transition={{ duration: duration.slow, ease: ease.standard }}
        className="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-3 p-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}
      >
        <button
          onClick={onExit}
          aria-label="Exit"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-md border border-edge-subtle bg-canvas/70 text-ink-secondary backdrop-blur-xl transition-colors duration-fast hover:text-ink active:scale-[.96]"
        >
          <X size={18} strokeWidth={1.75} />
        </button>
        <h1 className="pointer-events-none text-card-title text-ink">{title}</h1>
      </motion.header>

      {/* contextual bar, not a dashboard toolbar */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-center gap-2 p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
      >
        {controls && (
          <button
            onClick={() => setPanel((p) => (p === 'controls' ? 'none' : 'controls'))}
            aria-expanded={panel === 'controls'}
            className="flex h-11 items-center gap-2 rounded-md border border-edge-subtle bg-canvas/75 px-4 text-body-sm text-ink backdrop-blur-xl transition-colors duration-fast hover:bg-surface-2 active:scale-[.98]"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} aria-hidden /> Controls
          </button>
        )}
        {explanation && (
          <button
            onClick={() => setPanel((p) => (p === 'info' ? 'none' : 'info'))}
            aria-expanded={panel === 'info'}
            className="flex h-11 items-center gap-2 rounded-md border border-edge-subtle bg-canvas/75 px-4 text-body-sm text-ink backdrop-blur-xl transition-colors duration-fast hover:bg-surface-2 active:scale-[.98]"
          >
            <Info size={16} strokeWidth={1.75} aria-hidden /> Explanation
          </button>
        )}
      </div>

      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div
            key={panel}
            initial={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={reduced ? { duration: 0.01 } : spring.soft}
            className="absolute bottom-[88px] left-1/2 max-h-[46dvh] w-[min(560px,92vw)] -translate-x-1/2 overflow-y-auto rounded-xl border border-edge bg-surface-3/95 p-5 shadow-3 backdrop-blur-xl"
          >
            {panel === 'controls' ? controls : explanation}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
