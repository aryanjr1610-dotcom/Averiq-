import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export function NotesList({ notes }: { notes: Array<{ id: string; title: string; excerpt: string; updated: string; lessonTitle?: string; lessonHref?: string }> }) {
  return (
    <ul className="mx-auto w-full max-w-content divide-y divide-edge-subtle">
      {notes.map((n) => (
        <li key={n.id} className="group py-4">
          <Link href={`/app/notes/${n.id}`} className="block">
            <p className="text-card-title text-ink">{n.title || 'Untitled note'}</p>
            <p className="mt-1 line-clamp-2 max-w-prose text-body-sm text-ink-secondary">{n.excerpt}</p>
            <p className="mt-2 flex items-center gap-2 text-caption">
              <time className="text-ink-secondary">{n.updated}</time>
              {n.lessonTitle && (
                <>
                  <span aria-hidden className="text-ink-tertiary">·</span>
                  <span className="inline-flex items-center gap-1 text-ink-tertiary">
                    {n.lessonTitle}
                    <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden />
                  </span>
                </>
              )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
