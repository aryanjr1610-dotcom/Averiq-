import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, RotateCcw } from 'lucide-react';
import { Radio } from '@/components/ui/Input';
import { ContentRenderer, RichTextView } from '@/features/learning/content/ContentRenderer';
import { createSession, sessionReducer, computeResult } from '@/features/competitive/session';
import { progressRepository } from '@/features/progress/repository';
import { blocksWithContext, checkpointItems, checkpointQuestion, createRecall, flashcards, recallReducer, sourceHref, type StudyLesson } from './model';
import { FormulaBody, StudyEmpty } from './StudyReference';

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
    // Keep keyboard focus at the next prompt rather than a removed rating button.
    requestAnimationFrame(() => prompt.current?.focus());
  };
  if (!current) return <section className="study-result" aria-labelledby="recall-finished"><h3 id="recall-finished" tabIndex={-1} ref={prompt}>Recall session complete</h3><p>You marked all {cards.length} cards as recalled across {state.reviews} reviews.</p><p className="study-hint">These are your own recall ratings. They do not change your mastery score.</p><SaveCompletion input={{ kind: 'flashcards_completed', subjectId, chapterId, metadata: { cards: cards.length, reviews: state.reviews, source: 'lesson-content' } }} /></section>;
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

export function PracticeSession({ lessons, subjectCode, subjectId, chapterId, test = false }: { lessons: StudyLesson[]; subjectCode: string; subjectId: string; chapterId: string; test?: boolean }) {
  const items = useMemo(() => checkpointItems(lessons), [lessons]);
  const [state, dispatch] = useReducer(sessionReducer, undefined, () => createSession({ questions: items.map(checkpointQuestion), mode: test ? 'exam' : 'learn' }));
  const questionHeading = useRef<HTMLLegendElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const group = useId();
  useEffect(() => { if (state.submitted) resultHeading.current?.focus(); }, [state.submitted]);
  if (!items.length) return <StudyEmpty kind="concept checks" />;
  const current = state.questions[state.index];
  const item = items[state.index];
  if (!current || !item) return <StudyEmpty kind="concept checks" />;
  const selected = current.response?.kind === 'options' ? current.response.optionIds[0] : undefined;
  const move = (index: number) => { dispatch({ type: 'goto', index }); requestAnimationFrame(() => questionHeading.current?.focus()); };
  const result = state.submitted ? computeResult(state) : null;
  if (result) return <section className="study-result">
    <h3 ref={resultHeading} tabIndex={-1}>Session complete</h3><p className="type-body-lg">{result.correct} correct out of {result.total}</p>
    <p>{result.incorrect} incorrect · {result.unattempted} unanswered{result.ungraded > 0 ? ` · ${result.ungraded} ungraded` : ''}</p>
    <p className="study-hint">Review the explanations below. This chapter check does not change your mastery score.</p>
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
