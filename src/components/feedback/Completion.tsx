import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { duration, ease, spring } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/useMotionPreference";

/**
 * Tiered celebration:
 *  - lesson    → checkmark draw only
 *  - chapter   → checkmark + single glow pulse
 *  - milestone → the above + 8 particles (max, once)
 */
export function Completion({
  open, tier, label,
}: { open: boolean; tier: "lesson" | "chapter" | "milestone"; label: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1, transition: spring.responsive }}
          exit={{ opacity: 0, scale: 0.98, transition: { duration: duration.fast } }}
          role="status"
          className="relative mx-auto flex max-w-xs flex-col items-center gap-4 py-10 text-center"
        >
          <span className="relative grid h-16 w-16 place-items-center">
            {tier !== "lesson" && !reduced && (
              <motion.span
                aria-hidden
                initial={{ scale: 0.6, opacity: 0.55 }}
                animate={{ scale: 1.9, opacity: 0 }}
                transition={{ duration: 1.1, ease: ease.out }}
                className="absolute inset-0 rounded-full bg-ok/45"
              />
            )}
            <span className="grid h-16 w-16 place-items-center rounded-full border border-ok/35 bg-ok/12">
              {reduced ? (
                <Check className="h-7 w-7 stroke-[2.25] text-ok" aria-hidden />
              ) : (
                <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
                  <motion.path
                    d="M4.5 12.5l5 5 10-11"
                    fill="none" stroke="rgb(var(--ok-500))" strokeWidth="2.25"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.42, ease: ease.out, delay: 0.06 }}
                  />
                </svg>
              )}
            </span>

            {tier === "milestone" && !reduced &&
              Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return (
                  <motion.span
                    key={i} aria-hidden
                    className="absolute h-1 w-1 rounded-full bg-ok"
                    initial={{ x: 0, y: 0, opacity: 0.9 }}
                    animate={{ x: Math.cos(a) * 46, y: Math.sin(a) * 46, opacity: 0 }}
                    transition={{ duration: 0.72, ease: ease.out, delay: 0.14 }}
                  />
                );
              })}
          </span>

          <p className="t-section">{label}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
