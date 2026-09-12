import type { Config } from 'tailwindcss';

/** tailwind.config.ts → presets: [averiqPreset] */
export const averiqPreset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        sunken: 'var(--bg-sunken)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          reading: 'var(--surface-reading)',
          immersive: 'var(--surface-immersive)',
        },
        edge: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          press: 'var(--accent-press)',
          quiet: 'var(--accent-quiet)',
          border: 'var(--accent-border)',
          on: 'var(--on-accent)',
        },
        success: { DEFAULT: 'var(--success)', quiet: 'var(--success-quiet)' },
        warning: { DEFAULT: 'var(--warning)', quiet: 'var(--warning-quiet)' },
        danger: { DEFAULT: 'var(--danger)', quiet: 'var(--danger-quiet)' },
        ring: 'var(--focus-ring)',
        scrim: 'var(--overlay-scrim)',
      },
      spacing: {
        1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)',
        4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)',
        8: 'var(--space-8)', 10: 'var(--space-10)', 12: 'var(--space-12)',
        16: 'var(--space-16)', 20: 'var(--space-20)', 24: 'var(--space-24)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)',
        lg: 'var(--radius-lg)', xl: 'var(--radius-xl)', '2xl': 'var(--radius-2xl)',
      },
      maxWidth: {
        reading: 'var(--measure-reading)',
        prose: 'var(--measure-prose)',
        content: 'var(--width-content)',
        wide: 'var(--width-wide)',
      },
      boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)', 3: 'var(--shadow-3)' },
      fontFamily: {
        sans: ['var(--font-ui)'],
        reading: ['var(--font-reading)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'display-xl': ['var(--t-display-xl)', { lineHeight: '1.05', fontWeight: '600', letterSpacing: '-0.022em' }],
        display: ['var(--t-display)', { lineHeight: '1.1', fontWeight: '600', letterSpacing: '-0.02em' }],
        'page-title': ['var(--t-page-title)', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.015em' }],
        section: ['var(--t-section)', { lineHeight: '1.3', fontWeight: '600' }],
        subsection: ['var(--t-subsection)', { lineHeight: '1.4', fontWeight: '600' }],
        'card-title': ['var(--t-card-title)', { lineHeight: '1.4', fontWeight: '550' }],
        'body-lg': ['var(--t-body-lg)', { lineHeight: '1.65' }],
        body: ['var(--t-body)', { lineHeight: '1.6' }],
        'body-sm': ['var(--t-body-sm)', { lineHeight: '1.55' }],
        label: ['var(--t-label)', { lineHeight: '1.3', fontWeight: '550', letterSpacing: '0.02em' }],
        caption: ['var(--t-caption)', { lineHeight: '1.4' }],
        metric: ['var(--t-metric)', { lineHeight: '1.05', fontWeight: '600' }],
        reading: ['var(--t-reading)', { lineHeight: '1.75' }],
      },
      transitionDuration: {
        instant: '80ms', fast: '140ms', base: '200ms', medium: '280ms', slow: '400ms',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        'ease-out-soft': 'var(--ease-out)',
        'ease-in-soft': 'var(--ease-in)',
      },
      screens: { tablet: '768px', laptop: '1024px', desktop: '1280px', wide: '1440px' },
    },
  },
};
export default averiqPreset;
