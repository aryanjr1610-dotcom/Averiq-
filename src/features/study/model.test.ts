import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/features/curriculum/model';
import { createSession, computeResult, sessionReducer } from '@/features/competitive/session';
import { checkpointItems, checkpointQuestion, createRecall, flashcards, formulaItems, parseStudyDocument, recallReducer, revisionBlocks, sourceHref } from './model';

const lesson = { id: 'lesson-one', title: 'Motion' } as Lesson;
const text = (value: string) => [{ type: 'text', text: value }];
const source = {
  schemaVersion: 2,
  blocks: [
    { id: 'intro', type: 'paragraph', data: { content: text('Use consistent units.') } },
    { id: 'definition', type: 'definition', data: { title: 'Speed', content: text('Distance per unit time.') } },
    { id: 'formula', type: 'formula', requires: ['intro'], data: { name: 'Average speed', latex: 'v=d/t', alternative: 'Speed equals distance divided by time', derivationBlockId: 'derivation' } },
    { id: 'derivation', type: 'derivation', data: { title: 'Average speed', steps: [{ id: 'step', reason: text('Divide total distance by elapsed time.') }] } },
    { id: 'summary', type: 'summary', data: { title: 'Remember', content: text('Speed is scalar.') } },
    { id: 'check', type: 'checkpoint', data: { question: 'Which is scalar?', options: [{ id: 'speed', label: 'Speed' }, { id: 'velocity', label: 'Velocity' }], correctOptionId: 'speed', explanation: text('Speed has magnitude only.') } },
  ],
};

describe('published study material', () => {
  const document = parseStudyDocument(source);
  const lessons = [{ lesson, document }];
  it('keeps context and derivation dependencies in source order for quick revision', () => {
    expect(revisionBlocks(document, true).map((item) => item.id)).toEqual(['intro', 'formula', 'derivation', 'summary']);
    expect(revisionBlocks(document, false).map((item) => item.id)).toContain('definition');
  });
  it('terminates on cyclic dependencies without duplicating blocks', () => {
    const cyclic = parseStudyDocument({ schemaVersion: 2, blocks: [
      { id: 'first', type: 'summary', requires: ['second'], data: { title: 'Summary', content: text('First.') } },
      { id: 'second', type: 'paragraph', requires: ['first'], data: { content: text('Second.') } },
    ] });
    expect(revisionBlocks(cyclic, true).map((item) => item.id)).toEqual(['first', 'second']);
  });
  it('rejects invalid stored answer keys and broken prerequisites', () => {
    expect(() => parseStudyDocument({ schemaVersion: 2, blocks: [{ ...source.blocks[5], data: { ...source.blocks[5]!.data, correctOptionId: 'missing' } }] })).toThrow();
    expect(() => parseStudyDocument({ schemaVersion: 2, blocks: [source.blocks[2]] })).toThrow();
  });
  it('rejects duplicate block IDs instead of grading ambiguous content', () => {
    expect(() => parseStudyDocument({ schemaVersion: 2, blocks: [source.blocks[5], source.blocks[5]] })).toThrow();
  });
  it('creates recall prompts only for self-contained authored definitions and named formulas', () => {
    expect(flashcards(lessons).map((item) => item.prompt)).toEqual(['Explain Speed']);
    expect(formulaItems(lessons)[0]!.block.data.latex).toBe('v=d/t');
  });
  it('namespaces repeated question IDs by their lesson', () => {
    const entries = checkpointItems([...lessons, { lesson: { ...lesson, id: 'lesson-two' }, document }]);
    expect(new Set(entries.map((item) => checkpointQuestion(item).id)).size).toBe(2);
  });
  it('grades authored answers through the existing session engine and keeps blanks unscored', () => {
    const questions = checkpointItems([...lessons, { lesson: { ...lesson, id: 'lesson-two' }, document }]).map(checkpointQuestion);
    let state = createSession({ questions, mode: 'exam' });
    state = sessionReducer(state, { type: 'respond', response: { kind: 'options', optionIds: ['speed'] } });
    state = sessionReducer(state, { type: 'revealCurrent' });
    expect(state.questions[0]!.revealed).toBe(false);
    state = sessionReducer(state, { type: 'submit' });
    expect(computeResult(state)).toMatchObject({ correct: 1, total: 2, unattempted: 1, score: 1 });
  });
  it('returns to the exact source block in the reader', () => {
    expect(sourceHref('lesson-one', 'formula')).toBe('/app/learn/lessons/lesson-one#lesson-lesson-one--formula');
  });
});

describe('recall queue', () => {
  it('requires revealing before rating and reschedules missed cards without inflating progress', () => {
    let state = createRecall(2);
    expect(recallReducer(state, { type: 'rate', recalled: true })).toBe(state);
    state = recallReducer(state, { type: 'reveal' });
    state = recallReducer(state, { type: 'rate', recalled: false });
    expect(state).toMatchObject({ queue: [1, 0], recalled: 0, reviews: 1, revealed: false });
    for (let i = 0; i < 2; i++) {
      state = recallReducer(state, { type: 'reveal' });
      state = recallReducer(state, { type: 'rate', recalled: true });
    }
    expect(state).toMatchObject({ queue: [], recalled: 2, reviews: 3 });
    expect(recallReducer(state, { type: 'rate', recalled: true })).toBe(state);
  });
});
