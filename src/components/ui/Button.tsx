import * as React from "react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "subject" | "danger" | "outline" | "quiet";
type Size = "sm" | "md" | "lg" | "icon";

const base = [
  "relative inline-flex items-center justify-center gap-2 select-none",
  "font-sans font-medium whitespace-nowrap",
  "rounded-md border",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-standard",
  "active:scale-[0.98] motion-reduce:active:scale-100",
  "disabled:pointer-events-none disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--focus-ring))]",
].join(" ");

const variants: Record<Variant, string> = {
  // High contrast, zero gradient.
  primary:
    "bg-content text-canvas border-transparent shadow-e1 hover:bg-content/90 hover:shadow-e2 active:shadow-e1",
  secondary:
    "bg-surface-interactive text-content border-line hover:bg-surface-raised hover:border-line-strong",
  ghost:
    "bg-transparent text-content-secondary border-transparent hover:bg-surface-interactive hover:text-content",
  subject:
    "bg-subject/14 text-content border-subject/28 hover:bg-subject/20 hover:border-subject/40",
  danger:
    "bg-bad/14 text-bad border-bad/30 hover:bg-bad/22 hover:border-bad/45",
  outline:
    "bg-transparent text-content border-line hover:bg-surface-interactive hover:border-line-strong",
  quiet:
    "bg-transparent text-content-secondary border-transparent hover:bg-surface-interactive hover:text-content",
};

const sizes: Record<Size, string> = {
  sm:   "h-8  px-3   text-[0.8125rem] rounded-sm gap-1.5",
  md:   "h-10 px-4   text-[0.875rem]",
  lg:   "h-12 px-6   text-[0.9375rem]",
  icon: "h-10 w-10 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconEnd?: React.ReactNode;
  fullWidth?: boolean;
  'as-child'?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, icon, iconEnd,
    fullWidth, className = "", children, disabled, ...rest }, ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {/* Label keeps its box while loading — no width jump, no layout shift. */}
      <span
        className="inline-flex items-center gap-2 transition-opacity duration-fast"
        style={{ opacity: loading ? 0 : 1 }}
      >
        {icon && <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.75]">{icon}</span>}
        {children}
        {iconEnd && <span className="[&>svg]:h-4 [&>svg]:w-4 [&>svg]:stroke-[1.75]">{iconEnd}</span>}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Loader2 className="h-4 w-4 animate-spin stroke-[2]" aria-hidden />
          <span className="sr-only">Loading</span>
        </span>
      )}
    </button>
  );
});

export type IconButtonProps = Omit<ButtonProps, 'icon'> & {
  icon?: React.ReactNode | React.ElementType<{ size?: number; strokeWidth?: number; className?: string }>;
  'aria-label': string;
  selected?: boolean;
};

export function IconButton({
  icon: IconComp,
  'aria-label': ariaLabel,
  size = 'md',
  variant = 'ghost',
  selected,
  className,
  ...props
}: IconButtonProps) {
  const IconComponent = IconComp as React.ElementType<{ size?: number; strokeWidth?: number; className?: string }>;
  const renderedIcon = React.isValidElement(IconComp)
    ? IconComp
    : IconComp
      ? <IconComponent size={18} strokeWidth={1.75} />
      : undefined;

  return (
    <Button
      variant={variant}
      size={size}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={className}
      icon={renderedIcon}
      {...props}
    />
  );
}
