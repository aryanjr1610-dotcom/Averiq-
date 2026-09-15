import { describe, expect, it } from 'vitest';

import {
  curriculumVisualId,
  curriculumVisualSubjectCodes,
  ensureCurriculumVisual,
  inferAdaptiveVisualFamily,
} from './curriculum';
import { visualizationDefinition } from './registry';

const liveSubjectCodes = [
  'accountancy', 'accounts', 'arts-education', 'biology', 'business-studies',
  'chemistry', 'commerce', 'commercial-studies', 'computer-applications',
  'computer-science', 'computer-studies', 'economics', 'english', 'english-core',
  'entrepreneurship', 'geography', 'hindi', 'history', 'history-civics',
  'informatics-practices', 'mathematics', 'physical-education', 'physics',
  'political-science', 'psychology', 'sanskrit', 'science', 'second-language',
  'social-science', 'sociology',
] as const;

describe('curriculum visual coverage', () => {
  it('has an explicit subject default for every subject code currently in the curriculum database', () => {
    const supported = new Set(curriculumVisualSubjectCodes);
    for (const code of liveSubjectCodes) expect(supported.has(code), code).toBe(true);
  });

  it('resolves every subject to an installed or adaptive visualization', () => {
    for (const subjectCode of liveSubjectCodes) {
      const id = curriculumVisualId({
        subjectCode,
        lessonTitle: 'Foundations and applications',
        topicTitle: 'Foundations and applications',
      });

      expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/);
      expect(visualizationDefinition(id), `${subjectCode}: ${id}`).not.toBeNull();
    }
  });

  it('routes known rich topics to dedicated visuals', () => {
    expect(curriculumVisualId({ subjectCode: 'physics', lessonTitle: 'Electric field and point charges' })).toBe('electric-field-2d');
    expect(curriculumVisualId({ subjectCode: 'mathematics', lessonTitle: 'Sine and sinusoidal functions' })).toBe('sine-graph');
    expect(curriculumVisualId({ subjectCode: 'biology', lessonTitle: 'The animal cell' })).toBe('animal-cell-overview');
    expect(curriculumVisualId({ subjectCode: 'biology', lessonTitle: 'Heart and circulation' })).toBe('anatomy-heart-3d');
  });

  it('uses topic-aware families for major visual domains', () => {
    expect(inferAdaptiveVisualFamily({ subjectCode: 'biology', lessonTitle: 'Molecular basis', topicTitle: 'Genetics and inheritance' })).toBe('biology-genetics');
    expect(inferAdaptiveVisualFamily({ subjectCode: 'geography', lessonTitle: 'Atmosphere', topicTitle: 'Climate and weather' })).toBe('geography-earth');
    expect(inferAdaptiveVisualFamily({ subjectCode: 'history', lessonTitle: 'Nationalism', topicTitle: 'National movements' })).toBe('history-timeline');
    expect(inferAdaptiveVisualFamily({ subjectCode: 'computer-science', lessonTitle: 'Algorithms' })).toBe('computing-flow');
  });

  it('injects one runtime visual without mutating an existing explicit visual', () => {
    const base = {
      schemaVersion: 2,
      blocks: [
        { id: 'intro', type: 'heading', data: { level: 2, text: 'Introduction' } },
        { id: 'body', type: 'paragraph', data: { content: [{ type: 'text', text: 'Explanation', marks: [] }] } },
      ],
    };

    const decorated = ensureCurriculumVisual(base, {
      subjectCode: 'geography',
      lessonTitle: 'Climate',
      topicTitle: 'Climate and weather',
    }) as typeof base & { blocks: Array<Record<string, unknown>> };

    expect(decorated).not.toBe(base);
    expect(decorated.blocks.filter((block) => block.type === 'visualizationReference')).toHaveLength(1);
    expect(base.blocks).toHaveLength(2);

    const explicit = {
      ...base,
      blocks: [
        ...base.blocks,
        {
          id: 'existing_visual',
          type: 'visualizationReference',
          data: {
            resourceId: 'sine-graph',
            title: 'Graph',
            description: 'Existing visual',
            visualizationFamily: 'mathematics',
          },
        },
      ],
    };

    expect(ensureCurriculumVisual(explicit, {
      subjectCode: 'mathematics',
      lessonTitle: 'Functions',
    })).toBe(explicit);
  });
});
