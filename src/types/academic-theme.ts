import type { GradeLevel } from './domain';

export type AcademicGroup =
  | 'balanced'
  | 'science'
  | 'commerce'
  | 'humanities';

export type AcademicStream =
  | 'pcm'
  | 'pcb'
  | 'pcmb'
  | 'commerce'
  | 'humanities';

export type AcademicPreset =
  | 'balanced'
  | AcademicStream;

export type Motif =
  | 'geometry'
  | 'grid'
  | 'wave'
  | 'orbit'
  | 'organic'
  | 'molecule'
  | 'contour'
  | 'ledger'
  | 'editorial'
  | 'timeline';

export type AcademicTone =
  | 'ice'
  | 'mist'
  | 'moss'
  | 'sand'
  | 'clay'
  | 'slate';

export type AtmosphereIntensity =
  | 'ambient'
  | 'normal'
  | 'focused'
  | 'immersive';

export type AcademicPage =
  | 'default'
  | 'reading'
  | 'focus'
  | 'visual-lab'
  | 'anatomy'
  | 'exam';

export type UiStyle = 'academic' | 'living-sky';

export interface AcademicContext {
  grade?: GradeLevel;
  boardId?: string;
  group?: AcademicGroup;
  stream?: AcademicStream;
  subjectId?: string;
  competitiveGoalId?: string;
  page?: AcademicPage;
}

export interface VisualPreferences {
  mode: 'dark' | 'light' | 'system';
  motion: 'system' | 'reduce';
  contrast: 'system' | 'high';
  decoration: 'standard' | 'minimal' | 'off';
  ambientMotion: boolean;
  pointerResponse: boolean;
  focusMode: boolean;
  largerText?: boolean;
  uiStyle: UiStyle;
  liveWeather: boolean;
}

export interface ThemeLayer {
  accent?: AcademicTone;
  secondary?: AcademicTone;
  motifs?: readonly Motif[];
  intensity?: AtmosphereIntensity;
}

export interface ResolvedAcademicTheme {
  signature: string;
  group: AcademicGroup;
  accent: AcademicTone;
  secondary: AcademicTone;
  motifs: readonly Motif[];
  intensity: AtmosphereIntensity;
  page: AcademicPage;
}
