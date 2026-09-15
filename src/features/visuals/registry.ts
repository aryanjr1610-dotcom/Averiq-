import type { AdaptiveVisualFamily } from './curriculum';
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

  'anatomy-heart-2d': {
    id: 'anatomy-heart-2d',
    title: 'Heart — 2D reference',
    subject: 'biology',
    category: 'biology',
    dimension: 2,
    description: 'Trace the major chambers and the direction of blood flow in a simplified heart diagram.',
    explanation:
      'This is a simplified educational heart diagram. It is not to scale and is not a diagnostic or surgical representation.',
    objectives: ['Identify the four chambers.', 'Trace the simplified route of blood through the heart.'],
    parameters: [],
    load: () => import('@/features/anatomy/two/Heart2D'),
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

const adaptiveMeta: Partial<Record<AdaptiveVisualFamily, {
  subject: string;
  explanation: string;
  objectives: readonly string[];
}>> = {
  'physics-motion': {
    subject: 'physics',
    explanation: 'A conceptual mechanics model for tracing quantities, interactions and outcomes. The shapes are schematic; exact vectors, values and equations come from the lesson.',
    objectives: ['Trace cause and effect in a mechanics phenomenon.', 'Connect the diagram with equations and stated assumptions.'],
  },
  'physics-wave': {
    subject: 'physics',
    explanation: 'A conceptual wave model for exploring repetition, phase and propagation. It is not a measurement trace unless the lesson supplies measured data.',
    objectives: ['Recognize repeating features.', 'Relate the changing phase to the lesson description.'],
  },
  'physics-optics': {
    subject: 'physics',
    explanation: 'A conceptual process model for following how light interacts with an optical system. Exact ray geometry and sign conventions remain those stated in the lesson.',
    objectives: ['Trace an optical cause-and-effect chain.', 'Connect the schematic to the lesson ray model.'],
  },
  'physics-thermal': {
    subject: 'physics',
    explanation: 'A conceptual model for energy transfer and thermal change. It is designed to explain relationships, not to replace quantitative thermodynamic graphs.',
    objectives: ['Trace energy transfer.', 'Relate microscopic and macroscopic descriptions.'],
  },
  'physics-electric': {
    subject: 'physics',
    explanation: 'A conceptual electricity and magnetism model for tracing source, interaction, response and feedback. Use exact circuit or field diagrams supplied by the lesson when quantitative detail matters.',
    objectives: ['Trace electrical or magnetic interactions.', 'Distinguish conceptual flow from measured values.'],
  },
  'chemistry-particles': {
    subject: 'chemistry',
    explanation: 'A particle-level model. Particle sizes and separations are deliberately exaggerated so states and changes can be seen; the drawing is not to scale.',
    objectives: ['Connect the particle model to observable properties.', 'Use the control to compare arrangements and change.'],
  },
  'chemistry-reaction': {
    subject: 'chemistry',
    explanation: 'A conceptual reaction pathway showing an initial state, change, result and possible feedback. Stoichiometry and mechanism must be read from the lesson rather than inferred from node sizes.',
    objectives: ['Trace a reaction or equilibrium process.', 'Separate qualitative mechanism from quantitative stoichiometry.'],
  },
  'chemistry-bonding': {
    subject: 'chemistry',
    explanation: 'A conceptual structure-and-interaction model for atomic, molecular and bonding topics. It does not claim scale-accurate orbitals or bond lengths.',
    objectives: ['Connect structure with interaction.', 'Use the lesson for exact geometry, notation and exceptions.'],
  },
  'biology-anatomy': {
    subject: 'biology',
    explanation: 'A simplified structure-function organizer for anatomy and physiology. The body outline is schematic, not to scale, and not a diagnostic or surgical representation.',
    objectives: ['Connect major structures with functions.', 'Trace the direction of a physiological process.'],
  },
  'biology-cell': {
    subject: 'biology',
    explanation: 'A conceptual cellular structure-function model. It simplifies size, shape and spatial arrangement so relationships are easier to inspect.',
    objectives: ['Relate structures to functions.', 'Connect the visual model with the lesson terminology.'],
  },
  'biology-genetics': {
    subject: 'biology',
    explanation: 'A conceptual information-flow model for genetics and inheritance. It organizes relationships without replacing the exact crosses, sequences or probabilities in the lesson.',
    objectives: ['Trace biological information or inheritance.', 'Connect stages with the lesson evidence.'],
  },
  'biology-ecology': {
    subject: 'biology',
    explanation: 'A conceptual systems model for ecological relationships. Arrow direction represents a relationship or flow described by the lesson, not geographic distance.',
    objectives: ['Trace interactions in an ecological system.', 'Identify feedback and consequences.'],
  },
  'biology-plant': {
    subject: 'biology',
    explanation: 'A conceptual structure-process model for plant biology. It is schematic and should be paired with the exact tissue or pathway details stated in the lesson.',
    objectives: ['Connect plant structures with processes.', 'Trace transport or transformation through stages.'],
  },
  'math-graph': {
    subject: 'mathematics',
    explanation: 'A concept graph for discussing change, turning points and relationships. It is intentionally unlabeled with numerical units unless the lesson provides a specific function or dataset.',
    objectives: ['Interpret qualitative graph behavior.', 'Connect graph features with the current mathematical concept.'],
  },
  'math-geometry': {
    subject: 'mathematics',
    explanation: 'A schematic geometry workspace. The figure is not assumed to be drawn to scale; conclusions must follow from the stated conditions and proof.',
    objectives: ['Identify geometric features.', 'Separate visual intuition from valid deduction.'],
  },
  'math-probability': {
    subject: 'mathematics',
    explanation: 'A concept graph for organizing outcomes and relationships. Exact sample spaces and probabilities remain those defined by the problem.',
    objectives: ['Organize outcomes visually.', 'Connect qualitative patterns with exact probability calculations.'],
  },
  'geography-map': {
    subject: 'geography',
    explanation: 'A schematic spatial organizer for place, pattern, movement and impact. It is explicitly not a boundary-accurate map; use verified maps in the lesson for real locations.',
    objectives: ['Reason about spatial relationships.', 'Distinguish a schematic organizer from a geographic boundary map.'],
  },
  'geography-earth': {
    subject: 'geography',
    explanation: 'A schematic Earth-system organizer for processes, transfers and feedback. Shapes are conceptual and not geographic or vertical scale.',
    objectives: ['Trace an Earth-system process.', 'Connect physical processes with spatial consequences.'],
  },
  'history-timeline': {
    subject: 'history',
    explanation: 'A conceptual timeline organizer for context, triggers, change and legacy. It does not invent dates; exact chronology must come from the lesson.',
    objectives: ['Trace chronology and causation.', 'Distinguish contextual phases from exact dated events.'],
  },
  'civics-system': {
    subject: 'social science',
    explanation: 'A systems diagram for institutions, people, rules and outcomes. Arrows represent relationships described by the lesson rather than legal authority unless explicitly stated.',
    objectives: ['Trace institutional relationships.', 'Connect rules, actors and outcomes.'],
  },
  'economics-flow': {
    subject: 'economics',
    explanation: 'A conceptual flow model for economic variables and actors. It organizes direction and feedback without inventing numerical values.',
    objectives: ['Trace an economic flow.', 'Identify feedback and consequences.'],
  },
  'commerce-flow': {
    subject: 'commerce',
    explanation: 'A process organizer for accounting, business and commerce concepts. It illustrates sequence and relationships without replacing formal entries, statements or legal definitions.',
    objectives: ['Trace a business or accounting process.', 'Connect each step to the formal method in the lesson.'],
  },
  'computing-flow': {
    subject: 'computer science',
    explanation: 'A conceptual execution and data-flow diagram. It shows sequence and feedback without claiming exact program output unless the lesson provides code and inputs.',
    objectives: ['Trace control or data flow.', 'Connect visual steps with code or algorithm statements.'],
  },
  'language-structure': {
    subject: 'language',
    explanation: 'A structure map for following ideas, sequence, language features or argument. It uses the lesson topic only and does not reproduce copyrighted textbook passages.',
    objectives: ['Organize ideas and relationships.', 'Connect language or literary structure with the lesson explanation.'],
  },
  'psychology-process': {
    subject: 'psychology',
    explanation: 'A conceptual process diagram for psychological constructs and relationships. It is educational, not diagnostic, and does not infer traits about the learner.',
    objectives: ['Trace a psychological process.', 'Connect constructs with evidence and conditions in the lesson.'],
  },
  'physical-education': {
    subject: 'physical education',
    explanation: 'A simplified body-and-process organizer for movement, training and physical education. It is not a medical or injury-diagnosis diagram.',
    objectives: ['Connect body structures with movement or training concepts.', 'Trace a safe conceptual sequence.'],
  },
  'arts-process': {
    subject: 'arts',
    explanation: 'A process organizer for artistic elements, choices and outcomes. It supports analysis and planning without prescribing one correct creative result.',
    objectives: ['Trace artistic choices and effects.', 'Connect elements with the lesson vocabulary.'],
  },
  'general-concept': {
    subject: 'general',
    explanation: 'A conceptual organizer that links the main terms and stages in this lesson. It is deliberately schematic so it can support the explanation without inventing subject-specific measurements or facts.',
    objectives: ['Organize the main concept visually.', 'Trace relationships between key ideas.'],
  },
};

function titleFromSlug(slug: string) {
  return slug
    .replace(/-+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function adaptiveDefinition(id: string): VisualizationDefinition | null {
  const match = /^adaptive_([a-z0-9-]+)__([a-z0-9-]+)$/.exec(id);
  if (!match) return null;

  const family = match[1] as AdaptiveVisualFamily;
  const topic = titleFromSlug(match[2]);
  const meta = adaptiveMeta[family] ?? adaptiveMeta['general-concept']!;

  return {
    id,
    title: `Interactive model · ${topic}`,
    subject: meta.subject,
    category: family === 'history-timeline' ? 'timeline' : family === 'math-geometry' ? 'geometry' : family === 'math-graph' || family === 'math-probability' ? 'graph' : family === 'physics-wave' ? 'wave' : family.startsWith('biology-') ? 'biology' : 'process',
    dimension: 2,
    description: `Explore the relationships in ${topic}.`,
    explanation: meta.explanation,
    objectives: meta.objectives,
    animated: family === 'physics-wave' || family === 'chemistry-particles' || family === 'biology-anatomy' || family.endsWith('-flow'),
    parameters: [
      { key: 'stage', label: 'Explore stage', min: 0, max: 3, step: 1, initial: 0 },
    ],
    context: {
      family,
      topic,
      animatedByClock: family === 'physics-wave' || family === 'chemistry-particles' || family === 'biology-anatomy' || family.endsWith('-flow'),
    },
    load: () => import('./two/AdaptiveCurriculumVisual'),
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
