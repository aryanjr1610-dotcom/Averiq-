import type { ComponentType } from 'react';

import type { AdaptiveVisualFamily } from './curriculum';

export type Parameters = Readonly<Record<string, number>>;
export type Quality = 'auto' | 'low' | 'medium' | 'high';

export type VisualSelection = {
  id: string;
  name: string;
  description: string;
};

export type VisualContext = {
  family: AdaptiveVisualFamily;
  topic: string;
  animatedByClock?: boolean;
};

export type VisualProps = {
  parameters: Parameters;
  elapsed: number;
  labels: boolean;
  quality: Quality;
  resetToken: number;
  context?: VisualContext;
  onSelect: (value: VisualSelection | null) => void;
};

export type ParameterDefinition = {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  unit?: string;
};

export type VisualizationDefinition = {
  id: string;
  title: string;
  subject: string;
  category:
    | 'diagram' | 'graph' | 'vector' | 'field' | 'wave'
    | 'circuit' | 'geometry' | 'process' | 'timeline' | 'biology';
  dimension: 2 | 3;
  description: string;
  explanation: string;
  objectives: readonly string[];
  parameters: readonly ParameterDefinition[];
  animated?: boolean;
  fallbackId?: string;
  context?: VisualContext;
  load: () => Promise<{ default: ComponentType<VisualProps> }>;
};
