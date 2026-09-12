import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RotateCcw } from 'lucide-react';
import { Radio } from '@/components/ui/Input';
import { ContentRenderer, RichTextView } from '@/features/learning/content/ContentRenderer';
import { createSession, sessionReducer, computeResult } from '@/features/competitive/session';
import { progressRepository } from '@/features/progress/repository';
import { blocksWithContext, checkpointItems, checkpointQuestion, createRecall, flashcards, recallReducer, sourceHref, type StudyLesson } from './model';
import { FormulaBody, StudyEmpty } from './StudyReference';
import { studyRepository, type PracticeCorrectness } from './repository';

type Completion = { kind: 'practice_completed' | 'revision_completed' | 'flashcards_completed'; subjectId: string; chapterId: string; metadata?: Record<string, unknown> };

export function SaveCompletion({ input, label = 'Save session' }: { input: Completion; label?: string }) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setStatus('saving');
    try {
      if (input.kind === 'revision_completed' || input.kind === 'flashcards_completed') {
        const rawMode = typeof input.metadata?.mode === 'string' ? input.metadata.mode : '';
        const mode = input.kind === 'flashcards_completed'
          ? 'flashcards'
          : rawMode === 'quick' ? 'quick' : rawMode === 'formula' ? 'formula' : rawMode === 'exam' ? 'exam' : 'detailed';
        await studyRepository.saveRevisionSession({ chapterId: input.chapterId, mode });
      }
      await progressRepository.logActivity(input);
      if (mounted.current) setStatus('saved');
    } catch {
      if (mounted.current) setStatus('error');
      busy.current = false;
    }
  }
  return <div className="study-save">
    <button className="button button--primary" disabled={status === 'saving' || status === 'saved'} onClick={() => void save()}>{status === 'saving' ? 'Saving…' : status === 'saved' ? <><Check size={18} aria-hidden="true" /> Saved to activity</> : status === 'error' ? 'Retry saving' : label}</button>
    <p className="study-hint" role="status">{status === 'error' ? 'Your session could not be saved. Check your connection and retry.' : status === 'saved' ? 'Your study activity has been recorded.' : 'Record this session in your study activity.'}</p>
  </div>;
}

export function FlashcardSession({ lessons, subjectId, chapterId }: { lessons: StudyLesson[]; subjectId: string; chapterId: string }) {
  const cards = useMemo(() => flashcards(lessons), [lessons]);
  const [state, dispatch] = useReducer(recallReducer, cards.length, createRecall);
  const prompt = useRef<HTMLHeadingElement>(null);
  const answerId = useId();
  const currentIndex = state.queue[0];
  const current = currentIndex === undefined ? undefined : cards[currentIndex];
  if (!cards.length) return <StudyEmpty kind="flashcards" />;
  const rate = (recalled: boolean) => {
    dispatch({ type: 'rate', recalled });
    requestAnimationFrame(() => prompt.current?.focus());
  };
  if (!current) return <section className="study-result" aria-labelledby="recall-finished"><h3 id="recall-finished" tabIndex={-1} ref={prompt}>Recall session complete</h3><p>You marked all {cards.length} cards as recalled across {state.reviews} reviews.</p><p className="study-hint">These are your own recall ratings. They do not automatically change mastery until there is enough practice evidence.</p><SaveCompletion input={{ kind: 'flashcards_completed', subjectId, chapterId, metadata: { cards: cards.length, reviews: state.reviews, source: 'lesson-content', mode: 'flashcards' } }} /></section>;
  return <section className="study-recall" aria-label="Flashcard session">
    <div className="study-session-meta"><span role="status">{state.recalled} of {cards.length} recalled · {state.queue.length} remaining</span><Link to={sourceHref(current.lesson.id, current.block.id)}>Source lesson</Link></div>
    <progress max={cards.length} value={state.recalled} aria-label="Cards recalled" />
    <div className="study-recall-card">
      <p className="study-hint">{current.lesson.title}</p><h3 ref={prompt} tabIndex={-1}>{current.prompt}</h3>
      <p>Bring the explanation to mind, then reveal the answer.</p>
      <button className="button button--primary" disabled={state.revealed} aria-expanded={state.revealed} aria-controls={answerId} onClick={() => dispatch({ type: 'reveal' })}>Reveal answer</button>
      <div id={answerId} className="study-recall-answer" hidden={!state.revealed}>
        {(current.block.type === 'formula' || current.block.type === 'equation') ? <FormulaBody block={current.block} /> : (current.block.type === 'definition' || current.block.type === 'keyConcept') ? <p><RichTextView value={current.block.data.content} /></p> : null}
        <div className="study-actions"><button className="button button--outline" onClick={() => rate(false)}><RotateCcw size={18} aria-hidden="true" /> Review again</button><button className="button button--primary" onClick={() => rate(true)}><Check size={18} aria-hidden="true" /> Got it</button></div>
      </div>
    </div>
  </section>;
}

type NormalizedPracticeItem = {
  lesson: StudyLesson['lesson'];
  exercise: NonNullable<StudyLesson['resources']>['exercises'][number];
};

function normalizedPracticeItems(lessons: StudyLesson[]): NormalizedPracticeItem[] {
  return lessons.flatMap((lesson) => (lesson.resources?.exercises ?? []).map((exercise) => ({ lesson: lesson.lesson, exercise })));
}

function answerText(answer: unknown): string {
  if (typeof answer === 'string') return answer;
  if (answer && typeof answer === 'object') {
    const row = answer as Record<string, unknown>;
    for (const key of ['expected', 'answer', 'value']) {
      if (typeof row[key] === 'string') return row[key] as string;
    }
    try { return JSON.stringify(answer); } catch { return ''; }
  }
  return '';
}

function NormalizedPracticeSession({ lessons, subjectId, chapterId }: { lessons: StudyLesson[]; subjectId: string; chapterId: string }) {
  const items = useMemo(() => normalizedPracticeItems(lessons), [lessons]);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, PracticeCorrectness>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState('');
  const started = useRef(Date.now());

  if (!items.length) return <StudyEmpty kind="practice questions" />;
  const current = items[index];
  if (!current) {
    const correct = Object.values(ratings).filter((value) => value === 'correct').length;
    return <section className="study-result">
      <h3>Practice session complete</h3>
      <p>{Object.keys(ratings).length} of {items.length} questions reviewed · {correct} marked correct.</p>
      <p className="study-hint">Self-ratings are stored as practice evidence; they are not treated as teacher-verified marks.</p>
      <SaveCompletion input={{ kind: 'practice_completed', subjectId, chapterId, metadata: { attempted: Object.keys(ratings).length, correct, total: items.length, source: 'normalized-practice-bank' } }} />
    </section>;
  }

  const exercise = current.exercise;
  const response = responses[exercise.id] ?? '';
  const isRevealed = revealed[exercise.id] === true;
  const rating = ratings[exercise.id];
  const solution = exercise.solution?.trim() || exercise.explanation?.trim() || answerText(exercise.answer) || 'Review the lesson explanation and compare your reasoning.';

  const rate = async (correctness: PracticeCorrectness) => {
    if (saving) return;
    setSaving(exercise.id);
    setSaveError('');
    try {
      await studyRepository.savePracticeAttempt({
        exerciseId: exercise.id,
        lessonId: current.lesson.id,
        response: { text: response },
        correctness,
        awardedMarks: correctness === 'correct' ? exercise.marks ?? null : correctness === 'incorrect' ? 0 : null,
        maxMarks: exercise.marks ?? null,
        durationSeconds: Math.round((Date.now() - started.current) / 1000),
      });
      setRatings((state) => ({ ...state, [exercise.id]: correctness }));
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save this attempt.');
    } finally {
      setSaving(null);
    }
  };

  return <section className="study-practice" aria-label="Practice question">
    <div className="study-session-meta">
      <span role="status">Question {index + 1} of {items.length}</span>
      <span>{exercise.question_type.replace(/_/g, ' ')}{exercise.marks ? ` · ${exercise.marks} marks` : ''}</span>
    </div>
    <progress value={Object.keys(ratings).length} max={items.length} aria-label="Questions reviewed" />
    <div className="study-question">
      <p className="study-hint">{current.lesson.title}</p>
      <h3>{exercise.question_text}</h3>
      <label>
        <span className="study-hint">Your answer</span>
        <textarea rows={6} value={response} onChange={(event) => setResponses((state) => ({ ...state, [exercise.id]: event.target.value }))} placeholder="Work it out in your own words before revealing the solution." />
      </label>
    </div>
    {!isRevealed ? <button className="button button--outline" onClick={() => setRevealed((state) => ({ ...state, [exercise.id]: true }))}>Reveal solution</button> : <div className="study-feedback" role="status">
      <strong>Compare your reasoning.</strong>
      <p>{solution}</p>
      {exercise.explanation && exercise.explanation !== solution ? <p>{exercise.explanation}</p> : null}
      <div className="study-actions">
        <button className="button button--outline" disabled={saving === exercise.id} onClick={() => void rate('incorrect')}>Needs review</button>
        <button className="button button--primary" disabled={saving === exercise.id} onClick={() => void rate('correct')}>I got it</button>
        <button className="button button--outline" disabled={saving === exercise.id} onClick={() => void rate('ungraded')}>Save ungraded</button>
      </div>
      {rating ? <p className="study-hint">Saved as {rating.replace('_', ' ')}.</p> : null}
      {saveError ? <p className="study-hint" role="alert">{saveError}</p> : null}
    </div>}
    <div className="study-actions">
      <button className="button button--outline" disabled={index === 0} onClick={() => setIndex((value) => Math.max(0, value - 1))}>Previous</button>
      <button className="button button--primary" onClick={() => setIndex((value) => value + 1)}>{index === items.length - 1 ? 'Finish session' : 'Next question'}</button>
    </div>
  </section>;
}

export function PracticeSession({ lessons, subjectCode, subjectId, chapterId, test = false }: { lessons: StudyLesson[]; subjectCode: string; subjectId: string; chapterId: string; test?: boolean }) {
  const items = useMemo(() => checkpointItems(lessons), [lessons]);
  const normalized = useMemo(() => normalizedPracticeItems(lessons), [lessons]);
  if (!items.length && normalized.length) return <NormalizedPracticeSession lessons={lessons} subjectId={subjectId} chapterId={chapterId} />;
  if (!items.length) return <StudyEmpty kind="concept checks" />;
  return <CheckpointPracticeSession lessons={lessons} subjectCode={subjectCode} subjectId={subjectId} chapterId={chapterId} test={test} />;
}

function CheckpointPracticeSession({ lessons, subjectCode, subjectId, chapterId, test }: { lessons: StudyLesson[]; subjectCode: string; subjectId: string; chapterId: string; test: boolean }) {
  const items = useMemo(() => checkpointItems(lessons), [lessons]);
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => createSession({ questions: items.map(checkpointQuestion), mode: test ? 'exam' : 'learn' }));
  const questionHeading = useRef<HTMLLegendElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const group = useId();
  useEffect(() => { if (state.submitted) resultHeading.current?.focus(); }, [state.submitted]);
  const current = state.questions[state.index];
  const item = items[state.index];
  if (!current || !item) return <StudyEmpty kind="concept checks" />;
  const selected = current.response?.kind === 'options' ? current.response.optionIds[0] : undefined;
  const move = (nextIndex: number) => { dispatch({ type: 'goto', index: nextIndex }); requestAnimationFrame(() => questionHeading.current?.focus()); };
  const result = state.submitted ? computeResult(state) : null;
  if (result) return <section className="study-result">
    <h3 ref={resultHeading} tabIndex={-1}>Session complete</h3><p className="type-body-lg">{result.correct} correct out of {result.total}</p>
    <p>{result.incorrect} incorrect · {result.unattempted} unanswered{result.ungraded > 0 ? ` · ${result.ungraded} ungraded` : ''}</p>
    <p className="study-hint">Review the explanations below. Checkpoint results are saved as activity; normalized question-bank attempts are stored individually.</p>
    <SaveCompletion input={{ kind: 'practice_completed', subjectId, chapterId, metadata: { correct: result.correct, total: result.total, attempted: result.attempted, mode: test ? 'test' : 'learn', source: 'lesson-checkpoints' } }} />
    <div className="study-answer-review">{items.map((entry, index) => {
      const response = state.questions[index]?.response;
      const chosen = response?.kind === 'options' ? entry.block.data.options.find((option) => option.id === response.optionIds[0]) : undefined;
      const outcome = result.evaluations[index]?.evaluation.outcome;
      return <details className="study-detail" key={entry.key}><summary>{index + 1}. {entry.block.data.question} · {chosen ? outcome === 'correct' ? 'Correct' : outcome === 'incorrect' ? 'Review' : 'Ungraded' : 'Unanswered'}</summary><p>Your answer: {chosen?.label ?? 'Not answered'}</p><p>Correct answer: {entry.block.data.options.find((option) => option.id === entry.block.data.correctOptionId)?.label}</p><p><RichTextView value={entry.block.data.explanation} /></p><Link to={sourceHref(entry.lesson.id, entry.block.id)}>Review source lesson</Link></details>;
    })}</div>
  </section>;
  const prerequisites = blocksWithContext(item.document, item.block.requires ?? []).filter((block) => block.id !== item.block.id);
  return <section className="study-practice" aria-label={test ? 'Chapter test' : 'Chapter practice'}>
    <div className="study-session-meta"><span role="status">Question {state.index + 1} of {items.length}</span><span>{state.questions.filter((question) => question.response).length} answered</span></div>
    <progress value={state.questions.filter((question) => question.response).length} max={items.length} aria-label="Questions answered" />
    {prerequisites.length > 0 && <details className="study-detail"><summary>Question context</summary><ContentRenderer document={{ schemaVersion: item.document.schemaVersion, blocks: prerequisites }} lessonId={item.lesson.id} subjectCode={subjectCode} headingOffset={2} /></details>}
    <fieldset className="study-question" disabled={current.revealed}><legend ref={questionHeading} tabIndex={-1}>{item.block.data.question}</legend>{item.block.data.options.map((option) => <div className="study-option" data-selected={selected === option.id} key={option.id}><Radio name={group} label={option.label} checked={selected === option.id} onChange={() => dispatch({ type: 'respond', response: { kind: 'options', optionIds: [option.id] } })} /></div>)}</fieldset>
    {!test && <button className="button button--outline" disabled={!selected || current.revealed} onClick={() => dispatch({ type: 'revealCurrent' })}>Check answer</button>}
    {current.revealed && <div className="study-feedback" role="status"><strong>{selected === item.block.data.correctOptionId ? 'Correct.' : 'Not quite.'}</strong><p>Correct answer: {item.block.data.options.find((option) => option.id === item.block.data.correctOptionId)?.label}</p><p><RichTextView value={item.block.data.explanation} /></p><Link to={sourceHref(item.lesson.id, item.block.id)}>Read the explanation in context</Link></div>}
    <div className="study-actions"><button className="button button--outline" disabled={state.index === 0} onClick={() => move(state.index - 1)}>Previous</button>{state.index < items.length - 1 ? <button className="button button--primary" onClick={() => move(state.index + 1)}>Next question</button> : <button className="button button--primary" onClick={() => dispatch({ type: 'submit' })}>Finish session</button>}</div>
    <nav className="study-question-nav" aria-label="Questions">{state.questions.map((question, index) => <button key={question.question.id} aria-label={`Question ${index + 1}, ${question.response ? 'answered' : 'unanswered'}`} aria-current={state.index === index ? 'step' : undefined} onClick={() => move(index)}>{index + 1}{question.response && <Check size={12} aria-hidden="true" />}</button>)}</nav>
    <p className="study-hint">{test ? 'Answers appear when you finish. Unanswered questions stay unscored.' : 'Check each answer when you are ready. You can move between questions.'} Save your activity after finishing.</p>
  </section>;
}