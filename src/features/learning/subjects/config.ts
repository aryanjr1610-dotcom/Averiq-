export type SubjectFamily =
  | 'physics'
  | 'mathematics'
  | 'chemistry'
  | 'biology'
  | 'literature'
  | 'humanities'
  | 'commerce'
  | 'general';

export const extensionTypes = [
  'quantity',
  'proof',
  'graphReference',
  'reaction',
  'experiment',
  'biologicalProcess',
  'structureFunction',
  'literaryDevice',
  'vocabulary',
  'examAnswerGuidance',
] as const;

export type ExtensionType = typeof extensionTypes[number];

export type SubjectLearningConfig = {
  family: SubjectFamily;
  themeSubjectId?: string;
  capabilities: readonly ExtensionType[];
  tools: readonly {
    label: string;
    types: readonly string[];
  }[];
};

const commonTools = [
  { label: 'Formulas', types: ['formula', 'equation'] },
  { label: 'Derivations', types: ['derivation', 'proof'] },
  { label: 'Examples', types: ['workedExample'] },
  {
    label: 'Visuals',
    types: ['diagram2d', 'visualizationReference', 'graphReference'],
  },
] as const;

const configs: Record<string, SubjectLearningConfig> = {
  physics: {
    family: 'physics',
    themeSubjectId: 'physics',
    capabilities: ['quantity', 'proof', 'graphReference', 'experiment', 'examAnswerGuidance'],
    tools: commonTools,
  },

  mathematics: {
    family: 'mathematics',
    themeSubjectId: 'mathematics',
    capabilities: ['quantity', 'proof', 'graphReference', 'examAnswerGuidance'],
    tools: commonTools,
  },

  chemistry: {
    family: 'chemistry',
    themeSubjectId: 'chemistry',
    capabilities: ['quantity', 'reaction', 'experiment', 'examAnswerGuidance'],
    tools: commonTools,
  },

  biology: {
    family: 'biology',
    themeSubjectId: 'biology',
    capabilities: [
      'biologicalProcess', 'structureFunction',
      'experiment', 'vocabulary', 'examAnswerGuidance',
    ],
    tools: [
      { label: 'Processes', types: ['biologicalProcess'] },
      { label: 'Structures', types: ['structureFunction'] },
      { label: 'Diagrams', types: ['diagram2d', 'visualizationReference'] },
    ],
  },

  english: {
    family: 'literature',
    themeSubjectId: 'english',
    capabilities: ['literaryDevice', 'vocabulary', 'examAnswerGuidance'],
    tools: [
      { label: 'Vocabulary', types: ['vocabulary'] },
      { label: 'Analysis', types: ['literaryDevice', 'quoteReference'] },
      { label: 'Answer guidance', types: ['examAnswerGuidance'] },
    ],
  },
};

const general: SubjectLearningConfig = {
  family: 'general',
  capabilities: ['vocabulary', 'examAnswerGuidance'],
  tools: commonTools,
};

export function subjectLearningConfig(code: string): SubjectLearningConfig {
  return configs[code] ?? general;
}

export function supportsExtension(subjectCode: string, type: string) {
  if (!extensionTypes.some((candidate) => candidate === type)) return true;

  return subjectLearningConfig(subjectCode)
    .capabilities.some((candidate) => candidate === type);
}
