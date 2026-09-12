import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/system/PageHeader';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/system/States';
import { useAcademicTheme } from '@/app/providers/AcademicThemeProvider';
import { subjectLearningConfig } from '@/features/learning/subjects/config';
import { useStudyTimer } from '@/features/progress/useStudyTimer';
import { loadStudyCatalog, loadStudyContent, type StudyCatalog, type StudyContent } from './load';
import { checkpointItems, flashcards, formulaItems, revisionBlocks, type StudyMode } from './model';
import { FormulaReference, RevisionReference } from './StudyReference';
import { FlashcardSession, PracticeSession, SaveCompletion } from './StudySessions';
import '@/features/learning/reader.css';
import '@/features/learning/book.css';
import './study.css';

const modes: Array<{ mode: StudyMode; label: string; path: string; description: string }> = [
  { mode: 'revision', label: 'Revision', path: '/app/revision', description: 'Revisit the ideas, formulas and common mistakes in your chapter.' },
  { mode: 'quick', label: 'Quick revision', path: '/app/revision/quick', description: 'A shorter pass through summaries, key formulas and mistakes to avoid.' },
  { mode: 'flashcards', label: 'Flashcards', path: '/app/flashcards', description: 'Recall an idea, reveal its explanation, then decide what needs another look.' },
  { mode: 'formulas', label: 'Formulas', path: '/app/formulas', description: 'Equations with their meaning, variables and authored derivations.' },
  { mode: 'practice', label: 'Practice', path: '/app/practice', description: 'Work through your chapter’s concept checks with clear answer explanations.' },
];

export default function StudyWorkspace({ mode, test = false }: { mode: StudyMode; test?: boolean }) {
  const [params] = useSearchParams();
  const subjectId = params.get('subject');
  const chapterId = params.get('chapter');
  const topicId = params.get('topic');
  return <StudySelection key={`${subjectId}:${chapterId}:${topicId}`} subjectId={subjectId} chapterId={chapterId} topicId={topicId} mode={mode} test={test} />;
}

function StudySelection({ subjectId, chapterId, topicId, mode, test }: { subjectId: string | null; chapterId: string | null; topicId: string | null; mode: StudyMode; test: boolean }) {
  const [, setParams] = useSearchParams();
  const [catalog, setCatalog] = useState<StudyCatalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { setContext } = useAcademicTheme();
  useEffect(() => {
    let active = true;
    setFailed(false);
    void loadStudyCatalog(subjectId, chapterId, topicId).then((data) => { if (active) setCatalog(data); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [subjectId, chapterId, topicId, attempt]);
  useEffect(() => {
    if (!catalog?.subject) return;
    setContext((current) => ({ ...current, subjectId: subjectLearningConfig(catalog.subject!.code).themeSubjectId, page: mode === 'practice' ? 'exam' : 'reading' }));
  }, [catalog, mode, setContext]);
  const selectedMode = modes.find((item) => item.mode === mode)!;
  useEffect(() => { document.title = `${test ? 'Chapter test' : selectedMode.label} | Averiq`; }, [selectedMode.label, test]);
  if (failed) return <div className="study-workspace"><ErrorState title="Your study library couldn't load" message="Check your connection and retry, or choose another subject if this study link is unavailable." retry={() => setAttempt((value) => value + 1)} /><Link className="button button--outline" to={selectedMode.path}>Choose a subject</Link></div>;
  if (!catalog) return <PageSkeleton />;
  const query = new URLSearchParams({ ...(catalog.placement ? { subject: catalog.placement.id } : {}), ...(catalog.chapter ? { chapter: catalog.chapter.id } : {}), ...(catalog.topic ? { topic: catalog.topic.id } : {}) }).toString();
  return <div className="study-workspace">
    <PageHeader title={test ? 'Chapter test' : selectedMode.label} description={test ? 'Check your understanding, then review all explanations at the end.' : selectedMode.description} />
    <nav className="study-modes" aria-label="Study tools">{modes.map((item) => <Link key={item.mode} to={`${item.path}?${query}`} aria-current={mode === item.mode ? 'page' : undefined}>{item.label}</Link>)}</nav>
    {catalog.subjects.length ? <>
      <div className="study-selectors">
        <label>Subject<select value={catalog.placement?.id ?? ''} onChange={(event) => setParams({ subject: event.target.value })}><option value="" disabled>Choose a subject</option>{catalog.subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.title}</option>)}</select></label>
        <label>Chapter<select value={catalog.chapter?.id ?? ''} disabled={!catalog.chapters.length} onChange={(event) => setParams({ subject: catalog.placement!.id, chapter: event.target.value })}><option value="" disabled>{catalog.chapters.length ? 'Choose a chapter' : 'No published chapters'}</option>{catalog.chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.title}</option>)}</select></label>
      </div>
      {catalog.chapter && catalog.subject && catalog.placement ? <>
        <div className="study-chapter-heading"><h2>{catalog.topic?.title ?? catalog.chapter.title}</h2><Link to={`/app/learn/chapters/${catalog.chapter.id}`}>Read chapter</Link></div>
        {catalog.topic && <p className="study-hint">Studying one topic in {catalog.chapter.title}. <button className="study-text-action" onClick={() => setParams({ subject: catalog.placement!.id, chapter: catalog.chapter!.id })}>Study the whole chapter</button></p>}
        {mode === 'practice' && <nav className="study-actions" aria-label="Practice mode"><Link className="button button--outline" to={`/app/practice?${query}`} aria-current={!test ? 'page' : undefined}>Learn with feedback</Link><Link className="button button--outline" to={`/app/practice/test?${query}`} aria-current={test ? 'page' : undefined}>Test yourself</Link></nav>}
        <ChapterContent key={`${catalog.chapter.id}:${catalog.topic?.id}`} topicId={catalog.topic?.id} chapterId={catalog.chapter.id} subjectId={catalog.subject.id} subjectCode={catalog.subject.code} mode={mode} test={test} />
      </> : <EmptyState heading="h2" title={chapterId || subjectId ? 'Choose an available chapter' : 'No chapters available yet'} description="Use the subject and chapter selectors to find published material in your curriculum." action={<Link className="button button--outline" to="/app/learn">Learning library</Link>} />}
    </> : <EmptyState heading="h2" title="Your curriculum isn't available yet" description="Check your academic profile. Published study material will appear here when it is ready." action={<Link className="button button--primary" to="/app/profile">Check academic profile</Link>} />}
  </div>;
}

function ChapterContent({ chapterId, topicId, subjectId, subjectCode, mode, test }: { chapterId: string; topicId?: string; subjectId: string; subjectCode: string; mode: StudyMode; test: boolean }) {
  const [content, setContent] = useState<StudyContent | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [round, setRound] = useState(0);
  useEffect(() => {
    let active = true;
    setContent(null);
    setError(false);
    void loadStudyContent(chapterId, () => active, topicId).then((data) => { if (active) setContent(data); }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [chapterId, topicId, attempt]);
  if (error) return <ErrorState title="This chapter couldn't load" message="Your study material is still available in the learning library. Check your connection and retry." retry={() => setAttempt((value) => value + 1)} />;
  if (!content) return <div role="status" aria-label="Loading chapter study material"><PageSkeleton /></div>;
  if (!content.lessons.length && content.unavailable) return <ErrorState title="Study content is unavailable" message="The chapter content could not be loaded or validated. Retry, or choose another chapter." retry={() => setAttempt((value) => value + 1)} />;
  const sessionMode = mode === 'practice' || mode === 'flashcards';
  return <>
    {content.unavailable > 0 && <div className="study-notice" role="status"><p>{content.unavailable} {content.unavailable === 1 ? 'lesson could' : 'lessons could'} not be included. You can study the available content or retry loading.</p><button className="button button--outline" onClick={() => setAttempt((value) => value + 1)}>Reload chapter</button></div>}
    <StudyBody key={`${mode}:${test}:${round}:${attempt}`} content={content} chapterId={chapterId} subjectId={subjectId} subjectCode={subjectCode} mode={mode} test={test} />
    {sessionMode && hasMaterial(content, mode) && <details className="study-detail study-restart"><summary>Start a new session</summary><p>This clears your current answers or recall ratings. Saved activity stays in your history.</p><button className="button button--outline" onClick={() => setRound((value) => value + 1)}>Restart this session</button></details>}
  </>;
}

function StudyBody({ content, chapterId, subjectId, subjectCode, mode, test }: { content: StudyContent; chapterId: string; subjectId: string; subjectCode: string; mode: StudyMode; test: boolean }) {
  useStudyTimer({ activityType: mode === 'practice' ? 'practice' : mode === 'flashcards' ? 'flashcards' : 'revision', chapterId, subjectId, enabled: hasMaterial(content, mode) });
  if (mode === 'formulas') return <FormulaReference lessons={content.lessons} />;
  if (mode === 'flashcards') return <FlashcardSession lessons={content.lessons} subjectId={subjectId} chapterId={chapterId} />;
  if (mode === 'practice') return <PracticeSession lessons={content.lessons} subjectId={subjectId} chapterId={chapterId} subjectCode={subjectCode} test={test} />;
  const hasRevision = content.lessons.some((item) => revisionBlocks(item.document, mode === 'quick').length);
  return <><RevisionReference lessons={content.lessons} subjectCode={subjectCode} quick={mode === 'quick'} />{hasRevision && <SaveCompletion label="Mark revision complete" input={{ kind: 'revision_completed', chapterId, subjectId, metadata: { mode, source: 'lesson-content', partial: content.unavailable > 0 } }} />}</>;
}

function hasMaterial(content: StudyContent, mode: StudyMode): boolean {
  if (mode === 'practice') return checkpointItems(content.lessons).length > 0;
  if (mode === 'flashcards') return flashcards(content.lessons).length > 0;
  if (mode === 'formulas') return formulaItems(content.lessons).length > 0;
  return content.lessons.some((item) => revisionBlocks(item.document, mode === 'quick').length > 0);
}
