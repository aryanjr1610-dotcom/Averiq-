import { createContext, useContext } from 'react';
import { z } from 'zod';

import type { ContentBlock } from './content/schema';

export type ReadingMode = 'learn' | 'understand' | 'exam';

export function blockAnchor(lessonId: string, blockId: string) {
  return `lesson-${lessonId}--${blockId}`;
}

export function selectReadingBlocks(
  blocks: ContentBlock[],
  mode: ReadingMode,
) {
  if (mode === 'learn') {
    return { blocks, fallback: false };
  }

  const wanted = mode === 'understand' ? 'concept' : 'exam';

  if (!blocks.some((block) => block.tags?.includes(wanted))) {
    return { blocks, fallback: true };
  }

  const selected = new Set(
    blocks
      .filter((block) =>
        block.type === 'heading' ||
        !block.tags?.length ||
        block.tags.includes(wanted),
      )
      .map((block) => block.id),
  );

  const byId = new Map(blocks.map((block) => [block.id, block]));

  function include(id: string) {
    const block = byId.get(id);
    if (!block) return;

    for (const dependency of block.requires ?? []) {
      if (!selected.has(dependency)) {
        selected.add(dependency);
        include(dependency);
      }
    }
  }

  [...selected].forEach(include);

  return {
    blocks: blocks.filter((block) => selected.has(block.id)),
    fallback: false,
  };
}

export const ReaderReturnSchema = z.object({
  path: z.string().regex(
    /^\/(?:app\/learn\/(?:lessons|chapters)|dev\/(?:content|chapter))\/[a-f0-9-]{36}$/i,
  ),
  anchor: z.string().regex(/^lesson-[a-f0-9-]{36}--[a-zA-Z][a-zA-Z0-9_-]{0,79}$/i),
  offset: z.number().finite().min(-2000).max(2000),
  mode: z.enum(['learn', 'understand', 'exam']),
});

export type ReaderReturn = z.infer<typeof ReaderReturnSchema>;

export const BlockReadingContext = createContext({
  lessonId: '',
  blockId: '',
  mode: 'learn' as ReadingMode,
});

export const useBlockReading = () => useContext(BlockReadingContext);

export type ReadingPosition = {
  chapterId: string;
  lessonId: string;
  contentVersionId: string;
  blockId: string;
  offset: number;
};

export type LearningProgressAdapter = {
  loadPosition(chapterId: string): Promise<ReadingPosition | null>;
  savePosition(position: ReadingPosition): Promise<void>;
  markLessonComplete(lessonId: string): Promise<void>;
  isLessonComplete(lessonId: string): Promise<boolean>;
};

// No fake progress storage or fake completion button.
export const LearningProgressContext =
  createContext<LearningProgressAdapter | null>(null);

export const useLearningProgress = () => useContext(LearningProgressContext);
