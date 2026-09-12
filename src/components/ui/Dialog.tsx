'use client';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { duration, ease } from '@/lib/motion';
import { usePrefersReducedMotion } from '@/lib/useMotionPreference';

export function Dialog({
  open,
  onClose,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  trigger,
}: {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  dismissible?: boolean;
  trigger?: React.ReactNode;
}) {
  const handleClose = React.useCallback(() => {
    if (onClose) onClose();
    else if (onOpenChange) onOpenChange(false);
  }, [onClose, onOpenChange]);

  const reduced = usePrefersReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const returnRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) { returnRef.current?.focus(); return; }
    returnRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) { handleClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // focus trap
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (first && last) {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    document.addEventListener('keydown', onKey);
    requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('button,input,a')?.focus());
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, handleClose, dismissible]);

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: duration.base, ease: ease.standard }}
            onClick={dismissible ? handleClose : undefined} className="fixed inset-0 z-[70] bg-scrim"
          />
          <motion.div
            ref={panelRef}
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ opacity: 0, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduced ? 1 : 0.99 }}
            transition={{ duration: reduced ? 0.01 : duration.medium, ease: ease.standard }}
            className="fixed left-1/2 top-1/2 z-[71] w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-edge bg-surface-3 p-6 shadow-3"
          >
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <h2 className="text-subsection">{title}</h2>
                {description && <p className="mt-1.5 text-body-sm text-ink-secondary">{description}</p>}
              </div>
              {dismissible && (
                <button
                  onClick={handleClose} aria-label="Close"
                  className="-mr-2 -mt-2 ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
                >
                  <X size={18} strokeWidth={1.75} />
                </button>
              )}
            </div>
            {children && <div className="mt-5">{children}</div>}
            {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </>
  );
}
