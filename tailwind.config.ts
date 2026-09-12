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
          raised: rgb("--surface-raised"),
          interactive: rgb("--surface-interactive"),
          reading: rgb("--surface-reading"),
          immersive: rgb("--surface-immersive"),
          overlay: rgb("--surface-overlay"),
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
        },
        subject: rgb("--subject-accent"),
        ok: rgb("--ok-500"),
        warn: rgb("--warn-500"),
        bad: rgb("--bad-500"),
        info: rgb("--info-500"),
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
        standard: "var(--dur-standard)", slow: "var(--dur-slow)",
      },
      screens: { xs: "375px", sm: "430px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1440px", "3xl": "1600px" },
      zIndex: { nav: "30", sheet: "40", modal: "50", toast: "60" },
    },
  },
  plugins: [],
} satisfies Config;
