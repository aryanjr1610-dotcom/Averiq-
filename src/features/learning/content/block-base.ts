import { z } from 'zod';

export const Id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
export const Text = z.string().min(1).max(12000);
export const Latex = z.string().min(1).max(4000);

export const ContentTag = z.enum([
  'learn',
  'concept',
  'exam',
  'revision',
  'advanced',
]);

export function block<T extends string, D extends z.ZodType>(
  type: T,
  data: D,
) {
  return z.object({
    id: Id,
    type: z.literal(type),
    data,

    // Optional—not defaulted—to preserve old import normalization.
    tags: z.array(ContentTag).max(5).optional(),
    requires: z.array(Id).max(30).optional(),
  });
}
