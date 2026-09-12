import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, AlertTriangle, X } from "lucide-react";
import { spring, tr } from "@/lib/motion";

type ToastKind = "success" | "info" | "warning";
interface Toast { id: number; kind: ToastKind; message: string; action?: { label: string; onClick: () => void } }

const ICONS = { success: Check, info: Info, warning: AlertTriangle } as const;
const TINT = { success: "--ok-500", info: "--info-500", warning: "--warn-500" } as const;

const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const seq = useRef(0);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = ++seq.current;
    // Max 3 on screen; oldest drops. Never a stack of 9.
    setItems((prev) => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 4200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        aria-live="polite" aria-atomic="false"
        className="safe-b pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-2 p-4 lg:items-end lg:p-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)" }}
      >
        <AnimatePresence initial={false}>
          {items.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: spring.responsive }}
                exit={{ opacity: 0, y: 6, scale: 0.98, transition: tr.fast }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line glass p-3.5 shadow-e2"
              >
                <Icon
                  className="mt-px h-[17px] w-[17px] shrink-0 stroke-[2]"
                  style={{ color: `rgb(var(${TINT[t.kind]}))` }}
                  aria-hidden
                />
                <p className="min-w-0 flex-1 t-body-sm">{t.message}</p>
                {t.action && (
                  <button
                    onClick={t.action.onClick}
                    className="shrink-0 rounded-sm t-label text-accent-text transition-colors duration-fast hover:text-content"
                  >
                    {t.action.label}
                  </button>
                )}
                <button
                  onClick={() => setItems((p) => p.filter((i) => i.id !== t.id))}
                  aria-label="Dismiss"
                  className="-m-1 shrink-0 rounded-sm p-1 text-content-tertiary transition-colors duration-fast hover:text-content"
                >
                  <X className="h-3.5 w-3.5 stroke-[2]" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
