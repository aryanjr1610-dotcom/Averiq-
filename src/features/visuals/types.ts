import type { ComponentType } from 'react';

export type Parameters = Readonly<Record<string, number>>;
export type Quality = 'auto' | 'low' | 'medium' | 'high';

export type VisualSelection = {
  id: string;
  name: string;
  description: string;
};

export type VisualProps = {
  parameters: Parameters;
  elapsed: number;
  labels: boolean;
  quality: Quality;
  resetToken: number;
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
  load: () => Promise<{ default: ComponentType<VisualProps> }>;
};
