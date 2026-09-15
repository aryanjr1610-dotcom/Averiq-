export type AdaptiveVisualFamily =
  | 'physics-motion'
  | 'physics-wave'
  | 'physics-optics'
  | 'physics-thermal'
  | 'physics-electric'
  | 'chemistry-particles'
  | 'chemistry-reaction'
  | 'chemistry-bonding'
  | 'biology-anatomy'
  | 'biology-cell'
  | 'biology-genetics'
  | 'biology-ecology'
  | 'biology-plant'
  | 'math-graph'
  | 'math-geometry'
  | 'math-probability'
  | 'geography-map'
  | 'geography-earth'
  | 'history-timeline'
  | 'civics-system'
  | 'economics-flow'
  | 'commerce-flow'
  | 'computing-flow'
  | 'language-structure'
  | 'psychology-process'
  | 'physical-education'
  | 'arts-process'
  | 'general-concept';

export type CurriculumVisualSeed = {
  subjectCode: string;
  lessonTitle: string;
  topicTitle?: string;
  chapterTitle?: string;
};

const subjectDefaults: Record<string, AdaptiveVisualFamily> = {
  physics: 'physics-motion',
  chemistry: 'chemistry-particles',
  biology: 'biology-cell',
  science: 'general-concept',
  mathematics: 'math-graph',
  geography: 'geography-map',
  history: 'history-timeline',
  'history-civics': 'history-timeline',
  'social-science': 'general-concept',
  'political-science': 'civics-system',
  economics: 'economics-flow',
  accountancy: 'commerce-flow',
  accounts: 'commerce-flow',
  commerce: 'commerce-flow',
  'commercial-studies': 'commerce-flow',
  'business-studies': 'commerce-flow',
  entrepreneurship: 'commerce-flow',
  'computer-science': 'computing-flow',
  'computer-studies': 'computing-flow',
  'computer-applications': 'computing-flow',
  'informatics-practices': 'computing-flow',
  english: 'language-structure',
  'english-core': 'language-structure',
  hindi: 'language-structure',
  sanskrit: 'language-structure',
  'second-language': 'language-structure',
  psychology: 'psychology-process',
  sociology: 'civics-system',
  'physical-education': 'physical-education',
  'arts-education': 'arts-process',
};

const keywordRules: Array<{
  family: AdaptiveVisualFamily;
  subjects?: readonly string[];
  keywords: readonly string[];
}> = [
  { family: 'physics-electric', subjects: ['physics', 'science'], keywords: ['electric', 'charge', 'current', 'circuit', 'magnetic', 'magnetism', 'electromagnetic', 'induction', 'capacitor'] },
  { family: 'physics-wave', subjects: ['physics', 'science'], keywords: ['wave', 'sound', 'oscillation', 'vibration', 'simple harmonic', 'frequency', 'resonance'] },
  { family: 'physics-optics', subjects: ['physics', 'science'], keywords: ['light', 'ray', 'reflection', 'refraction', 'lens', 'mirror', 'optics', 'prism'] },
  { family: 'physics-thermal', subjects: ['physics', 'science'], keywords: ['heat', 'thermal', 'temperature', 'thermodynamic', 'kinetic theory'] },
  { family: 'physics-motion', subjects: ['physics', 'science'], keywords: ['motion', 'force', 'work', 'energy', 'power', 'gravitation', 'mechanic', 'rotation', 'momentum', 'projectile'] },

  { family: 'chemistry-bonding', subjects: ['chemistry', 'science'], keywords: ['bond', 'molecule', 'molecular', 'hybridisation', 'hybridization', 'orbital', 'structure of atom', 'atomic structure'] },
  { family: 'chemistry-reaction', subjects: ['chemistry', 'science'], keywords: ['reaction', 'equilibrium', 'redox', 'electrochem', 'kinetic', 'acid', 'base', 'salt', 'organic', 'hydrocarbon'] },
  { family: 'chemistry-particles', subjects: ['chemistry', 'science'], keywords: ['matter', 'solution', 'solid', 'liquid', 'gas', 'mixture', 'separation', 'states of matter'] },

  { family: 'biology-anatomy', subjects: ['biology', 'science', 'physical-education'], keywords: ['human', 'heart', 'circulation', 'breathing', 'respiration', 'digest', 'excretion', 'nervous', 'brain', 'muscle', 'skeleton', 'reproduction'] },
  { family: 'biology-genetics', subjects: ['biology', 'science'], keywords: ['genetic', 'inheritance', 'heredity', 'dna', 'gene', 'chromosome', 'evolution'] },
  { family: 'biology-ecology', subjects: ['biology', 'science'], keywords: ['ecology', 'ecosystem', 'biodiversity', 'environment', 'population', 'community', 'food chain'] },
  { family: 'biology-plant', subjects: ['biology', 'science'], keywords: ['plant', 'photosynthesis', 'transport in plants', 'mineral nutrition', 'flower', 'seed'] },
  { family: 'biology-cell', subjects: ['biology', 'science'], keywords: ['cell', 'tissue', 'biomolecule', 'microorganism'] },

  { family: 'math-probability', subjects: ['mathematics'], keywords: ['probability', 'statistics', 'data handling', 'permutation', 'combination'] },
  { family: 'math-geometry', subjects: ['mathematics'], keywords: ['geometry', 'triangle', 'circle', 'quadrilateral', 'coordinate geometry', 'mensuration', 'vector', 'three dimensional', '3d'] },
  { family: 'math-graph', subjects: ['mathematics'], keywords: ['function', 'relation', 'calculus', 'derivative', 'integral', 'trigonometry', 'sequence', 'series', 'algebra', 'equation', 'polynomial', 'number'] },

  { family: 'geography-earth', subjects: ['geography', 'social-science'], keywords: ['earth', 'climate', 'weather', 'atmosphere', 'ocean', 'landform', 'geomorph', 'water', 'soil', 'natural vegetation', 'resource'] },
  { family: 'geography-map', subjects: ['geography', 'social-science'], keywords: ['map', 'location', 'region', 'india', 'world', 'continent', 'population', 'settlement', 'transport', 'trade'] },
  { family: 'history-timeline', subjects: ['history', 'history-civics', 'social-science'], keywords: ['history', 'empire', 'kingdom', 'colonial', 'revolution', 'nationalism', 'civilisation', 'civilization', 'medieval', 'modern', 'ancient', 'movement', 'war'] },
  { family: 'civics-system', subjects: ['history-civics', 'social-science', 'political-science', 'sociology'], keywords: ['constitution', 'government', 'democracy', 'parliament', 'judiciary', 'rights', 'citizenship', 'political', 'society', 'social'] },
  { family: 'economics-flow', subjects: ['economics', 'social-science'], keywords: ['econom', 'market', 'money', 'income', 'employment', 'development', 'demand', 'supply', 'national income'] },

  { family: 'computing-flow', subjects: ['computer-science', 'computer-studies', 'computer-applications', 'informatics-practices'], keywords: ['algorithm', 'program', 'python', 'java', 'database', 'sql', 'network', 'data', 'computer', 'boolean'] },
  { family: 'language-structure', subjects: ['english', 'english-core', 'hindi', 'sanskrit', 'second-language'], keywords: ['poem', 'poetry', 'prose', 'story', 'grammar', 'writing', 'literature', 'language'] },
];

function searchable(seed: CurriculumVisualSeed) {
  return [seed.subjectCode, seed.lessonTitle, seed.topicTitle, seed.chapterTitle]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export function inferAdaptiveVisualFamily(seed: CurriculumVisualSeed): AdaptiveVisualFamily {
  const subject = seed.subjectCode.toLocaleLowerCase();
  const text = searchable(seed);

  for (const rule of keywordRules) {
    if (rule.subjects && !rule.subjects.includes(subject)) continue;
    if (rule.keywords.some((keyword) => text.includes(keyword))) return rule.family;
  }

  if (subject === 'science') {
    if (/cell|plant|animal|body|life|living|food|reproduction/.test(text)) return 'biology-cell';
    if (/atom|matter|substance|acid|base|chemical/.test(text)) return 'chemistry-particles';
    return 'physics-motion';
  }

  if (subject === 'social-science') {
    if (/history|king|empire|past|colonial|movement/.test(text)) return 'history-timeline';
    if (/earth|map|climate|resource|population|agriculture/.test(text)) return 'geography-map';
    return 'civics-system';
  }

  return subjectDefaults[subject] ?? 'general-concept';
}

function slug(value: string, limit = 38) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, limit)
    .replace(/-+$/g, '');

  return normalized || 'concept';
}

function familyForSchema(subjectCode: string) {
  const subject = subjectCode.toLocaleLowerCase();
  if (subject === 'physics' || subject === 'science') return 'physics';
  if (subject === 'mathematics') return 'mathematics';
  if (subject === 'chemistry') return 'chemistry';
  if (subject === 'biology') return 'biology';
  if (subject === 'geography') return 'geography';
  return 'other';
}

export function curriculumVisualId(seed: CurriculumVisualSeed) {
  const text = searchable(seed);
  const subject = seed.subjectCode.toLocaleLowerCase();

  if ((subject === 'physics' || subject === 'science') && /electric field|point charge|coulomb/.test(text)) {
    return 'electric-field-2d';
  }

  if (subject === 'mathematics' && /sine|sinusoidal|trigonometric function/.test(text)) {
    return 'sine-graph';
  }

  if ((subject === 'biology' || subject === 'science') && /animal cell/.test(text)) {
    return 'animal-cell-overview';
  }

  if ((subject === 'biology' || subject === 'science') && /heart|cardiac|circulation/.test(text)) {
    return 'anatomy-heart-3d';
  }

  const family = inferAdaptiveVisualFamily(seed);
  const topic = seed.topicTitle || seed.lessonTitle || seed.chapterTitle || 'concept';
  return `adaptive_${family}__${slug(topic)}`.slice(0, 80).replace(/-+$/g, '');
}

export function ensureCurriculumVisual(document: unknown, seed: CurriculumVisualSeed) {
  if (!document || typeof document !== 'object') return document;

  const source = document as Record<string, unknown>;
  if (!Array.isArray(source.blocks)) return document;

  const blocks = source.blocks as Array<Record<string, unknown>>;
  const alreadyVisual = blocks.some((block) =>
    block?.type === 'visualizationReference' || block?.type === 'diagram2d',
  );

  if (alreadyVisual) return document;

  const topic = seed.topicTitle || seed.lessonTitle || seed.chapterTitle || 'this concept';
  const resourceId = curriculumVisualId(seed);
  const autoBlock = {
    id: 'auto_curriculum_visual',
    type: 'visualizationReference',
    tags: ['learn', 'concept'],
    data: {
      resourceId,
      title: `Explore ${topic}`,
      description: `Interactive concept model for ${topic}. Use the controls and select visual elements to connect the diagram with the lesson explanation.`,
      visualizationFamily: familyForSchema(seed.subjectCode),
    },
  };

  const headingIndex = blocks.findIndex((block) => block?.type === 'heading');
  const insertAt = headingIndex >= 0 ? headingIndex + 1 : 0;

  return {
    ...source,
    blocks: [
      ...blocks.slice(0, insertAt),
      autoBlock,
      ...blocks.slice(insertAt),
    ],
  };
}

export const curriculumVisualSubjectCodes = Object.freeze(Object.keys(subjectDefaults));
