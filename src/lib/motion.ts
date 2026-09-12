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
  standard: [0.25, 0.1, 0.25, 1],
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
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
  initial: { opacity: 0, transform: "translateY(8px)" },
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: duration.standard, ease: ease.out } },
  exit:    { opacity: 0, transform: "translateY(-4px)", transition: { duration: duration.fast, ease: ease.standard } },
};

/* ---- Section stagger: hero first, then sections. Total < 420ms. ---- */
export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.045, delayChildren: 0.02 } },
};
export const staggerChild: Variants = {
  initial: { opacity: 0, transform: "translateY(10px)" },
  animate: { opacity: 1, transform: "translateY(0px)", transition: { duration: duration.standard, ease: ease.out } },
};

/* ---- Mobile sheet ---- */
export const sheetVariants: Variants = {
  initial: { transform: "translateY(100%)" },
  animate: { transform: "translateY(0%)", transition: spring.sheet },
  exit:    { transform: "translateY(100%)", transition: { duration: duration.standard, ease: ease.standard } },
};

/* Reduced-motion overrides applied at runtime */
export const reducedRoute: Variants = {
  initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: 0.12 } }, exit: { opacity: 0 },
};
