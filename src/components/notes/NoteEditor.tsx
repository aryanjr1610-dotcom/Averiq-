'use client';
import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

/** Writing first. Autosave shows one quiet status — no toast per keystroke. */
export function NoteEditor({
  initialTitle, initialBody, lesson, onSave,
}: {
  initialTitle: string;
  initialBody: string;
  lesson?: { title: string; href: string };
  onSave: (v: { title: string; body: string }) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(initialTitle);
  const [body, setBody] = React.useState(initialBody);
  const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

  React.useEffect(() => {
    if (title === initialTitle && body === initialBody) return;
    setStatus('saving');
    const t = setTimeout(async () => {
      await onSave({ title, body });
      setStatus('saved');
    }, 900);
    return () => clearTimeout(t);
  }, [title, body, initialTitle, initialBody, onSave]);

  return (
    <div className="mx-auto w-full max-w-prose px-5 py-8 md:px-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/app/notes" className="inline-flex items-center gap-1 text-body-sm text-ink-secondary hover:text-ink">
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden /> Notes
        </Link>
        <span className="ml-auto text-caption text-ink-secondary" aria-live="polite">
          {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}
        </span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Untitled note"
        aria-label="Note title"
        className="w-full bg-transparent text-page-title text-ink outline-none placeholder:text-ink-tertiary"
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start writing…"
        aria-label="Note body"
        className="mt-5 min-h-[52dvh] w-full resize-none bg-transparent font-reading text-reading text-ink leading-[1.75] outline-none placeholder:text-ink-tertiary"
      />

      {lesson && (
        <Link
          href={lesson.href}
          className="mt-6 inline-flex items-center gap-2 rounded-md border border-edge px-3 py-2 text-body-sm text-ink-secondary transition-colors duration-fast hover:bg-surface-2 hover:text-ink"
        >
          <BookOpen size={16} strokeWidth={1.75} aria-hidden />
          Back to {lesson.title}
        </Link>
      )}
    </div>
  );
}
