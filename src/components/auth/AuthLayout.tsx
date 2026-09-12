export function AuthLayout({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh laptop:grid-cols-[minmax(0,460px)_1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <p className="text-card-title tracking-[-0.02em] text-ink">Averiq</p>
        <h1 className="mt-10 text-display text-ink">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[42ch] text-body text-ink-secondary">{subtitle}</p>}
        <div className="mt-8 flex flex-col gap-4">{children}</div>
        {footer && <div className="mt-8 text-body-sm text-ink-secondary">{footer}</div>}
      </div>

      {/* atmosphere lives behind, nothing floats on top of it */}
      <div className="relative hidden laptop:block">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(70% 90% at 70% 20%, hsl(210 45% 50% / .10) 0%, transparent 62%), var(--motif-field)',
            backgroundSize: 'auto, 220px 220px',
            maskImage: 'radial-gradient(90% 90% at 60% 40%, #000 20%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(90% 90% at 60% 40%, #000 20%, transparent 100%)',
          }}
        />
      </div>
    </div>
  );
}
