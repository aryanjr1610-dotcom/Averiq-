import type { Transition, Variants } from "framer-motion";

export const duration = {
  instant: 0.09,
  fast: 0.14,
  standard: 0.22,
  slow: 0.36,
  base: 0.14,
  medium: 0.22,
} as const;

export const distance = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  enter: 8,
  rise: 4,
} as const;

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  soft:       { type: "spring", stiffness: 220, damping: 30, mass: 0.9 },
  responsive: { type: "spring", stiffness: 420, damping: 34, mass: 0.7 },
  sheet:      { type: "spring", stiffness: 340, damping: 36, mass: 0.9 },
} satisfies Record<string, Transition>;

export const tr = {
  fast:     { duration: duration.fast, ease: ease.standard },
  standard: { duration: duration.standard, ease: ease.out },
  slow:     { duration: duration.slow, ease: ease.out },
} satisfies Record<string, Transition>;

/* ---- Route transition: opacity + 8px rise. Nothing else. ---- */
export const routeVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.standard, ease: ease.out } },
  exit:    { opacity: 0, y: -4, transition: { duration: duration.fast, ease: ease.standard } },
};

/* ---- Section stagger: hero first, then sections. Total < 420ms. ---- */
export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};
export const staggerChild: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.standard, ease: ease.out } },
};

/* ---- Mobile sheet ---- */
export const sheetVariants: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: spring.sheet },
  exit:    { y: "100%", transition: { duration: duration.standard, ease: ease.standard } },
};

/* Reduced-motion overrides applied at runtime */
export const reducedRoute: Variants = {
  initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.12 } }, exit: { opacity: 0 },
};
