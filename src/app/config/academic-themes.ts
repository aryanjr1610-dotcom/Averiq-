import {
  Atom,
  BookOpen,
  Dna,
  FlaskConical,
  Landmark,
  Sigma,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import type {
  AcademicContext,
  AcademicGroup,
  AcademicPage,
  AcademicPreset,
  AcademicStream,
  Motif,
  ResolvedAcademicTheme,
  ThemeLayer,
} from '@/types/academic-theme';

const base: Required<ThemeLayer> = {
  accent: 'ice',
  secondary: 'slate',
  motifs: ['geometry', 'contour'],
  intensity: 'normal',
};

const groups: Record<AcademicGroup, ThemeLayer> = {
  balanced: {
    motifs: ['geometry', 'contour'],
  },

  science: {
    secondary: 'mist',
    motifs: ['orbit'],
  },

  commerce: {
    accent: 'sand',
    secondary: 'slate',
    motifs: ['ledger'],
  },

  humanities: {
    accent: 'clay',
    secondary: 'sand',
    motifs: ['contour', 'timeline'],
  },
};

export const academicPresets: Record<AcademicPreset, ThemeLayer> = {
  balanced: {
    accent: 'ice',
    secondary: 'sand',
    motifs: ['geometry', 'contour', 'editorial'],
  },

  pcm: {
    accent: 'ice',
    secondary: 'mist',
    motifs: ['grid', 'wave', 'orbit'],
  },

  pcb: {
    accent: 'moss',
    secondary: 'mist',
    motifs: ['organic', 'molecule'],
  },

  pcmb: {
    accent: 'mist',
    secondary: 'moss',
    motifs: ['grid', 'organic', 'molecule'],
  },

  commerce: {
    accent: 'sand',
    secondary: 'slate',
    motifs: ['ledger', 'grid', 'wave'],
  },

  humanities: {
    accent: 'clay',
    secondary: 'sand',
    motifs: ['contour', 'timeline', 'editorial'],
  },
};

type SubjectVisual = ThemeLayer & {
  label: string;
  icon: LucideIcon;
  visualizationFamily: string;
  backgroundPreset: AcademicPreset;
};

export const subjectVisuals: Record<string, SubjectVisual> = {
  physics: {
    label: 'Physics',
    icon: Atom,
    accent: 'ice',
    secondary: 'mist',
    motifs: ['wave', 'orbit'],
    visualizationFamily: 'fields-and-vectors',
    backgroundPreset: 'pcm',
  },

  mathematics: {
    label: 'Mathematics',
    icon: Sigma,
    accent: 'slate',
    secondary: 'ice',
    motifs: ['grid', 'geometry'],
    visualizationFamily: 'graphs-and-geometry',
    backgroundPreset: 'pcm',
  },

  chemistry: {
    label: 'Chemistry',
    icon: FlaskConical,
    accent: 'mist',
    secondary: 'sand',
    motifs: ['molecule', 'orbit'],
    visualizationFamily: 'molecular-structure',
    backgroundPreset: 'pcm',
  },

  biology: {
    label: 'Biology',
    icon: Dna,
    accent: 'moss',
    secondary: 'mist',
    motifs: ['organic', 'molecule'],
    visualizationFamily: 'living-systems',
    backgroundPreset: 'pcb',
  },

  english: {
    label: 'English',
    icon: BookOpen,
    accent: 'sand',
    secondary: 'slate',
    motifs: ['editorial'],
    visualizationFamily: 'editorial-and-language',
    backgroundPreset: 'humanities',
  },

  history: {
    label: 'History',
    icon: Landmark,
    accent: 'clay',
    secondary: 'sand',
    motifs: ['contour', 'timeline'],
    visualizationFamily: 'timelines-and-maps',
    backgroundPreset: 'humanities',
  },
};

const pages: Record<AcademicPage, ThemeLayer> = {
  default: {},

  reading: {
    intensity: 'ambient',
  },

  focus: {
    intensity: 'focused',
  },

  'visual-lab': {
    intensity: 'focused',
  },

  anatomy: {
    accent: 'moss',
    motifs: ['organic'],
    intensity: 'ambient',
  },

  exam: {
    intensity: 'ambient',
  },
};

function groupForStream(
  stream?: AcademicStream,
): AcademicGroup {
  if (stream === 'commerce') return 'commerce';
  if (stream === 'humanities') return 'humanities';
  if (stream) return 'science';
  return 'balanced';
}

export function contextForPreset(
  preset: AcademicPreset,
): AcademicContext {
  if (preset === 'balanced') {
    return {
      grade: 10,
      group: 'balanced',
      page: 'default',
    };
  }

  return {
    grade: 12,
    group: groupForStream(preset),
    stream: preset,
    page: 'default',
  };
}

export function resolveAcademicTheme(
  context: AcademicContext,
): ResolvedAcademicTheme {
  const lowerSchool =
    context.grade !== undefined &&
    context.grade <= 10;

  const stream = lowerSchool ? undefined : context.stream;

  const group = lowerSchool
    ? 'balanced'
    : context.group ?? groupForStream(stream);

  const page =
    context.page ??
    (context.competitiveGoalId ? 'exam' : 'default');

  const subject = context.subjectId
    ? subjectVisuals[context.subjectId]
    : undefined;

  const layers: ThemeLayer[] = [
    base,
    groups[group],
    stream ? academicPresets[stream] : academicPresets.balanced,
    subject ?? {},
    pages[page],
  ];

  let accent = base.accent;
  let secondary = base.secondary;
  let intensity = base.intensity;
  let motifs: Motif[] = [];

  for (const layer of layers) {
    accent = layer.accent ?? accent;
    secondary = layer.secondary ?? secondary;
    intensity = layer.intensity ?? intensity;

    for (const motif of layer.motifs ?? []) {
      motifs = motifs.filter((existing) => existing !== motif);
      motifs.push(motif);
    }
  }

  // A bounded motif budget prevents decorative accumulation.
  motifs = motifs.slice(-3);

  return {
    signature: [
      group,
      stream ?? 'none',
      context.subjectId ?? 'none',
      page,
      accent,
      secondary,
      motifs.join('-'),
    ].join(':'),
    group,
    accent,
    secondary,
    motifs,
    intensity,
    page,
  };
}
