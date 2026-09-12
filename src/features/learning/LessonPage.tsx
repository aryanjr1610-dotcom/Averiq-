import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Link, useLocation, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { PageSkeleton, ErrorState } from '@/components/system/States';

import { useAuth } from '@/features/auth/AuthProvider';
import { friendlyError } from '@/features/auth/auth-actions';
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';

import {
  AcademicUnavailableError,
} from '@/features/curriculum/repository';
import { progressRepository } from '@/features/progress/repository';
import { useStudyTimer } from '@/features/progress/useStudyTimer';
import { ReaderNoteTools } from '@/features/notes/ReaderNoteTools';
import { useBookmark } from '@/features/notes/bookmarks';
import { DownloadChapterButton } from '@/features/offline/DownloadsPanel';
import { loadReader, loadReaderVersion } from './load-reader';

import type {
  Lesson,
  LessonVersion,
  ReaderBundle,
} from '@/features/curriculum/model';

import {
  BlockSchema,
  DocumentEnvelope,
} from './content/schema';

import { ContentRenderer } from './content/ContentRenderer';
import { subjectLearningConfig } from './subjects/config';

import {
  ReaderReturnSchema,
  blockAnchor,
  selectReadingBlocks,
} from './reading';

import type { ReadingMode } from './reading';

import './reader.css';
import './book.css';

type Heading = { id: string; text: string; level: number };

function headingsFor(
  version: LessonVersion,
  mode: ReadingMode,
  offset: number,
): Heading[] {
  const envelope = DocumentEnvelope.safeParse(version.content);
  if (!envelope.success) return [];

  const blocks = envelope.data.blocks.flatMap((raw) => {
    const result = BlockSchema.safeParse(raw);
    return result.success ? [result.data] : [];
  });

  return selectReadingBlocks(blocks, mode).blocks.flatMap((block) =>
    block.type === 'heading'
      ? [{
        id: blockAnchor(version.lesson_id, block.id),
        text: block.data.text,
        level: block.data.level + offset,
      }]
      : [],
  );
}

function LazySection({
  lesson,
  seed,
  subjectCode,
  mode,
  preview,
  offlineCopy,
  chapterMode,
  force,
  register,
}: {
  lesson: Lesson;
  seed?: LessonVersion;
  subjectCode: string;
  mode: ReadingMode;
  preview: boolean;
  offlineCopy: boolean;
  chapterMode: boolean;
  force: boolean;
  register: (id: string, headings: Heading[]) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(Boolean(seed) || force);
  const [version, setVersion] = useState(seed ?? null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (visible) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) setVisible(true);
    }, { rootMargin: '900px' });

    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (force) setVisible(true);
  }, [force]);

  useEffect(() => {
    if (!visible || version) return;
    let active = true;
    setError('');

    void loadReaderVersion(lesson.id, preview, offlineCopy)
      .then((result) => { if (active) setVersion(result); })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof AcademicUnavailableError ? cause.message : friendlyError(cause));
        }
      });

    return () => { active = false; };
  }, [visible, version, lesson.id, preview, offlineCopy, attempt]);

  useEffect(() => {
    if (!version) return;
    register(lesson.id, headingsFor(version, mode, chapterMode ? 1 : 0));
  }, [version, mode, chapterMode, lesson.id, register]);

  return (
    <section ref={root} id={`section-${lesson.id}`} className="book-section">
      {chapterMode && <h2>{lesson.title}</h2>}

      {error ? (
        <div role="alert">
          <p>{error}</p>
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry section</Button>
        </div>
      ) : version ? (
        <>
          <ContentRenderer
            document={version.content}
            lessonId={lesson.id}
            subjectCode={subjectCode}
            mode={mode}
            headingOffset={chapterMode ? 1 : 0}
          />

          {preview && (
            <details className="content-inspector">
              <summary>Inspect section data · version {version.version}</summary>
              <p>Schema {version.content_schema_version} · review {version.review_status}</p>
              <pre>{JSON.stringify(version.content, null, 2)}</pre>
            </details>
          )}
        </>
      ) : (
        <div className="book-section-placeholder">
          <p role="status">{visible ? 'Loading section…' : 'Section loads as you approach it.'}</p>
        </div>
      )}
    </section>
  );
}

function Reader({
  bundle,
  chapterMode,
  preview,
  offlineCopy,
}: {
  bundle: ReaderBundle;
  chapterMode: boolean;
  preview: boolean;
  offlineCopy: boolean;
}) {
  const location = useLocation();
  const theme = useAcademicTheme();
  const { preferences, setContext, updatePreferences } = theme;

  const returned = ReaderReturnSchema.safeParse(
    (location.state as { readerReturn?: unknown } | null)?.readerReturn,
  );

  const [mode, setMode] = useState<ReadingMode>(
    returned.success ? returned.data.mode : 'learn',
  );

  const [focus, setFocus] = useState(preferences.focusMode);
  const [drawer, setDrawer] = useState(false);
  const [headings, setHeadings] = useState<Record<string, Heading[]>>({});
  const [activeHeading, setActiveHeading] = useState('');

  const originalFocus = useRef(preferences.focusMode);
  const latestContext = useRef(theme.context);
  latestContext.current = theme.context;

  const restored = useRef(false);
  const config = subjectLearningConfig(bundle.subject.code);

  const lessons = useMemo(
    () => chapterMode
      ? bundle.outline.flatMap((entry) => entry.lessons)
      : [bundle.lesson],
    [bundle, chapterMode],
  );

  const register = useCallback((id: string, items: Heading[]) => {
    setHeadings((current) => ({ ...current, [id]: items }));
  }, []);

  const allHeadings = lessons.flatMap((lesson) => headings[lesson.id] ?? []);
  const headingKey = allHeadings.map((item) => item.id).join('|');

  const requestedAnchor = returned.success
    ? returned.data.anchor
    : decodeURIComponent(location.hash.slice(1));
  const returnedOffset = returned.success ? returned.data.offset : 24;

  useEffect(() => {
    document.title = `${chapterMode ? bundle.chapter.title : bundle.lesson.title} | Averiq`;

    setContext({
      ...latestContext.current,
      subjectId: config.themeSubjectId,
      page: 'reading',
    });
  }, [
    bundle.chapter.title,
    bundle.lesson.title,
    chapterMode,
    config.themeSubjectId,
    setContext,
  ]);

  useEffect(() => {
    updatePreferences({ focusMode: focus });
    const initialFocus = originalFocus.current;

    return () => {
      updatePreferences({ focusMode: initialFocus });
    };
  }, [focus, updatePreferences]);

  useEffect(() => {
    const ids = allHeadings.map((heading) => heading.id);
    if (!ids.length) return;

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

      if (visible[0]) setActiveHeading(visible[0].target.id);
    }, { rootMargin: '-10% 0px -65% 0px' });

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headingKey]);

  useEffect(() => {
    if (!requestedAnchor || restored.current) return;

    const target = document.getElementById(requestedAnchor);
    if (!target) return;

    const frame = requestAnimationFrame(() => {
      window.scrollTo({
        top: window.scrollY + target.getBoundingClientRect().top - returnedOffset,
        behavior: 'auto',
      });

      restored.current = true;
    });

    return () => cancelAnimationFrame(frame);
  }, [requestedAnchor, headings, returnedOffset]);

  const lessonPrefix = preview ? '/dev/content/' : '/app/learn/lessons/';
  const chapterPrefix = preview ? '/dev/chapter/' : '/app/learn/chapters/';

  function outline() {
    return (
      <nav className="book-outline" aria-label="Chapter sections">
        {bundle.outline.map((entry) => (
          <section key={entry.topic.id}>
            <strong>{entry.topic.title}</strong>

            {entry.lessons.map((lesson) => (
              <a
                key={lesson.id}
                href={chapterMode ? `#section-${lesson.id}` : `${lessonPrefix}${lesson.id}`}
                onClick={() => setDrawer(false)}
              >
                {lesson.title}
              </a>
            ))}
          </section>
        ))}

        <p className="type-label">In the loaded sections</p>

        {allHeadings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            aria-current={heading.id === activeHeading ? 'location' : undefined}
            onClick={() => setDrawer(false)}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    );
  }

  const ordered = bundle.outline.flatMap((entry) => entry.lessons);
  const index = ordered.findIndex((lesson) => lesson.id === bundle.lesson.id);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];

  const contentRef = useRef<HTMLElement | null>(null);
  const currentLessonId = bundle.lesson.id;
  const bookmark = useBookmark('lesson', currentLessonId ?? null, {
    title: bundle.lesson.title ?? null,
    route: currentLessonId ? `/app/learn/lessons/${currentLessonId}` : null,
  });

  return (
    <div className="reader-page book-reader" data-reading-focus={focus}>
      {preview && (
        <aside className="setup-notice">
          Reviewer preview · {bundle.release.data_kind} · unverified unless separately reviewed.
          This sample is not the complete commercial chapter.
        </aside>
      )}

      <header className="book-header">
        <p className="book-subject">{bundle.subject.title}</p>
        <h1>{chapterMode ? bundle.chapter.title : bundle.lesson.title}</h1>
        {(bundle.course?.title || !chapterMode) && <p>{bundle.course?.title ?? bundle.chapter.title}</p>}
        {offlineCopy && <p className="type-body-sm" role="status">Reading your downloaded copy. Interactive resources may need a connection.</p>}

        {!chapterMode && (
          <Link to={`${chapterPrefix}${bundle.chapter.id}`}>Read the continuous chapter</Link>
        )}
      </header>

      <div className="reader-controls">
        <fieldset className="reader-modes">
          <legend>Reading presentation</legend>

          {([
            ['learn', 'Learn · full text'],
            ['understand', 'Understand'],
            ['exam', 'Exam Focus'],
          ] as const).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="reading-mode"
                value={value}
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              {label}
            </label>
          ))}
        </fieldset>

        <label>
          <input type="checkbox" checked={focus} onChange={(event) => setFocus(event.target.checked)} />
          {' '}Distraction-reduced reading
        </label>

        {bookmark.available ? (
          <Button variant="quiet" onClick={() => void bookmark.toggle()} aria-pressed={bookmark.saved}>
            {bookmark.saved ? 'Saved' : 'Save lesson'}
          </Button>
        ) : null}

        <DownloadChapterButton chapterId={bundle.chapter.id} title={bundle.chapter.title} />

        {!preview && bundle.placement?.id && <details className="reader-study-tools">
          <summary>Study this chapter</summary>
          <nav aria-label="Study this chapter">
            {[
              ['/app/revision', 'Revision'],
              ['/app/revision/quick', 'Quick revision'],
              ['/app/flashcards', 'Flashcards'],
              ['/app/formulas', 'Formulas'],
              ['/app/practice', 'Practice'],
            ].map(([path, label]) => <Link key={path} to={`${path}?${new URLSearchParams({ subject: bundle.placement.id, chapter: bundle.chapter.id })}`}>{label}</Link>)}
          </nav>
        </details>}

        <Dialog
          open={drawer}
          onOpenChange={setDrawer}
          title="Chapter outline"
          description={bundle.chapter.title}
          trigger={<Button variant="outline">Outline</Button>}
        >
          {outline()}
        </Dialog>
      </div>

      <div className="book-grid">
        <aside className="book-sidebar">{outline()}</aside>

        <article ref={contentRef} data-lesson-id={currentLessonId} className="book-main reader-body" aria-label={bundle.chapter.title}>
          {lessons.map((lesson) => (
            <LazySection
              key={lesson.id}
              lesson={lesson}
              seed={lesson.id === bundle.lesson.id ? bundle.version : undefined}
              subjectCode={bundle.subject.code}
              mode={mode}
              preview={preview}
              offlineCopy={offlineCopy}
              chapterMode={chapterMode}
              force={requestedAnchor.startsWith(`lesson-${lesson.id}--`)}
              register={register}
            />
          ))}

          {!chapterMode && (
            <nav className="lesson-neighbors" aria-label="Adjacent lessons">
              {previous ? <Link to={`${lessonPrefix}${previous.id}`}>← {previous.title}</Link> : <span />}
              {next && <Link to={`${lessonPrefix}${next.id}`}>{next.title} →</Link>}
            </nav>
          )}
        </article>
        {currentLessonId ? <ReaderNoteTools lessonId={currentLessonId} contentVersionId={bundle.version?.id ?? null} rootRef={contentRef} /> : null}
      </div>
    </div>
  );
}

export default function LessonPage({ preview = false }: { preview?: boolean }) {
  const { lessonId, chapterId } = useParams();
  const location = useLocation();
  const preferDownloaded = new URLSearchParams(location.search).get('downloaded') === '1';
  const { user } = useAuth();
  const userId = user?.id;

  const key = `${userId}:${lessonId ?? chapterId}:${preview}:${preferDownloaded}`;
  const [state, setState] = useState<{ key: string; bundle: ReaderBundle; offlineCopy: boolean } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const effectiveLessonId = lessonId ?? state?.bundle.lesson.id;
  useStudyTimer({ activityType: 'lesson', lessonId: effectiveLessonId, enabled: Boolean(effectiveLessonId && !preview) });

  const deepest = useRef(0);
  useEffect(() => {
    if (!effectiveLessonId || preview) return;
    void progressRepository.saveLesson({ lessonId: effectiveLessonId }).catch(() => undefined);
    void progressRepository.logActivity({ kind: 'lesson_opened', lessonId: effectiveLessonId }).catch(() => undefined);

    const onScroll = () => {
      const scrolled = window.scrollY + window.innerHeight;
      const percent = Math.min(100, (scrolled / Math.max(1, document.body.scrollHeight)) * 100);
      deepest.current = Math.max(deepest.current, percent);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const save = window.setInterval(() => {
      if (deepest.current > 0) {
        void progressRepository
          .saveLesson({ lessonId: effectiveLessonId, readingProgress: deepest.current, completed: deepest.current > 95 })
          .catch(() => undefined);
      }
    }, 20_000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(save);
      if (deepest.current > 0) {
        void progressRepository
          .saveLesson({ lessonId: effectiveLessonId, readingProgress: deepest.current, completed: deepest.current > 95 })
          .catch(() => undefined);
      }
    };
  }, [effectiveLessonId, preview]);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    setFailure(null);

    void loadReader({ lessonId, chapterId, preview, offline: preferDownloaded || !navigator.onLine })
      .then((result) => {
        if (active) setState({ key, ...result });
      })
      .catch((cause: unknown) => {
        if (active) {
          setFailure({
            key,
            message: cause instanceof AcademicUnavailableError
              ? cause.message
              : friendlyError(cause),
          });
        }
      });

    return () => { active = false; };
  }, [key, userId, lessonId, chapterId, preview, attempt, preferDownloaded]);

  if (failure?.key === key) {
    return (
      <>
        <ErrorState message={failure.message} />
        <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>Retry</Button>
        {!preview && <Link className="button button--outline" to="/app/settings">Manage downloads</Link>}
      </>
    );
  }

  if (!state || state.key !== key) return <PageSkeleton />;

  return (
    <Reader
      key={key}
      bundle={state.bundle}
      offlineCopy={state.offlineCopy}
      chapterMode={Boolean(chapterId)}
      preview={preview}
    />
  );
}
