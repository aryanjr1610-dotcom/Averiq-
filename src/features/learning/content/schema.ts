import { z } from 'zod';

import { block, Id, Latex, Text } from './block-base';
import { createSubjectSchemas } from './subject-schemas';

export const CONTENT_SCHEMA_VERSION = 2;

export const SafeLink = z.string().max(2048).refine((value) => {
  if (value.startsWith('/') && !value.startsWith('//')) return true;

  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Only HTTPS links and internal paths are allowed.');

export const InlineSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    text: z.string().max(12000),
    marks: z.array(z.enum([
      'strong',
      'emphasis',
      'code',
      'subscript',
      'superscript',
    ])).max(5).default([]),
  }),

  z.object({
    type: z.literal('math'),
    latex: Latex,
    alternative: Text,
  }),

  z.object({
    type: z.literal('link'),
    text: Text,
    href: SafeLink,
  }),
]);

export const RichTextSchema = z.array(InlineSchema).max(100);

const Variables = z.array(z.object({
  symbol: z.string().min(1).max(80),
  meaning: Text,
  unit: z.string().max(100).optional(),
})).max(30);

const MathData = z.object({
  name: z.string().max(200).optional(),
  latex: Latex,
  alternative: Text,
  number: z.string().max(40).optional(),
  meaning: RichTextSchema.default([]),
  variables: Variables.default([]),
  siUnits: z.string().max(200).optional(),
  dimensions: z.string().max(200).optional(),
  conditions: z.array(Text).max(20).default([]),
  relatedFormulaIds: z.array(z.string().uuid()).max(20).default([]),
  relatedConcepts: z.array(z.object({
    title: Text,
    lessonId: z.string().uuid(),
    blockId: Id.optional(),
  })).max(15).optional(),
  derivationBlockId: Id.optional(),
});

export const Step = z.object({
  id: Id,
  title: z.string().max(200).optional(),
  latex: Latex.optional(),
  reason: RichTextSchema,
  note: z.string().max(2000).optional(),
});

const Note = z.object({
  title: z.string().min(1).max(200),
  content: RichTextSchema,
});

export const blockSchemas = {
  heading: block('heading', z.object({
    level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    text: z.string().min(1).max(240),
  })),

  paragraph: block('paragraph', z.object({ content: RichTextSchema })),
  richText: block('richText', z.object({ content: RichTextSchema })),

  definition: block('definition', Note),
  keyConcept: block('keyConcept', Note),
  callout: block('callout', Note),
  important: block('important', Note),
  commonMistake: block('commonMistake', Note),
  summary: block('summary', Note),

  examTip: block('examTip', Note.extend({
    contexts: z.array(z.string().max(80)).max(10).default([]),
  })),

  list: block('list', z.object({
    ordered: z.boolean().default(false),
    items: z.array(RichTextSchema).min(1).max(100),
  })),

  table: block('table', z.object({
    caption: Text,
    headers: z.array(Text).min(1).max(12),
    rows: z.array(z.array(RichTextSchema).max(12)).max(100),
  }).superRefine((value, context) => {
    value.rows.forEach((row, index) => {
      if (row.length !== value.headers.length) {
        context.addIssue({
          code: 'custom',
          path: ['rows', index],
          message: 'Every row must match the header count.',
        });
      }
    });
  })),

  quoteReference: block('quoteReference', z.object({
    workTitle: Text,
    sectionReference: Text,
    excerpt: z.string().max(600).optional(),
    rightsBasis: z.enum([
      'original',
      'public-domain',
      'licensed',
      'reference-only',
    ]),
    credit: Text,
    licenseReference: z.string().max(2048).optional(),
    explanation: RichTextSchema,
    vocabulary: z.array(z.object({
      word: Text,
      meaning: Text,
    })).max(30).default([]),
    themes: z.array(Text).max(20).default([]),
    literaryDevices: z.array(Text).max(20).default([]),
  }).superRefine((value, context) => {
    if (value.rightsBasis === 'reference-only' && value.excerpt) {
      context.addIssue({
        code: 'custom',
        path: ['excerpt'],
        message: 'Reference-only material must not contain an excerpt.',
      });
    }

    if (value.rightsBasis === 'licensed' && !value.licenseReference) {
      context.addIssue({
        code: 'custom',
        path: ['licenseReference'],
        message: 'Licensed excerpts require a permission/license reference.',
      });
    }
  })),

  equation: block('equation', MathData),
  formula: block('formula', MathData),

  derivation: block('derivation', z.object({
    title: Text,
    steps: z.array(Step).min(1).max(40),
    result: Latex.optional(),
    startingConditions: RichTextSchema.optional(),
    assumptions: z.array(Text).max(20).optional(),
    interpretation: RichTextSchema.optional(),
    examNote: Text.optional(),
  })),

  stepByStep: block('stepByStep', z.object({
    title: Text,
    steps: z.array(Step).min(1).max(40),
  })),

  workedExample: block('workedExample', z.object({
    title: Text,
    problem: RichTextSchema,
    given: z.array(z.object({
      symbol: Text,
      value: Text,
      unit: z.string().max(100).optional(),
    })).max(30),
    find: Text,
    concept: RichTextSchema,
    steps: z.array(Step).min(1).max(40),
    answer: z.object({
      latex: Latex,
      alternative: Text,
      unit: z.string().max(100).optional(),
    }),
    examNote: z.string().max(2000).optional(),
  })),

  image: block('image', z.object({
    assetId: z.string().uuid(),
    alt: Text,
    caption: z.string().max(2000).optional(),
    aspectRatio: z.number().positive().max(5).optional(),
  })),

  diagram2d: block('diagram2d', z.object({
    diagramId: Id,
    title: Text,
    caption: Text,
    labels: z.array(Text).max(30).default([]),
    fallbackAssetId: z.string().uuid().optional(),
  })),

  visualizationReference: block('visualizationReference', z.object({
    resourceId: Id,
    title: Text,
    description: Text,
    visualizationFamily: z.enum([
      'physics', 'mathematics', 'chemistry',
      'biology', 'anatomy', 'geography', 'other',
    ]),
    fallbackAssetId: z.string().uuid().optional(),
  })),

  timeline: block('timeline', z.object({
    title: Text,
    events: z.array(z.object({
      label: Text,
      title: Text,
      explanation: RichTextSchema,
    })).min(1).max(50),
  })),

  comparison: block('comparison', z.object({
    title: Text,
    columns: z.array(z.object({
      title: Text,
      points: z.array(RichTextSchema).min(1).max(30),
    })).min(2).max(4),
  })),

  checkpoint: block('checkpoint', z.object({
    question: Text,
    options: z.array(z.object({
      id: Id,
      label: Text,
    })).min(2).max(5),
    correctOptionId: Id,
    explanation: RichTextSchema,
  }).superRefine((value, context) => {
    const ids = value.options.map((option) => option.id);

    if (
      new Set(ids).size !== ids.length ||
      !ids.includes(value.correctOptionId)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Checkpoint options must be unique and contain the answer.',
      });
    }
  })),
};

export const GenericBlockSchema = z.discriminatedUnion('type', [
  blockSchemas.heading,
  blockSchemas.paragraph,
  blockSchemas.richText,
  blockSchemas.definition,
  blockSchemas.keyConcept,
  blockSchemas.callout,
  blockSchemas.important,
  blockSchemas.commonMistake,
  blockSchemas.summary,
  blockSchemas.examTip,
  blockSchemas.list,
  blockSchemas.table,
  blockSchemas.quoteReference,
  blockSchemas.equation,
  blockSchemas.formula,
  blockSchemas.derivation,
  blockSchemas.stepByStep,
  blockSchemas.workedExample,
  blockSchemas.image,
  blockSchemas.diagram2d,
  blockSchemas.visualizationReference,
  blockSchemas.timeline,
  blockSchemas.comparison,
  blockSchemas.checkpoint,
]);

export const subjectBlockSchemas = createSubjectSchemas(RichTextSchema, Step);

export const SubjectBlockSchema = z.discriminatedUnion('type', [
  subjectBlockSchemas.quantity,
  subjectBlockSchemas.proof,
  subjectBlockSchemas.graphReference,
  subjectBlockSchemas.reaction,
  subjectBlockSchemas.experiment,
  subjectBlockSchemas.biologicalProcess,
  subjectBlockSchemas.structureFunction,
  subjectBlockSchemas.literaryDevice,
  subjectBlockSchemas.vocabulary,
  subjectBlockSchemas.examAnswerGuidance,
]);

export const BlockSchema = z.union([
  GenericBlockSchema,
  SubjectBlockSchema,
]);

export type GenericBlock = z.infer<typeof GenericBlockSchema>;
export type SubjectBlock = z.infer<typeof SubjectBlockSchema>;

export const DocumentSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  blocks: z.array(BlockSchema).min(1).max(300),
}).superRefine((document, context) => {
  const ids = new Set<string>();
  let previousHeading = 1;

  document.blocks.forEach((item, index) => {
    if (ids.has(item.id)) {
      context.addIssue({
        code: 'custom',
        path: ['blocks', index, 'id'],
        message: 'Block IDs must be unique within a document.',
      });
    }

    ids.add(item.id);

    if (item.type === 'heading') {
      if (item.data.level > previousHeading + 1) {
        context.addIssue({
          code: 'custom',
          path: ['blocks', index],
          message: 'Heading levels must not skip a level.',
        });
      }

      previousHeading = item.data.level;
    }
  });

  for (const item of document.blocks) {
    for (const requiredId of item.requires ?? []) {
      if (!ids.has(requiredId)) {
        context.addIssue({
          code: 'custom',
          message: `Missing prerequisite block: ${requiredId}`,
        });
      }
    }

    if (
      (item.type === 'formula' || item.type === 'equation') &&
      item.data.derivationBlockId &&
      !ids.has(item.data.derivationBlockId)
    ) {
      context.addIssue({
        code: 'custom',
        message: `Missing derivation: ${item.data.derivationBlockId}`,
      });
    }
  }
});

export const DocumentEnvelope = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  blocks: z.array(z.unknown()).max(300),
});

export type Inline = z.infer<typeof InlineSchema>;
export type RichText = z.infer<typeof RichTextSchema>;
export type ContentBlock = z.infer<typeof BlockSchema>;
export type LearningDocument = z.infer<typeof DocumentSchema>;

export function collectAssetIds(document: LearningDocument): string[] {
  const result = new Set<string>();

  for (const item of document.blocks) {
    if (item.type === 'image') result.add(item.data.assetId);

    if (
      (item.type === 'diagram2d' ||
        item.type === 'visualizationReference') &&
      item.data.fallbackAssetId
    ) {
      result.add(item.data.fallbackAssetId);
    }
  }

  return [...result];
}
