import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { sheetVariants, tr } from "@/lib/motion";

export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !panel.current) return;
      const f = panel.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-sheet" role="presentation">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={tr.fast}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(var(--n-1000)/0.6)]"
          />
          <motion.div
            ref={panel}
            role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
            variants={sheetVariants} initial="initial" animate="animate" exit="exit"
            drag="y" dragElastic={0.06} dragConstraints={{ top: 0, bottom: 0 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 620) onClose(); }}
            className="safe-b absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface-overlay shadow-e3 outline-none"
          >
            <div className="sticky top-0 z-10 flex flex-col items-center gap-3 bg-surface-overlay/95 pb-3 pt-2.5 backdrop-blur">
              <span aria-hidden className="h-1 w-9 rounded-full bg-[rgb(var(--border-strong)/0.35)]" />
              <h2 className="t-card-title">{title}</h2>
            </div>
            <div className="px-4 pb-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
