import { describe, expect, it } from 'vitest';

import { BlockSchema } from './content/schema';
import { selectReadingBlocks } from './reading';

const blocks = [
  BlockSchema.parse({
    id: 'foundation',
    type: 'paragraph',
    tags: ['concept'],
    data: { content: [{ type: 'text', text: 'Foundation.' }] },
  }),
  BlockSchema.parse({
    id: 'exam-point',
    type: 'paragraph',
    tags: ['exam'],
    requires: ['foundation'],
    data: { content: [{ type: 'text', text: 'Exam reasoning.' }] },
  }),
];

describe('reader presentations', () => {
  it('never shortens Learn', () => {
    expect(selectReadingBlocks(blocks, 'learn').blocks).toHaveLength(2);
  });

  it('retains explicit prerequisites', () => {
    expect(selectReadingBlocks(blocks, 'exam').blocks).toHaveLength(2);
  });

  it('falls back to the complete explanation without useful tags', () => {
    const untagged = [BlockSchema.parse({
      id: 'original',
      type: 'paragraph',
      data: { content: [{ type: 'text', text: 'Full explanation.' }] },
    })];

    const result = selectReadingBlocks(untagged, 'exam');
    expect(result.fallback).toBe(true);
    expect(result.blocks).toHaveLength(1);
  });
});
