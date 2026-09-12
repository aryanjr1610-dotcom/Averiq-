// src/lib/density.ts — import this instead of inventing per-page spacing
export const DENSITY = {
  /** Home: hierarchy over volume. Max 6 sections, one hero. */
  dashboard: { mode: "default", maxSections: 6, cardPadding: "lg", gap: "block", measure: "content" },
  /** Learn: editorial. No card grids, no sidebars on mobile. */
  learn: { mode: "editorial", maxSections: Infinity, cardPadding: "none", gap: "section", measure: "reading" },
  /** Revision: denser than Learn. Rows, not cards. */
  revision: { mode: "compact", maxSections: 4, cardPadding: "sm", gap: "block", measure: "content" },
  /** Practice: one question, nothing else competing. */
  practice: { mode: "default", maxSections: 2, cardPadding: "md", gap: "block", measure: "prose" },
  /** Formula library: reference table density. */
  formulas: { mode: "compact", maxSections: 3, cardPadding: "sm", gap: "block", measure: "reading" },
  /** Competitive: performance-oriented, decoration stripped. */
  competitive: { mode: "compact", maxSections: 4, cardPadding: "sm", gap: "block", measure: "content" },
  /** Admin CMS: information efficiency wins over air. */
  admin: { mode: "compact", maxSections: Infinity, cardPadding: "sm", gap: "block", measure: "content" },
} as const;
