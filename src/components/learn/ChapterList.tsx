'use client';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

export type ChapterRow = {
  id: string;
  index: number;
  title: string;
  topicCount: number;
  progress: number; // 0–100
  locked?: boolean;
};

export function ChapterList({ chapters, subjectSlug }: { chapters: ChapterRow[]; subjectSlug: string }) {
  return (
    <ol className="mx-auto w-full max-w-content overflow-hidden rounded-lg border border-edge-subtle bg-surface-1">
      {chapters.map((c, i) => {
        const done = c.progress >= 100;
        return (
          <li key={c.id} className={i > 0 ? 'border-t border-edge-subtle' : ''}>
            <Link
              to={c.locked ? '#' : `/app/learn/${subjectSlug ? `${subjectSlug}/` : ''}chapters/${c.id}`}
              aria-disabled={c.locked}
              className={
                'flex min-h-[64px] items-center gap-4 px-4 py-3 transition-colors duration-base ' +
                (c.locked ? 'cursor-not-allowed opacity-55' : 'hover:bg-surface-2')
              }
            >
              <span className="w-7 shrink-0 tabular text-body-sm text-ink-tertiary">
                {String(c.index).padStart(2, '0')}
              </span>

              <span className="min-w-0 flex-1">
                {/* shared element target lives on the reader header */}
                <motion.span layoutId={`chapter-title-${c.id}`} className="block truncate text-body font-medium text-ink">
                  {c.title}
                </motion.span>
                <span className="mt-0.5 block text-caption text-ink-secondary">
                  {c.topicCount} topics{c.progress > 0 && !done ? ` · ${Math.round(c.progress)}% read` : ''}
                </span>
              </span>

              {done ? (
                <span className="flex shrink-0 items-center gap-1.5 text-caption text-success">
                  <Check size={14} strokeWidth={2.25} aria-hidden /> Done
                </span>
              ) : c.locked ? (
                <Lock size={15} strokeWidth={1.75} className="shrink-0 text-ink-tertiary" aria-label="Locked" />
              ) : (
                <span className="hidden w-24 shrink-0 sm:block">
                  <span className="block h-1 overflow-hidden rounded-full bg-surface-3">
                    <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${c.progress / 100})` }} />
                  </span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
