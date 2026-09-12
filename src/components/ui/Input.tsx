'use client';
import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  description?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    hint,
    description,
    error,
    success,
    icon,
    leadingIcon,
    trailingIcon,
    className,
    id,
    ...props
  },
  ref,
) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  const effectiveHint = hint || description;
  const effectiveIcon = icon || leadingIcon;
  const describedBy = error ? `${inputId}-err` : effectiveHint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="t-label text-ink-secondary">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {effectiveIcon && (
          <span className="pointer-events-none absolute left-3 text-ink-tertiary">{effectiveIcon}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-10 w-full bg-surface-1 text-ink',
            'text-body rounded-sm',
            'border border-edge px-3',
            effectiveIcon ? 'pl-9' : '',
            trailingIcon ? 'pr-9' : '',
            'placeholder:text-ink-tertiary',
            'transition-colors duration-fast ease-standard',
            'hover:border-edge-strong',
            'focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-quiet',
            'disabled:opacity-45',
            error && 'border-danger focus:border-danger',
            success && !error && 'border-success focus:border-success',
            'max-md:h-11',
            className,
          )}
          {...props}
        />
      </div>

      {error ? (
        <p id={`${inputId}-err`} className="t-caption flex items-center gap-1.5 text-danger">
          <AlertCircle size={13} strokeWidth={1.75} aria-hidden />
          {error}
        </p>
      ) : typeof success === 'string' ? (
        <p className="t-caption text-success">{success}</p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="t-caption text-ink-secondary">{hint}</p>
      ) : null}
    </div>
  );
});

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  description?: string;
  error?: string;
};

export function Select({
  label,
  value,
  onChange,
  children,
  className,
  id,
  hint,
  description,
  error,
  ...props
}: SelectProps) {
  const autoId = React.useId();
  const selectId = id ?? autoId;
  const effectiveHint = hint || description;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="t-label text-ink-secondary">
          {label}
        </label>
      )}
      <select
        id={selectId}
        value={value}
        onChange={onChange}
        className={cn(
          'h-10 w-full bg-surface-1 text-ink text-body rounded-sm border border-edge px-3 outline-none focus:border-accent',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {effectiveHint && <p className="t-caption text-ink-secondary">{effectiveHint}</p>}
      {error && <p className="t-caption text-danger">{error}</p>}
    </div>
  );
}

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  description?: string;
  error?: string;
};

export function Textarea({
  label,
  value,
  onChange,
  className,
  id,
  hint,
  description,
  error,
  rows = 4,
  ...props
}: TextareaProps) {
  const autoId = React.useId();
  const textId = id ?? autoId;
  const effectiveHint = hint || description;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textId} className="t-label text-ink-secondary">
          {label}
        </label>
      )}
      <textarea
        id={textId}
        rows={rows}
        value={value}
        onChange={onChange}
        className={cn(
          'w-full bg-surface-1 text-ink text-body rounded-sm border border-edge p-3 outline-none focus:border-accent',
          className,
        )}
        {...props}
      />
      {effectiveHint && <p className="t-caption text-ink-secondary">{effectiveHint}</p>}
      {error && <p className="t-caption text-danger">{error}</p>}
    </div>
  );
}

export type ChoiceProps = Omit<React.ComponentPropsWithRef<'input'>, 'type' | 'children'> & {
  label: string;
  description?: string;
};

export function Checkbox({ label, description, id, className, ...props }: ChoiceProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn('flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <input
        {...props}
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded-xs border border-edge bg-surface-1 text-accent focus:ring-accent-quiet focus:ring-2"
      />
      <span className="flex flex-col">
        <span className="text-body-sm font-medium text-ink">{label}</span>
        {description && <span className="text-caption text-ink-secondary">{description}</span>}
      </span>
    </label>
  );
}

export function Radio({ label, description, id, className, ...props }: ChoiceProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn('flex items-start gap-2.5 cursor-pointer select-none', className)}>
      <input
        {...props}
        id={inputId}
        type="radio"
        className="mt-0.5 h-4 w-4 rounded-full border border-edge bg-surface-1 text-accent focus:ring-accent-quiet focus:ring-2"
      />
      <span className="flex flex-col">
        <span className="text-body-sm font-medium text-ink">{label}</span>
        {description && <span className="text-caption text-ink-secondary">{description}</span>}
      </span>
    </label>
  );
}

export function Switch({ label, description, id, className, ...props }: ChoiceProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn('flex items-center justify-between gap-3 cursor-pointer select-none', className)}>
      <span className="flex flex-col">
        <span className="text-body-sm font-medium text-ink">{label}</span>
        {description && <span className="text-caption text-ink-secondary">{description}</span>}
      </span>
      <input
        {...props}
        id={inputId}
        type="checkbox"
        role="switch"
        className="h-5 w-9 rounded-full border border-edge bg-surface-2 accent-accent cursor-pointer"
      />
    </label>
  );
}

/** Field: one label/hint/error contract for auth, onboarding, planner, notes. */
export function Field({
  label, hint, error, required, children,
}: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactElement;
}) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="t-label text-content-secondary">
        {label}
        {required && <span className="ml-1 text-bad" aria-hidden>*</span>}
      </label>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {{ ...children, props: { ...(children.props as any), id,
          "aria-invalid": Boolean(error) || undefined,
          "aria-describedby": [hintId, errId].filter(Boolean).join(" ") || undefined } } as React.ReactElement}

      {hint && !error && <p id={hintId} className="t-caption text-content-tertiary">{hint}</p>}
      {error && (
        <p id={errId} role="alert" className="t-caption flex items-center gap-1.5 text-bad">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
            <path d="M8 1.5 15 14H1L8 1.5Zm0 4.3v4m0 2.2h.01" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

