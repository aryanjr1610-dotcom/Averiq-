import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Surface } from '@/components/ui/Surface';
import { PageHeader } from '@/components/system/PageHeader';
import { ErrorState, PageSkeleton } from '@/components/system/States';

import { friendlyError } from '@/features/auth/auth-actions';
import { useAuth } from '@/features/auth/AuthProvider';

import {
  AcademicUnavailableError,
  curriculumRepository as repository,
} from './repository';

import type {
  Chapter,
  CurriculumResolution,
  CurriculumSubject,
} from './model';

type Release = Awaited<ReturnType<typeof repository.getReviewReleases>>[number];
type Outline = Awaited<ReturnType<typeof repository.getOutline>>;

export default function CurriculumDevPage() {
  const { user } = useAuth();

  const [releases, setReleases] = useState<Release[] | null>(null);
  const [resolution, setResolution] = useState<CurriculumResolution | null>(null);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [outline, setOutline] = useState<Outline>([]);

  const [releaseId, setReleaseId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  function report(cause: unknown) {
    setError(
      cause instanceof AcademicUnavailableError
        ? cause.message
        : friendlyError(cause),
    );
  }

  useEffect(() => {
    let active = true;
    setError(null);
    setReleases(null);

    void Promise.all([
      repository.getReviewReleases(),
      repository.resolveStudent(),
    ])
      .then(([rows, resolved]) => {
        if (!active) return;
        setReleases(rows);
        setResolution(resolved);
      })
      .catch((cause: unknown) => {
        if (active) report(cause);
      });

    return () => { active = false; };
  }, [user?.id, attempt]);

  useEffect(() => {
    let active = true;

    setSubjects([]);
    setSubjectId('');
    setChapters([]);
    setChapterId('');
    setOutline([]);

    if (releaseId) {
      void repository.getReviewSubjects(releaseId)
        .then((rows) => { if (active) setSubjects(rows); })
        .catch((cause: unknown) => { if (active) report(cause); });
    }

    return () => { active = false; };
  }, [releaseId]);

  useEffect(() => {
    let active = true;
    setChapters([]);
    setChapterId('');
    setOutline([]);

    if (subjectId) {
      void repository.getChapters(subjectId)
        .then((rows) => { if (active) setChapters(rows); })
        .catch((cause: unknown) => { if (active) report(cause); });
    }

    return () => { active = false; };
  }, [subjectId]);

  useEffect(() => {
    let active = true;
    setOutline([]);

    if (chapterId) {
      void repository.getOutline(chapterId, true)
        .then((rows) => { if (active) setOutline(rows); })
        .catch((cause: unknown) => { if (active) report(cause); });
    }

    return () => { active = false; };
  }, [chapterId]);

  if (error) {
    return (
      <ErrorState
        title="Curriculum inspection is unavailable."
        message={error}
        retry={() => setAttempt((value) => value + 1)}
      />
    );
  }

  if (!releases) return <PageSkeleton />;

  return (
    <div className="auth-stack">
      <PageHeader
        eyebrow="Development · Reviewer access"
        title="Curriculum explorer"
        description="Inspect real database relationships without creating a production curriculum screen."
        actions={
          <Button variant="outline" onClick={() => {
            repository.clearCache();
            setAttempt((value) => value + 1);
          }}>
            Refresh
          </Button>
        }
      />

      <Surface>
        <p className="type-card">Current student resolution</p>
        <p>Status: {resolution?.status}</p>

        {resolution?.status === 'unavailable' && (
          <p>Curriculum isn’t available for this selection yet.</p>
        )}

        <pre>{JSON.stringify(resolution, null, 2)}</pre>
      </Surface>

      <Select
        label="Release / year / class"
        value={releaseId}
        onChange={(event) => setReleaseId(event.target.value)}
      >
        <option value="">Choose a release</option>

        {releases.map((release) => (
          <option key={release.id} value={release.id}>
            {release.import_key} · Class {release.grade_level} ·
            {' '}{release.status} · {release.verification_status}
          </option>
        ))}
      </Select>

      <Select
        label="Curriculum subject"
        value={subjectId}
        disabled={!releaseId}
        onChange={(event) => setSubjectId(event.target.value)}
      >
        <option value="">Choose a subject</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>{subject.title}</option>
        ))}
      </Select>

      <Select
        label="Chapter"
        value={chapterId}
        disabled={!subjectId}
        onChange={(event) => setChapterId(event.target.value)}
      >
        <option value="">Choose a chapter</option>
        {chapters.map((chapter) => (
          <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
        ))}
      </Select>

      {outline.map(({ topic, lessons }) => (
        <Surface key={topic.id} className="space-y-2 p-4">
          <h3 className="t-subsection">{topic.title}</h3>
          {lessons.length
            ? lessons.map((lesson) => (
              <Link
                key={lesson.id}
                to={`/dev/content/${lesson.id}`}
                className="block text-accent hover:underline"
              >
                {lesson.title}
              </Link>
            ))
            : <p className="text-caption text-ink-secondary">Metadata only—no lesson content seeded.</p>}
        </Surface>
      ))}
    </div>
  );
}
