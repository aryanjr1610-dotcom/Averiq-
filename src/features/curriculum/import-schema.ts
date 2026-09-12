import { z } from 'zod';

import { DocumentSchema } from '../learning/content/schema';

const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const Title = z.string().trim().min(1).max(240);
const Position = z.number().int().nonnegative();

const Lesson = z.object({
  key: Slug,
  title: Title,
  slug: Slug,
  position: Position,
  lessonType: Slug.default('concept'),
  estimatedMinutes: z.number().int().positive().max(240).optional(),
  contentVersion: z.number().int().positive(),
  authorSource: Title,
  document: DocumentSchema,
});

const Topic = z.object({
  key: Slug,
  title: Title,
  slug: Slug,
  position: Position,
  lessons: z.array(Lesson).max(100),
});

const Chapter = z.object({
  key: Slug,
  title: Title,
  slug: Slug,
  chapterNumber: z.string().max(30).optional(),
  position: Position,
  description: z.string().max(4000).default(''),
  estimatedMinutes: z.number().int().positive().optional(),
  topics: z.array(Topic).max(100),
});

export const AcademicImportSchema = z.object({
  formatVersion: z.literal(1),
  importKey: Slug,

  academicYear: z.object({
    code: z.string().regex(/^\d{4}-\d{2}$/),
    label: Title,
    startYear: z.number().int(),
    endYear: z.number().int(),
  }),

  board: z.object({
    code: Slug,
    title: Title,
  }),

  track: z.object({
    code: Slug,
    title: Title,
    minimumGrade: z.number().int().min(6).max(12),
    maximumGrade: z.number().int().min(6).max(12),
  }),

  gradeLevel: z.number().int().min(6).max(12),
  revision: z.number().int().positive(),

  source: z.object({
    kind: z.enum(['sample', 'official']),
    name: Title,
    url: z.string().url().startsWith('https://').nullable(),
    documentReference: z.string().max(2000).nullable(),
    publicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  }),

  combinations: z.array(z.object({
    code: Slug,
    title: Title,
    streamCode: Slug,
    streamTitle: Title,
  })).max(100),

  extraSubjects: z.array(z.object({
    code: Slug,
    title: Title,
  })).default([]),

  legacyCatalogVersion: z.string().min(1),

  aliases: z.object({
    subjects: z.record(z.string(), Slug),
    combinations: z.record(z.string(), Slug),
  }),

  assets: z.array(z.object({
    id: z.string().uuid(),
    key: Slug,
    objectPath: z.string().min(1).max(500),
    alt: Title,
    credit: Title,
    licenseReference: z.string().min(1).max(2000),
  })).max(100).default([]),

  subjects: z.array(z.object({
    code: Slug,
    title: Title,
    slug: Slug,
    position: Position,

    rules: z.array(z.object({
      combinationCode: Slug.nullable(),
      role: z.enum(['required', 'elective', 'optional', 'additional']),
    })).min(1),

    courses: z.array(z.object({
      key: Slug,
      title: Title,
      slug: Slug,
      position: Position,
      chapters: z.array(Chapter).max(100),
    })).max(30).default([]),

    chapters: z.array(Chapter).max(100).default([]),
  })).min(1).max(100),
}).superRefine((input, context) => {
  function unique(
    values: Array<string | number>,
    label: string,
  ) {
    if (new Set(values).size !== values.length) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate ${label}.`,
      });
    }
  }

  function siblings(
    rows: Array<{ key: string; slug: string; position: number }>,
    label: string,
  ) {
    unique(rows.map((row) => row.key), `${label} keys`);
    unique(rows.map((row) => row.slug), `${label} slugs`);
    unique(rows.map((row) => row.position), `${label} positions`);
  }

  const year = input.academicYear;

  if (
    year.endYear !== year.startYear + 1 ||
    year.code !== `${year.startYear}-${String(year.endYear).slice(-2)}`
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Academic-year code and boundaries disagree.',
    });
  }

  if (
    input.gradeLevel < input.track.minimumGrade ||
    input.gradeLevel > input.track.maximumGrade
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Grade falls outside the selected track.',
    });
  }

  if (input.source.kind === 'official' && !input.source.url) {
    context.addIssue({
      code: 'custom',
      message: 'Official-source imports require a source URL.',
    });
  }

  unique(input.subjects.map((row) => row.code), 'subject codes');
  unique(input.subjects.map((row) => row.slug), 'subject slugs');
  unique(input.subjects.map((row) => row.position), 'subject positions');
  unique(input.combinations.map((row) => row.code), 'combination codes');

  const subjects = new Set([
    ...input.subjects.map((row) => row.code),
    ...input.extraSubjects.map((row) => row.code),
  ]);

  const combinations = new Set(
    input.combinations.map((row) => row.code),
  );

  for (const code of Object.values(input.aliases.subjects)) {
    if (!subjects.has(code)) {
      context.addIssue({
        code: 'custom',
        message: `Unknown subject alias target: ${code}`,
      });
    }
  }

  for (const code of Object.values(input.aliases.combinations)) {
    if (!combinations.has(code)) {
      context.addIssue({
        code: 'custom',
        message: `Unknown combination alias target: ${code}`,
      });
    }
  }

  for (const subject of input.subjects) {
    siblings(subject.courses, 'course');

    const chapters = [
      ...subject.chapters,
      ...subject.courses.flatMap((course) => course.chapters),
    ];

    siblings(chapters, 'chapter');

    unique(
      subject.rules.map((rule) => rule.combinationCode ?? '*'),
      'subject rules',
    );

    for (const rule of subject.rules) {
      if (
        rule.combinationCode &&
        !combinations.has(rule.combinationCode)
      ) {
        context.addIssue({
          code: 'custom',
          message: `Unknown combination: ${rule.combinationCode}`,
        });
      }
    }

    for (const chapter of chapters) {
      siblings(chapter.topics, 'topic');

      for (const topic of chapter.topics) {
        siblings(topic.lessons, 'lesson');
      }
    }
  }
});

export type AcademicImport = z.infer<typeof AcademicImportSchema>;
