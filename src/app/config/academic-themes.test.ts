import { describe, expect, it } from 'vitest';

import {
  contextForPreset,
  resolveAcademicTheme,
} from './academic-themes';

describe('academic theme resolution', () => {
  it('uses balanced atmosphere for Classes 6–10', () => {
    const theme = resolveAcademicTheme({
      grade: 8,
      stream: 'pcm',
    });

    expect(theme.group).toBe('balanced');
    expect(theme.motifs).toContain('editorial');
  });

  it('keeps PCMB structural and organic', () => {
    const theme = resolveAcademicTheme(
      contextForPreset('pcmb'),
    );

    expect(theme.motifs).toContain('grid');
    expect(theme.motifs).toContain('organic');
    expect(theme.motifs).toContain('molecule');
  });

  it('applies subject context after the stream', () => {
    const theme = resolveAcademicTheme({
      grade: 12,
      stream: 'pcm',
      subjectId: 'biology',
    });

    expect(theme.accent).toBe('moss');
    expect(theme.motifs).toContain('organic');
  });

  it('calms reading pages', () => {
    const theme = resolveAcademicTheme({
      grade: 12,
      stream: 'pcm',
      page: 'reading',
    });

    expect(theme.intensity).toBe('ambient');
  });

  it('removes decorative intensity in focus context', () => {
    const theme = resolveAcademicTheme({
      page: 'focus',
    });

    expect(theme.intensity).toBe('focused');
  });

  it('uses exam context without creating a separate brand', () => {
    const theme = resolveAcademicTheme({
      grade: 12,
      stream: 'pcb',
      competitiveGoalId: 'neet',
    });

    expect(theme.page).toBe('exam');
    expect(theme.accent).toBe('moss');
    expect(theme.intensity).toBe('ambient');
  });

  it('handles unknown subject identifiers safely', () => {
    const theme = resolveAcademicTheme({
      subjectId: 'future-subject',
    });

    expect(theme.motifs.length).toBeLessThanOrEqual(3);
    expect(theme.accent).toBe('ice');
  });
});
