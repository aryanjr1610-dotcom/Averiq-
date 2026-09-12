import { cn } from '@/utils/cn';

export function Brand({
  variant = 'lockup',
  className,
}: {
  variant?: 'mark' | 'wordmark' | 'lockup';
  className?: string;
}) {
  return (
    <span
      className={cn('brand-lockup', className)}
      aria-label={variant === 'mark' ? 'Averiq' : undefined}
      role={variant === 'mark' ? 'img' : undefined}
    >
      {variant !== 'wordmark' && (
        <svg
          className="brand-lockup__mark"
          viewBox="0 0 32 32"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 26 16 6l10 20M10 19h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M11.5 26h9"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity=".55"
          />
        </svg>
      )}

      {variant !== 'mark' && (
        <span className="brand-lockup__word">
          Averiq
        </span>
      )}
    </span>
  );
}
