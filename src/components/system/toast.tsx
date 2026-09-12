'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { duration, ease } from '@/lib/motion';

type Toast = { id: number; message: string; tone?: 'neutral' | 'success' | 'danger' };
const Ctx = React.createContext<(t: Omit<Toast, 'id'> | string, kind?: string) => void>(() => {});
export const useToast = () => {
  const notify = React.useContext(Ctx);
  return React.useMemo(() => ({
    notify: (message: string, kind?: string) => notify(message, kind),
  }), [notify]);
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Toast[]>([]);

  const push = React.useCallback((t: Omit<Toast, 'id'> | string, kind?: string) => {
    const id = Date.now() + Math.random();
    const payload: Toast = typeof t === 'string'
      ? { id, message: t, tone: kind === 'error' ? 'danger' : kind === 'success' ? 'success' : 'neutral' }
      : { ...t, id };

    setItems((prev) => [...prev, payload].slice(-3)); // never stack more than 3
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: duration.base, ease: ease.standard }}
              className={
                'pointer-events-auto rounded-md border px-4 py-2.5 text-body-sm shadow-2 backdrop-blur-xl ' +
                (t.tone === 'success'
                  ? 'border-success/40 bg-success-quiet text-ink'
                  : t.tone === 'danger'
                    ? 'border-danger/40 bg-danger-quiet text-ink'
                    : 'border-edge bg-surface-3/95 text-ink')
              }
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
