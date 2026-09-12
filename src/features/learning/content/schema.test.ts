import { describe, expect, it } from 'vitest';

import {
  BlockSchema,
  DocumentEnvelope,
  DocumentSchema,
  SafeLink,
} from './schema';

const paragraph = {
  id: 'intro',
  type: 'paragraph',
  data: {
    content: [{ type: 'text', text: 'Original explanation.' }],
  },
};

describe('learning content validation', () => {
  it('accepts a structured document', () => {
    expect(DocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [paragraph],
    }).success).toBe(true);
  });

  it('rejects duplicate block IDs', () => {
    expect(DocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [paragraph, paragraph],
    }).success).toBe(false);
  });

  it('rejects unsafe links', () => {
    expect(SafeLink.safeParse('javascript:alert(1)').success).toBe(false);
    expect(SafeLink.safeParse('//untrusted.example').success).toBe(false);
    expect(SafeLink.safeParse('https://example.org/reference').success).toBe(true);
  });

  it('rejects an invalid equation block', () => {
    expect(BlockSchema.safeParse({
      id: 'equation',
      type: 'equation',
      data: { latex: '' },
    }).success).toBe(false);
  });

  it('rejects heading-level jumps', () => {
    expect(DocumentSchema.safeParse({
      schemaVersion: 1,
      blocks: [{
        id: 'jump',
        type: 'heading',
        data: { level: 4, text: 'Skipped levels' },
      }],
    }).success).toBe(false);
  });

  it('rejects reference-only content containing an excerpt', () => {
    expect(BlockSchema.safeParse({
      id: 'reference',
      type: 'quoteReference',
      data: {
        workTitle: 'Referenced work',
        sectionReference: 'Section 1',
        excerpt: 'Not permitted by this record.',
        rightsBasis: 'reference-only',
        credit: 'Reference metadata',
        explanation: [],
      },
    }).success).toBe(false);
  });

  it('allows the runtime envelope to isolate unknown blocks', () => {
    const value = {
      schemaVersion: 1,
      blocks: [{ id: 'future', type: 'futureBlock', data: {} }],
    };

    expect(DocumentEnvelope.safeParse(value).success).toBe(true);
    expect(DocumentSchema.safeParse(value).success).toBe(false);
  });

  it('rejects unsupported document schema versions', () => {
    expect(DocumentEnvelope.safeParse({
      schemaVersion: 99,
      blocks: [],
    }).success).toBe(false);
  });
});
