import { DocumentSchema, type ContentBlock, type LearningDocument, type RichText } from '@/features/learning/content/schema';
import { blockAnchor } from '@/features/learning/reading';
import type { Lesson } from '@/features/curriculum/model';
import type { BridgeQuestion } from '@/features/competitive/practice-bridge';

export type StudyMode = 'revision' | 'quick' | 'formulas' | 'flashcards' | 'practice';
export type StudyLesson = { lesson: Lesson; document: LearningDocument };
export type FormulaBlock = Extract<ContentBlock, { type: 'formula' | 'equation' }>;
export type CheckBlock = Extract<ContentBlock, { type: 'checkpoint' }>;
export type StudyItem<T extends ContentBlock = ContentBlock> = { key: string; lesson: Lesson; block: T; document: LearningDocument };
export type Flashcard = StudyItem & { prompt: string };

export function parseStudyDocument(content: unknown): LearningDocument {
  // The source's references, unique IDs and answer keys must all validate.
  return DocumentSchema.parse(content);
}

export function richTextPlain(value: RichText): string {
  return value.map((part) => part.type === 'math' ? part.alternative : part.text).join('');
}

export function sourceHref(lessonId: string, blockId?: string): string {
  return `/app/learn/lessons/${lessonId}${blockId ? `#${blockAnchor(lessonId, blockId)}` : ''}`;
}

export function studyItems(lessons: StudyLesson[]): StudyItem[] {
  return lessons.flatMap(({ lesson, document }) => document.blocks.map((block) => ({ key: `${lesson.id}:${block.id}`, lesson, document, block })));
}

export function formulaItems(lessons: StudyLesson[]): StudyItem<FormulaBlock>[] {
  return studyItems(lessons).flatMap((item) => item.block.type === 'formula' || item.block.type === 'equation' ? [{ ...item, block: item.block }] : []);
}

export function checkpointItems(lessons: StudyLesson[]): StudyItem<CheckBlock>[] {
  return studyItems(lessons).flatMap((item) => item.block.type === 'checkpoint' ? [{ ...item, block: item.block }] : []);
}

export function flashcards(lessons: StudyLesson[]): Flashcard[] {
  return studyItems(lessons).flatMap((item) => {
    const block = item.block;
    if (block.requires?.length) return []; // Standalone recall must not omit required context.
    if ((block.type === 'definition' || block.type === 'keyConcept') && richTextPlain(block.data.content).trim()) {
      return [{ ...item, prompt: `Explain ${block.data.title}` }];
    }
    if ((block.type === 'formula' || block.type === 'equation') && block.data.name) {
      return [{ ...item, prompt: `Recall ${block.data.name}` }];
    }
    return [];
  });
}

/** Preserve dependency closure and source ordering even in condensed reading. */
export function revisionBlocks(document: LearningDocument, quick: boolean): ContentBlock[] {
  const types = new Set(quick
    ? ['summary', 'formula', 'equation', 'commonMistake']
    : ['summary', 'definition', 'keyConcept', 'important', 'commonMistake', 'formula', 'equation', 'examTip']);
  return blocksWithContext(document, document.blocks.filter((block) => types.has(block.type) || (!quick && block.tags?.includes('revision'))).map((block) => block.id));
}

export function blocksWithContext(document: LearningDocument, ids: string[]): ContentBlock[] {
  const selected = new Set(ids);
  const byId = new Map(document.blocks.map((block) => [block.id, block]));
  const addDependencies = (id: string) => {
    const block = byId.get(id);
    if (!block) return;
    const dependencies = [...(block.requires ?? [])];
    if ((block.type === 'formula' || block.type === 'equation') && block.data.derivationBlockId) dependencies.push(block.data.derivationBlockId);
    for (const dependency of dependencies) {
      if (selected.has(dependency)) continue;
      selected.add(dependency);
      addDependencies(dependency);
    }
  };
  for (const id of [...selected]) addDependencies(id);
  return document.blocks.filter((block) => selected.has(block.id));
}

export function checkpointQuestion(item: StudyItem<CheckBlock>): BridgeQuestion {
  return {
    id: item.key, type: 'mcq', prompt: item.block.data.question,
    options: item.block.data.options.map((option) => ({ id: option.id, text: option.label })),
    answer: { optionIds: [item.block.data.correctOptionId] },
    lessonId: item.lesson.id, marks: 1, negativeMarks: 0,
  };
}

export type RecallState = { queue: number[]; recalled: number; reviews: number; revealed: boolean };
export type RecallAction = { type: 'reveal' } | { type: 'rate'; recalled: boolean };
export function createRecall(count: number): RecallState {
  return { queue: Array.from({ length: count }, (_, index) => index), recalled: 0, reviews: 0, revealed: false };
}
export function recallReducer(state: RecallState, action: RecallAction): RecallState {
  if (!state.queue.length) return state;
  if (action.type === 'reveal') return { ...state, revealed: true };
  if (!state.revealed) return state;
  const [current, ...remaining] = state.queue;
  if (current === undefined) return state;
  return { queue: action.recalled ? remaining : [...remaining, current], recalled: state.recalled + Number(action.recalled), reviews: state.reviews + 1, revealed: false };
}
