import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { AcademicImportSchema } from '../src/features/curriculum/import-schema';

const text = (value: string) => [{ type: 'text', text: value }];
const block = (id: string, type: string, data: unknown) => ({ id, type, data });

const electrostatics = {
  schemaVersion: 1,
  blocks: [
    block('coulomb-introduction', 'heading', {
      level: 2,
      text: 'How two charges interact',
    }),

    block('coulomb-context', 'paragraph', {
      content: text(
        'Electric charge influences how objects interact. In this reference lesson, we consider two stationary point charges in vacuum. The model is useful because it separates the size of the interaction from its direction.',
      ),
    }),

    block('charge-definition', 'definition', {
      title: 'Electric charge',
      content: text(
        'Electric charge is a physical property associated with electromagnetic interactions. Charge is measured in coulombs, written C.',
      ),
    }),

    block('charge-concept', 'keyConcept', {
      title: 'Magnitude and direction are different questions',
      content: text(
        'The magnitude of the force is non-negative. Like charges repel; unlike charges attract. Determine direction from the signs of the charges and their positions.',
      ),
    }),

    block('force-law', 'formula', {
      name: "Coulomb's law: force magnitude",
      latex: 'F = k\\frac{|q_1q_2|}{r^2}',
      alternative: 'Force magnitude equals Coulomb constant times the absolute charge product divided by separation squared.',
      meaning: text('The force becomes weaker as the separation increases.'),
      variables: [
        { symbol: 'F', meaning: 'Force magnitude', unit: 'N' },
        { symbol: 'k', meaning: 'Coulomb constant in vacuum', unit: 'N m² C⁻²' },
        { symbol: 'q_1, q_2', meaning: 'Electric charges', unit: 'C' },
        { symbol: 'r', meaning: 'Distance between the charges', unit: 'm' },
      ],
      siUnits: 'newton',
      dimensions: 'M L T^-2',
      conditions: [
        'Stationary point charges, or a situation where the point-charge approximation is justified.',
        'Vacuum; material media require the appropriate permittivity.',
        'The separation r must be greater than zero.',
      ],
    }),

    block('inverse-square', 'equation', {
      latex: 'F(2r)=\\frac{1}{4}F(r)',
      alternative: 'Doubling the separation reduces the force magnitude to one quarter.',
      meaning: text('This comparison keeps both charges unchanged.'),
    }),

    block('field-heading', 'heading', {
      level: 2,
      text: 'From force to electric field',
    }),

    block('field-derivation', 'derivation', {
      title: 'Deriving the field magnitude from the force law',
      steps: [
        {
          id: 'field-step-one',
          latex: 'F=k\\frac{|Qq_0|}{r^2}',
          reason: text('Start with the force magnitude on a small positive test charge q₀.'),
        },
        {
          id: 'field-step-two',
          latex: 'E=\\frac{F}{q_0}',
          reason: text('Electric field is force per unit positive test charge.'),
          note: 'The test charge is assumed small enough not to disturb the source distribution.',
        },
        {
          id: 'field-step-three',
          latex: 'E=k\\frac{|Q|}{r^2}',
          reason: text('Substitute the force expression and cancel the positive test charge.'),
        },
      ],
      result: 'E=k\\frac{|Q|}{r^2}',
    }),

    block('derivation-scope', 'callout', {
      title: 'What this derivation does—and does not—show',
      content: text(
        "This is an algebraic consequence of Coulomb's law and the definition of electric field. It is not a derivation of Coulomb's law from more fundamental assumptions.",
      ),
    }),

    block('numerical-example', 'workedExample', {
      title: 'Two unlike charges',
      problem: text(
        'Charges of +2.0 μC and −3.0 μC are separated by 0.30 m in vacuum. Find the force magnitude and whether the interaction is attractive or repulsive.',
      ),
      given: [
        { symbol: 'q₁', value: '+2.0 × 10⁻⁶', unit: 'C' },
        { symbol: 'q₂', value: '−3.0 × 10⁻⁶', unit: 'C' },
        { symbol: 'r', value: '0.30', unit: 'm' },
        { symbol: 'k', value: '8.99 × 10⁹', unit: 'N m² C⁻²' },
      ],
      find: 'Force magnitude and interaction direction',
      concept: text('Use the absolute charge product for magnitude, then inspect the charge signs.'),
      steps: [
        {
          id: 'example-convert',
          latex: '|q_1q_2|=6.0\\times10^{-12}\\ \\mathrm{C^2}',
          reason: text('Convert microcoulombs to coulombs before multiplying.'),
        },
        {
          id: 'example-substitute',
          latex: 'F=\\frac{(8.99\\times10^9)(6.0\\times10^{-12})}{(0.30)^2}',
          reason: text('Substitute using SI units.'),
        },
        {
          id: 'example-direction',
          reason: text('The charge signs are opposite, so each charge is pulled toward the other.'),
        },
      ],
      answer: {
        latex: 'F\\approx0.60',
        alternative: 'The force magnitude is approximately zero point six zero newtons.',
        unit: 'N',
      },
      examNote: 'State the direction in words as well as giving the numerical magnitude.',
    }),

    block('charge-comparison', 'comparison', {
      title: 'Conductors and insulators',
      columns: [
        {
          title: 'Conductor',
          points: [
            text('Some charge carriers can move through the material.'),
            text('An electrostatic rearrangement can occur when an external field is applied.'),
          ],
        },
        {
          title: 'Insulator',
          points: [
            text('Charges are more strongly bound to local atomic or molecular structures.'),
            text('Polarization can still occur even without free conduction through the material.'),
          ],
        },
      ],
    }),

    block('units-table', 'table', {
      caption: 'Related quantities are not interchangeable',
      headers: ['Quantity', 'Meaning', 'SI unit'],
      rows: [
        [text('Charge'), text('Electrical property'), text('C')],
        [text('Force'), text('Interaction on a charge'), text('N')],
        [text('Electric field'), text('Force per unit positive test charge'), text('N/C')],
      ],
    }),

    block('field-diagram', 'diagram2d', {
      diagramId: 'point-charge-field',
      title: 'Field direction around a point charge',
      caption: 'A future diagram will show arrows pointing away from a positive source and toward a negative source.',
      labels: ['Source charge', 'Observation point', 'Electric-field direction'],
    }),

    block('field-visual', 'visualizationReference', {
      resourceId: 'two-charge-field',
      title: 'Explore two-charge fields',
      description: 'A future Visual Lab module will let learners move two charges and inspect the resulting field.',
      visualizationFamily: 'physics',
    }),

    block('common-unit-error', 'commonMistake', {
      title: 'Do not substitute microcoulombs as if they were coulombs',
      content: text('The prefix micro means 10⁻⁶. Missing this conversion changes the answer by a very large factor.'),
    }),

    block('exam-approach', 'examTip', {
      title: 'Make your reasoning visible',
      contexts: ['School examination'],
      content: text('Write the model, convert units, substitute, and state the direction. A bare number does not explain the physical interaction.'),
    }),

    block('lesson-summary', 'summary', {
      title: 'Keep these distinctions',
      content: text('Charge is measured in coulombs. Force magnitude follows an inverse-square dependence in the point-charge model. Field is force per unit positive test charge. Direction must be considered separately.'),
    }),

    block('distance-check', 'checkpoint', {
      question: 'With both charges unchanged, what happens to the force magnitude when their separation doubles?',
      options: [
        { id: 'double', label: 'It doubles.' },
        { id: 'half', label: 'It becomes one half.' },
        { id: 'quarter', label: 'It becomes one quarter.' },
        { id: 'unchanged', label: 'It stays unchanged.' },
      ],
      correctOptionId: 'quarter',
      explanation: text('The denominator contains r². Replacing r with 2r makes the denominator four times larger.'),
    }),
  ],
};

const chargeIntroduction = {
  schemaVersion: 1,
  blocks: [
    block('charge-overview', 'heading', {
      level: 2,
      text: 'A first model of charge',
    }),
    block('charge-overview-text', 'paragraph', {
      content: text('We describe charge using positive and negative signs. The sign distinguishes interaction behavior; it does not mean that negative charge is a smaller amount of charge.'),
    }),
    block('charge-properties', 'list', {
      ordered: false,
      items: [
        text('Charge is conserved in an isolated system.'),
        text('The net charge of an ordinary isolated object changes in integer multiples of the elementary charge.'),
        text('The sign of a charge and the magnitude of a charge must be kept distinct.'),
      ],
    }),
  ],
};

const literature = {
  schemaVersion: 1,
  blocks: [
    block('imagery-heading', 'heading', {
      level: 2,
      text: 'Reading imagery closely',
    }),
    block('original-line', 'quoteReference', {
      workTitle: 'Original development example',
      sectionReference: 'Two original demonstration lines',
      excerpt: 'Rain stitches silver across the lane.\nThe evening gathers its quiet again.',
      rightsBasis: 'original',
      credit: 'Original AI-assisted demonstration text prepared for Averiq; not a textbook excerpt.',
      explanation: text('The verb “stitches” presents rainfall as fine repeated lines. “The evening gathers” gives an abstract time of day an action, creating a gentle personification.'),
      vocabulary: [
        { word: 'imagery', meaning: 'Language that evokes sensory experience.' },
        { word: 'personification', meaning: 'Presenting a non-human thing with a human-like action or quality.' },
      ],
      themes: ['Quiet observation'],
      literaryDevices: ['Visual imagery', 'Personification'],
    }),
    block('interpretation-steps', 'stepByStep', {
      title: 'A simple interpretation method',
      steps: [
        { id: 'notice', reason: text('Notice the specific word or image.') },
        { id: 'effect', reason: text('Explain what the choice helps the reader imagine.') },
        { id: 'support', reason: text('Connect the effect to a defensible interpretation rather than guessing an author’s intention.') },
      ],
    }),
  ],
};

const lesson = (
  key: string,
  title: string,
  document: unknown,
  minutes: number,
) => ({
  key,
  title,
  slug: key,
  position: 0,
  lessonType: 'concept',
  estimatedMinutes: minutes,
  contentVersion: 1,
  authorSource: 'Averiq development sample · AI-assisted · not human-reviewed',
  document,
});

const topicNames = [
  ['electric-charge', 'Electric Charge'],
  ['properties-of-charge', 'Properties of Charge'],
  ['conductors-and-insulators', 'Conductors and Insulators'],
  ['coulombs-law', "Coulomb's Law"],
  ['electric-field', 'Electric Field'],
  ['electric-field-lines', 'Electric Field Lines'],
  ['electric-flux', 'Electric Flux'],
  ['gauss-law', "Gauss's Law"],
];

export const sample = AcademicImportSchema.parse({
  formatVersion: 1,
  importKey: 'sample-cbse-class-12-2026-27-v1',

  academicYear: {
    code: '2026-27',
    label: '2026–27',
    startYear: 2026,
    endYear: 2027,
  },

  board: { code: 'cbse', title: 'CBSE' },

  track: {
    code: 'cbse-senior-secondary',
    title: 'CBSE senior secondary',
    minimumGrade: 11,
    maximumGrade: 12,
  },

  gradeLevel: 12,
  revision: 1,

  source: {
    kind: 'sample',
    name: 'Architecture demonstration; not an official syllabus import',
    url: null,
    documentReference: null,
    publicationDate: null,
  },

  combinations: ['pcm', 'pcb', 'pcmb'].map((code) => ({
    code,
    title: code.toUpperCase(),
    streamCode: 'science',
    streamTitle: 'Science',
  })),

  extraSubjects: [
    { code: 'mathematics', title: 'Mathematics' },
    { code: 'chemistry', title: 'Chemistry' },
    { code: 'biology', title: 'Biology' },
  ],

  legacyCatalogVersion: 'starter-2026-27-v1',

  aliases: {
    subjects: {
      physics: 'physics',
      english: 'english',
      mathematics: 'mathematics',
      chemistry: 'chemistry',
      biology: 'biology',
    },
    combinations: { pcm: 'pcm', pcb: 'pcb', pcmb: 'pcmb' },
  },

  assets: [],

  subjects: [
    {
      code: 'physics',
      title: 'Physics',
      slug: 'physics',
      position: 0,

      rules: ['pcm', 'pcb', 'pcmb'].map((combinationCode) => ({
        combinationCode,
        role: 'required',
      })),

      courses: [{
        key: 'sample-electrostatics-course',
        title: 'Original electrostatics demonstration course',
        slug: 'sample-electrostatics-course',
        position: 0,

        chapters: [{
          key: 'electric-charges-and-fields',
          title: 'Electric Charges and Fields',
          slug: 'electric-charges-and-fields',
          chapterNumber: '1',
          position: 0,
          description: 'Representative chapter structure, pending official syllabus verification.',
          estimatedMinutes: 35,

          topics: topicNames.map(([key, title], position) => ({
            key,
            title,
            slug: key,
            position,

            lessons: key === 'electric-charge'
              ? [lesson('charge-introduction', 'Understanding electric charge', chargeIntroduction, 4)]
              : key === 'coulombs-law'
                ? [lesson('coulomb-reference', 'Force, field and a worked example', electrostatics, 12)]
                : [],
          })),
        }],
      }],
    },

    {
      code: 'english',
      title: 'English',
      slug: 'english',
      position: 1,
      rules: [{ combinationCode: null, role: 'optional' }],
      courses: [],

      chapters: [{
        key: 'reading-original-language',
        title: 'Reading original language',
        slug: 'reading-original-language',
        position: 0,
        description: 'A small generic literature-rendering test.',

        topics: [{
          key: 'imagery',
          title: 'Imagery and interpretation',
          slug: 'imagery',
          position: 0,
          lessons: [
            lesson('imagery-reference', 'How imagery shapes meaning', literature, 4),
          ],
        }],
      }],
    },
  ],
});

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  process.stdout.write(JSON.stringify(sample, null, 2));
}
