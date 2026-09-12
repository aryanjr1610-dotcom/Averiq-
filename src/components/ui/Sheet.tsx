'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring, duration, ease } from '@/lib/motion';

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  side?: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.standard }}
            onClick={onClose}
            className="fixed inset-0 bg-scrim"
            style={{ zIndex: 60 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.sheet}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="fixed inset-x-0 bottom-0 rounded-t-2xl border-t border-edge bg-surface-3"
            style={{
              zIndex: 61,
              maxHeight: '88dvh',
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            <div className="flex justify-center py-3">
              <span className="h-1 w-9 rounded-full bg-edge-strong" />
            </div>
            <div className="px-5 pb-3">
              <h2 className="t-subsection">{title}</h2>
              {description && <p className="mt-1 text-body-sm text-ink-secondary">{description}</p>}
            </div>
            <div className="overflow-y-auto px-5" style={{ maxHeight: '70dvh' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
