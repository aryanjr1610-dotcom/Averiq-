import { createElement } from 'react';

import type { AdaptiveVisualFamily } from './curriculum';
import type {
  ParameterDefinition,
  Parameters,
  VisualProps,
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

  'anatomy-heart-2d': {
    id: 'anatomy-heart-2d',
    title: 'Heart — 2D reference',
    subject: 'biology',
    category: 'biology',
    dimension: 2,
    description: 'Trace the four chambers in a simplified heart diagram.',
    explanation:
      'This is a simplified educational heart diagram. It is not to scale and is not a diagnostic or surgical representation.',
    objectives: ['Identify the four chambers.', 'Trace the simplified route of blood through the heart.'],
    parameters: [],
    load: () => import('./two/HeartFallback'),
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

type AdaptiveMeta = {
  subject: string;
  explanation: string;
  objectives: readonly string[];
};

function metaFor(family: AdaptiveVisualFamily): AdaptiveMeta {
  if (family.startsWith('physics-')) {
    return {
      subject: 'physics',
      explanation: family === 'physics-wave'
        ? 'A conceptual wave model for exploring repetition, phase and propagation. It is not a measurement trace unless the lesson supplies measured data.'
        : 'A conceptual physics model for tracing quantities, interactions, change and outcomes. Shapes are schematic; exact vectors, values, ray geometry and equations come from the lesson.',
      objectives: ['Trace the physical cause-and-effect chain.', 'Connect the visual model with equations, units and assumptions in the lesson.'],
    };
  }

  if (family.startsWith('chemistry-')) {
    return {
      subject: 'chemistry',
      explanation: family === 'chemistry-particles'
        ? 'A particle-level model. Particle sizes and separations are deliberately exaggerated so arrangements and changes can be seen; the drawing is not to scale.'
        : 'A conceptual chemistry model for structure, interaction or reaction progress. It does not invent stoichiometry, bond lengths, orbital scale or a mechanism beyond what the lesson states.',
      objectives: ['Connect microscopic structure with observable change.', 'Separate a qualitative model from exact quantitative chemistry.'],
    };
  }

  if (family.startsWith('biology-')) {
    return {
      subject: 'biology',
      explanation: family === 'biology-anatomy'
        ? 'A simplified structure-function organizer for anatomy and physiology. The body outline is schematic, not to scale, and not a diagnostic or surgical representation.'
        : 'A conceptual biology model for structure, information, transport or interaction. Size and spatial arrangement may be simplified to make relationships easier to inspect.',
      objectives: ['Connect biological structures with functions or processes.', 'Trace the direction of change, transport or information.'],
    };
  }

  if (family.startsWith('math-')) {
    return {
      subject: 'mathematics',
      explanation: family === 'math-geometry'
        ? 'A schematic geometry workspace. The figure is not assumed to be drawn to scale; conclusions must follow from stated conditions and proof.'
        : 'A concept graph for discussing relationships, change and structure. Exact axes, equations, sample spaces and values remain those defined by the lesson or problem.',
      objectives: ['Use the visual to form a mathematical interpretation.', 'Verify conclusions with the exact definitions, equations or proof.'],
    };
  }

  if (family.startsWith('geography-')) {
    return {
      subject: 'geography',
      explanation: 'A schematic spatial or Earth-system organizer for place, pattern, process and movement. It is not a boundary-accurate map and is not to scale; verified lesson maps remain the source for real locations.',
      objectives: ['Reason about spatial relationships or Earth-system processes.', 'Distinguish a schematic organizer from a verified geographic map.'],
    };
  }

  if (family === 'history-timeline') {
    return {
      subject: 'history',
      explanation: 'A conceptual timeline organizer for context, triggers, change and legacy. It does not invent dates; exact chronology and named events must come from the lesson.',
      objectives: ['Trace chronology and causation.', 'Distinguish broad phases from exact dated events.'],
    };
  }

  if (family === 'civics-system') {
    return {
      subject: 'social science',
      explanation: 'A systems diagram for institutions, people, rules and outcomes. Arrows organize relationships described by the lesson and do not imply a legal power unless the lesson states it.',
      objectives: ['Trace institutional or social relationships.', 'Connect actors, rules, causes and outcomes.'],
    };
  }

  if (family === 'economics-flow' || family === 'commerce-flow') {
    return {
      subject: family === 'economics-flow' ? 'economics' : 'commerce',
      explanation: 'A conceptual flow model for economic, accounting or business processes. It organizes sequence and feedback without inventing numerical values, journal entries or legal definitions.',
      objectives: ['Trace a flow or process.', 'Connect each visual stage with the formal method in the lesson.'],
    };
  }

  if (family === 'computing-flow') {
    return {
      subject: 'computer science',
      explanation: 'A conceptual execution and data-flow diagram. It shows sequence and feedback without claiming exact program output unless the lesson supplies code and inputs.',
      objectives: ['Trace control or data flow.', 'Connect the visual sequence with code, algorithms or data structures.'],
    };
  }

  if (family === 'language-structure') {
    return {
      subject: 'language',
      explanation: 'A structure map for ideas, sequence, grammar, argument or literary analysis. It uses only the lesson topic and does not reproduce copyrighted textbook passages.',
      objectives: ['Organize ideas and relationships.', 'Connect language or literary structure with the lesson explanation.'],
    };
  }

  if (family === 'psychology-process') {
    return {
      subject: 'psychology',
      explanation: 'A conceptual organizer for psychological processes and relationships. It is educational, not diagnostic, and does not infer traits about the learner.',
      objectives: ['Trace a psychological process.', 'Connect constructs with conditions and evidence in the lesson.'],
    };
  }

  if (family === 'physical-education') {
    return {
      subject: 'physical education',
      explanation: 'A simplified body-and-process organizer for movement and training concepts. It is educational and is not a medical or injury-diagnosis diagram.',
      objectives: ['Connect body structures with movement or training concepts.', 'Trace the conceptual sequence described by the lesson.'],
    };
  }

  if (family === 'arts-process') {
    return {
      subject: 'arts',
      explanation: 'A process organizer for artistic elements, choices and outcomes. It supports analysis and planning without prescribing one correct creative result.',
      objectives: ['Trace artistic choices and effects.', 'Connect visual stages with the lesson vocabulary.'],
    };
  }

  return {
    subject: 'general',
    explanation: 'A conceptual organizer that links the main terms and stages in this lesson. It is deliberately schematic so it can support explanation without inventing subject-specific measurements or facts.',
    objectives: ['Organize the main concept visually.', 'Trace relationships between key ideas.'],
  };
}

function titleFromSlug(slug: string) {
  return slug
    .replace(/-+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function adaptiveDefinition(id: string): VisualizationDefinition | null {
  const match = /^adaptive_([a-z0-9-]+)__([a-z0-9-]+)$/.exec(id);
  if (!match) return null;

  const family = (match[1] ?? 'general-concept') as AdaptiveVisualFamily;
  const topic = titleFromSlug(match[2] ?? 'concept');
  const meta = metaFor(family);
  const animated = family === 'physics-wave'
    || family === 'chemistry-particles'
    || family === 'biology-anatomy'
    || family.endsWith('-flow');
  const context = { family, topic, animatedByClock: animated } as const;

  return {
    id,
    title: `Interactive model · ${topic}`,
    subject: meta.subject,
    category: family === 'history-timeline'
      ? 'timeline'
      : family === 'math-geometry'
        ? 'geometry'
        : family === 'math-graph' || family === 'math-probability'
          ? 'graph'
          : family === 'physics-wave'
            ? 'wave'
            : family.startsWith('biology-')
              ? 'biology'
              : 'process',
    dimension: 2,
    description: `Explore the relationships in ${topic}.`,
    explanation: meta.explanation,
    objectives: meta.objectives,
    animated,
    parameters: [
      { key: 'stage', label: 'Explore stage', min: 0, max: 3, step: 1, initial: 0 },
    ],
    context,
    load: async () => {
      const module = await import('./two/AdaptiveCurriculumVisual');
      const BoundAdaptiveVisual = (props: VisualProps) => createElement(module.default, {
        ...props,
        context,
      });
      return { default: BoundAdaptiveVisual };
    },
  };
}

export function visualizationDefinition(id: string) {
  const installed = definitions[aliases[id] ?? id];
  return installed ?? adaptiveDefinition(id);
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
