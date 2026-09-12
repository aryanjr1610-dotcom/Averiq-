import { z } from 'zod';

export const emailSchema = z.string().trim().email().max(254);

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(128, 'Use no more than 128 characters.');

export const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(80),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (value) => value.password === value.confirmPassword,
  {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  },
);

export const signinSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const resetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (value) => value.password === value.confirmPassword,
  {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  },
);

export function fieldErrors(error: z.ZodError) {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    result[field] ??= issue.message;
  }

  return result;
}

export function focusFirstError(
  form: HTMLFormElement,
  errors: Record<string, string>,
) {
  const field = Object.keys(errors)[0];
  if (!field) return;

  const control = form.elements.namedItem(field);

  if (control instanceof HTMLElement) {
    control.focus();
  }
}
