import { describe, expect, it } from 'vitest';

import { AcademicImportSchema } from './import-schema';

const fixture = {
  formatVersion: 1,
  importKey: 'test-release',
  academicYear: {
    code: '2026-27',
    label: '2026–27',
    startYear: 2026,
    endYear: 2027,
  },
  board: { code: 'cbse', title: 'CBSE' },
  track: {
    code: 'cbse-senior-secondary',
    title: 'Senior secondary',
    minimumGrade: 11,
    maximumGrade: 12,
  },
  gradeLevel: 12,
  revision: 1,
  source: {
    kind: 'sample',
    name: 'Unverified test',
    url: null,
    documentReference: null,
    publicationDate: null,
  },
  combinations: [],
  legacyCatalogVersion: 'starter-2026-27-v1',
  aliases: { subjects: {}, combinations: {} },
  subjects: [{
    code: 'physics',
    title: 'Physics',
    slug: 'physics',
    position: 0,
    rules: [{ combinationCode: null, role: 'optional' }],
    courses: [],
    chapters: [],
  }],
};

describe('curriculum imports', () => {
  it('accepts an explicitly unverified sample', () => {
    expect(AcademicImportSchema.safeParse(fixture).success).toBe(true);
  });

  it('rejects duplicate subject placements', () => {
    expect(AcademicImportSchema.safeParse({
      ...fixture,
      subjects: [fixture.subjects[0], fixture.subjects[0]],
    }).success).toBe(false);
  });

  it('rejects a class outside the track', () => {
    expect(AcademicImportSchema.safeParse({
      ...fixture,
      gradeLevel: 8,
    }).success).toBe(false);
  });

  it('requires a source URL for official-source imports', () => {
    expect(AcademicImportSchema.safeParse({
      ...fixture,
      source: { ...fixture.source, kind: 'official' },
    }).success).toBe(false);
  });

  it('rejects unresolved alias targets', () => {
    expect(AcademicImportSchema.safeParse({
      ...fixture,
      aliases: {
        subjects: { old: 'missing-subject' },
        combinations: {},
      },
    }).success).toBe(false);
  });
});
