import type {
  ParameterDefinition,
  Parameters,
  VisualizationDefinition,
} from './types';

const chargeParameters: ParameterDefinition[] = [
  { key: 'q1', label: 'Charge 1', min: -5, max: 5, step: 0.1, initial: 2, unit: 'μC' },
  { key: 'q2', label: 'Charge 2', min: -5, max: 5, step: 0.1, initial: -2, unit: 'μC' },
  { key: 'x1', label: 'Charge 1 horizontal position', min: -1.2, max: 1.2, step: 0.1, initial: -0.6, unit: 'm' },
  { key: 'y1', label: 'Charge 1 vertical position', min: -0.8, max: 0.8, step: 0.1, initial: 0, unit: 'm' },
  { key: 'x2', label: 'Charge 2 horizontal position', min: -1.2, max: 1.2, step: 0.1, initial: 0.6, unit: 'm' },
  { key: 'y2', label: 'Charge 2 vertical position', min: -0.8, max: 0.8, step: 0.1, initial: 0, unit: 'm' },
];

const chargeExplanation =
  'Arrows show the direction of the resultant electric field of stationary point charges in vacuum. Arrow lengths are normalized for readability, not proportional to field magnitude. The live panel gives actual model values. Arrows close to ideal point charges are omitted rather than softening the physical equation.';

const definitions: Record<string, VisualizationDefinition> = {
  'electric-field-2d': {
    id: 'electric-field-2d',
    title: 'Two-charge electric field',
    subject: 'physics',
    category: 'field',
    dimension: 2,
    description: 'Change charge signs, magnitudes and positions.',
    explanation: chargeExplanation,
    objectives: ['Distinguish field direction from magnitude.', 'Explore superposition.'],
    parameters: chargeParameters,
    load: () => import('./two/Field2D'),
  },

  'electric-field-3d': {
    id: 'electric-field-3d',
    title: 'Electric field in three dimensions',
    subject: 'physics',
    category: 'field',
    dimension: 3,
    description: 'Rotate the same point-charge model and inspect field directions.',
    explanation: chargeExplanation,
    objectives: ['Inspect spatial field direction.', 'Connect the scene to the vector model.'],
    parameters: chargeParameters,
    fallbackId: 'electric-field-2d',
    load: () => import('./three/Charges3D'),
  },

  'sine-graph': {
    id: 'sine-graph',
    title: 'Explore a sinusoidal function',
    subject: 'mathematics',
    category: 'graph',
    dimension: 2,
    description: 'Explore y = A sin(ωx + φ).',
    explanation:
      'A controls vertical amplitude. For positive ω, the period is 2π/ω. The horizontal displacement is −φ/ω. The dashed curve is sin(x). Animation changes an additional phase offset; it does not change the stored formula or imply a physical wave speed.',
    objectives: ['Connect parameters to graph shape.', 'Distinguish amplitude, period and phase.'],
    animated: true,
    parameters: [
      { key: 'amplitude', label: 'Amplitude A', min: 0, max: 3, step: 0.1, initial: 1 },
      { key: 'omega', label: 'Angular coefficient ω', min: 0.2, max: 3, step: 0.1, initial: 1 },
      { key: 'phase', label: 'Phase φ', min: -3.14, max: 3.14, step: 0.01, initial: 0, unit: 'rad' },
      { key: 'span', label: 'Horizontal view half-width', min: 2, max: 12, step: 0.5, initial: 6 },
    ],
    load: () => import('./two/SineGraph'),
  },

  'animal-cell-overview': {
    id: 'animal-cell-overview',
    title: 'An animal cell: selected structures',
    subject: 'biology',
    category: 'biology',
    dimension: 2,
    description: 'Select a label to connect structure and function.',
    explanation:
      'This simplified schematic is not to scale and omits many structures. It is an educational overview, not a microscopy image or anatomical reconstruction.',
    objectives: ['Identify selected cell structures.', 'Relate location to function.'],
    parameters: [],
    load: () => import('./two/CellDiagram'),
  },

  'anatomy-heart-3d': {
    id: 'anatomy-heart-3d',
    title: 'Heart — reference scene',
    subject: 'biology',
    category: 'biology',
    dimension: 3,
    fallbackId: 'anatomy-heart-2d',
    description: 'Explore the heart chambers and valves in 3D.',
    explanation: 'A four-chambered muscular pump that keeps pulmonary and systemic circulation separate.',
    objectives: ['Identify heart chambers and valves.', 'Trace blood flow.'],
    parameters: [],
    load: () => import('@/features/anatomy/three/heart-scene'),
  },
};

const aliases: Record<string, string> = {
  'point-charge-field': 'electric-field-2d',
  'two-charge-field': 'electric-field-2d',
};

export function visualizationDefinition(id: string) {
  return definitions[aliases[id] ?? id] ?? null;
}

export function initialParameters(
  definition: VisualizationDefinition,
  supplied: Parameters = {},
): Record<string, number> {
  return Object.fromEntries(definition.parameters.map((parameter) => {
    const candidate = supplied[parameter.key];

    const value = typeof candidate === 'number' && Number.isFinite(candidate)
      ? Math.max(parameter.min, Math.min(parameter.max, candidate))
      : parameter.initial;

    return [parameter.key, value];
  }));
}
