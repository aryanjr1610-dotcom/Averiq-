import type { Config } from "tailwindcss";

const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: rgb("--canvas"),
        surface: {
          DEFAULT: rgb("--surface-base"),
          0: rgb("--canvas"),
          1: rgb("--surface-base"),
          2: rgb("--surface-raised"),
          3: rgb("--surface-interactive"),
          raised: rgb("--surface-raised"),
          interactive: rgb("--surface-interactive"),
          reading: rgb("--surface-reading"),
          immersive: rgb("--surface-immersive"),
          overlay: rgb("--surface-overlay"),
        },
        edge: {
          subtle: "rgb(var(--border-subtle) / var(--border-subtle-a))",
          DEFAULT: "rgb(var(--border-default) / var(--border-default-a))",
          strong: "rgb(var(--border-strong) / var(--border-strong-a))",
        },
        ink: {
          DEFAULT: rgb("--text-primary"),
          secondary: rgb("--text-secondary"),
          tertiary: rgb("--text-tertiary"),
          inverse: rgb("--text-onaccent"),
        },
        content: {
          DEFAULT: rgb("--text-primary"),
          secondary: rgb("--text-secondary"),
          tertiary: rgb("--text-tertiary"),
          onaccent: rgb("--text-onaccent"),
        },
        line: {
          subtle: "rgb(var(--border-subtle) / var(--border-subtle-a))",
          DEFAULT: "rgb(var(--border-default) / var(--border-default-a))",
          strong: "rgb(var(--border-strong) / var(--border-strong-a))",
        },
        accent: {
          DEFAULT: rgb("--accent"),
          hover: rgb("--accent-hover"),
          text: rgb("--accent-text"),
          press: rgb("--accent-hover"),
          quiet: "rgb(var(--accent) / 0.12)",
          border: "rgb(var(--accent) / 0.34)",
          on: rgb("--text-onaccent"),
        },
        subject: rgb("--subject-accent"),
        ok: rgb("--ok-500"),
        warn: rgb("--warn-500"),
        bad: rgb("--bad-500"),
        info: rgb("--info-500"),
        success: { DEFAULT: rgb("--ok-500"), quiet: "rgb(var(--ok-500) / 0.14)" },
        warning: { DEFAULT: rgb("--warn-500"), quiet: "rgb(var(--warn-500) / 0.14)" },
        danger: { DEFAULT: rgb("--bad-500"), quiet: "rgb(var(--bad-500) / 0.14)" },
        scrim: "rgb(var(--n-1000) / 0.72)",
      },
      borderRadius: {
        xs: "var(--radius-xs)", sm: "var(--radius-sm)", md: "var(--radius-md)",
        lg: "var(--radius-lg)", xl: "var(--radius-xl)", "2xl": "var(--radius-2xl)",
      },
      boxShadow: { e1: "var(--shadow-1)", e2: "var(--shadow-2)", e3: "var(--shadow-3)" },
      spacing: {
        "page-x": "var(--rhythm-page-x)",
        section: "var(--rhythm-section)",
        block: "var(--rhythm-block)",
      },
      fontSize: {
        "display-xl": ["var(--font-display-xl)", { lineHeight: "1.02", letterSpacing: "-0.035em", fontWeight: "560" }],
        display: ["var(--font-display)", { lineHeight: "1.06", letterSpacing: "-0.03em", fontWeight: "560" }],
        hero: ["var(--font-hero)", { lineHeight: "1.12", letterSpacing: "-0.024em", fontWeight: "560" }],
        "page-title": ["var(--font-title)", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "560" }],
        section: ["var(--font-section)", { lineHeight: "1.3", letterSpacing: "-0.014em", fontWeight: "550" }],
        subsection: ["var(--font-subsection)", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "550" }],
        "card-title": ["var(--font-card)", { lineHeight: "1.4", fontWeight: "550" }],
        "body-lg": ["var(--font-body-lg)", { lineHeight: "1.65" }],
        body: ["var(--font-body)", { lineHeight: "1.6" }],
        "body-sm": ["var(--font-body-sm)", { lineHeight: "1.55" }],
        label: ["var(--font-label)", { lineHeight: "1.3", fontWeight: "500" }],
        caption: ["var(--font-caption)", { lineHeight: "1.4" }],
        metric: ["var(--font-metric)", { lineHeight: "1.05", fontWeight: "540" }],
        reading: ["var(--font-reading)", { lineHeight: "1.78" }],
      },
      maxWidth: {
        app: "var(--width-app)",
        content: "var(--width-content)",
        reading: "var(--measure-reading)",
        prose: "var(--measure-prose)",
      },
      fontFamily: {
        sans: "var(--font-sans)", serif: "var(--font-serif)", mono: "var(--font-mono)",
      },
      transitionTimingFunction: {
        standard: "var(--ease-standard)", out: "var(--ease-out)", "in-out": "var(--ease-in-out)",
      },
      transitionDuration: {
        instant: "var(--dur-instant)", fast: "var(--dur-fast)",
        base: "var(--dur-standard)", standard: "var(--dur-standard)",
        medium: "280ms", slow: "var(--dur-slow)",
      },
      screens: { xs: "375px", sm: "430px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1440px", "3xl": "1600px" },
      zIndex: { nav: "30", sheet: "40", modal: "50", toast: "60" },
    },
  },
  plugins: [],
} satisfies Config;
