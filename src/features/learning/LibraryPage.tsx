import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { curriculumRepository } from '@/features/curriculum/repository';
import type { Chapter, CurriculumResolution } from '@/features/curriculum/model';
import { ErrorState, EmptyState, PageSkeleton } from '@/components/system/States';
import { PageHeader } from '@/components/system/PageHeader';
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import { subjectLearningConfig } from './subjects/config';
import './library.css';

type Library = { resolution: CurriculumResolution; chapters: Chapter[]; subjectCode?: string };

/** Browse the existing resolved curriculum; publication/access rules stay in the repository. */
export default function LibraryPage() {
  const { subjectId } = useParams();
  const [data, setData] = useState<Library | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { setContext } = useAcademicTheme();

  useEffect(() => {
    let active = true;
    setData(null);
    setError(false);
    void (async () => {
      const resolution = await curriculumRepository.resolveMyCurriculum();
      const placement = resolution.subjects.find((subject) => subject.id === subjectId);
      const [chapters, subject] = placement ? await Promise.all([
        curriculumRepository.getChapters(placement.id),
        curriculumRepository.getSubject(placement.subject_id),
      ]) : [[], undefined];
      if (active) setData({ resolution, chapters: chapters.filter((chapter) => chapter.status === 'published'), subjectCode: subject?.code });
    })().catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [subjectId, attempt]);

  useEffect(() => {
    if (!data?.subjectCode) return;
    const subject = subjectLearningConfig(data.subjectCode).themeSubjectId;
    setContext((current) => ({ ...current, subjectId: subject, page: 'default' }));
  }, [data?.subjectCode, setContext]);

  if (error) return <ErrorState title="Your learning library couldn't load" message="Check your connection, then try again." retry={() => setAttempt((value) => value + 1)} />;
  if (!data) return <PageSkeleton />;
  const placement = data.resolution.subjects.find((subject) => subject.id === subjectId);

  if (subjectId && !placement) return <EmptyState icon={<BookOpen aria-hidden="true" />} title="This subject isn't in your current curriculum" description="Choose a subject from your library, or check your academic profile." action={<Link className="button button--primary" to="/app/learn">Your subjects</Link>} />;

  return (
    <div className="learning-library">
      <PageHeader title={placement?.title ?? 'Learn'} description={placement ? 'Work through a chapter at your own pace. Your place is saved as you read.' : 'Your subjects, with space to understand.'} metadata={placement ? <Link to="/app/learn">All subjects</Link> : undefined} />
      {placement ? (
        data.chapters.length ? <ol className="library-list library-list--chapters">
          {data.chapters.map((chapter) => <li key={chapter.id}>
            <Link to={`/app/learn/chapters/${chapter.id}`} className="library-link">
              <span className="library-copy"><strong>{chapter.title}</strong>{chapter.description && <span>{chapter.description}</span>}{chapter.estimated_minutes != null && <span className="type-caption">{chapter.estimated_minutes} min of reading</span>}</span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </li>)}
        </ol> : <EmptyState heading="h2" title="No chapters available yet" description="Published chapters will appear here when they are available for your curriculum." action={<Link className="button button--outline" to="/app/learn">Explore your subjects</Link>} />
      ) : data.resolution.subjects.length ? (
        <ul className="library-list">
          {data.resolution.subjects.map((subject) => <li key={subject.id}>
            <Link className="library-link" to={`/app/learn/subjects/${subject.id}`}><span className="library-copy"><strong>{subject.title}</strong><span>Explore chapters</span></span><ArrowUpRight size={20} aria-hidden="true" /></Link>
          </li>)}
        </ul>
      ) : <EmptyState heading="h2" title="Your curriculum isn't available yet" description="Check your class, board and subjects. Your published learning material will appear here when it is ready." action={<Link className="button button--primary" to="/app/profile">Check academic profile</Link>} />}
    </div>
  );
}

