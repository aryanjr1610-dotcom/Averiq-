'use client';
import { motion } from 'framer-motion';
import { duration, ease } from '@/lib/motion';

/** Anatomy: educational, not clinical. Eased reveal, never a camera lurch. */
export function AnatomyInfoPanel({
  organ, summary, facts, lessonHref,
}: {
  organ: string;
  summary: string;
  facts: Array<{ label: string; value: string }>;
  lessonHref?: string;
}) {
  return (
    <motion.div
      key={organ}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.medium, ease: ease.out }}
      aria-live="polite"
    >
      <h2 className="text-subsection text-ink">{organ}</h2>
      <p className="mt-2 max-w-prose text-body-sm leading-[1.65] text-ink-secondary">{summary}</p>
      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.label} className="flex justify-between gap-4 border-b border-edge-subtle pb-1.5">
            <dt className="text-caption text-ink-tertiary">{f.label}</dt>
            <dd className="text-body-sm text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      {lessonHref && (
        <a href={lessonHref} className="mt-5 inline-block text-body-sm text-accent underline-offset-4 hover:underline">
          Open the related lesson
        </a>
      )}
    </motion.div>
  );
}
