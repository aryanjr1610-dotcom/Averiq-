import { sample } from './create-academic-sample';

import { AcademicImportSchema } from '../src/features/curriculum/import-schema';
import { DocumentSchema } from '../src/features/learning/content/schema';

import type { RichText } from '../src/features/learning/content/schema';

const rich = (text: string): RichText => [{ type: 'text', text, marks: [] }];
const paragraph = (id: string, text: string) => ({
  id,
  type: 'paragraph',
  tags: ['learn', 'concept'],
  data: { content: rich(text) },
});

const upgraded = structuredClone(sample);
upgraded.importKey = 'sample-cbse-class-12-2026-27-v2';
upgraded.revision = 2;

const physics = upgraded.subjects.find((subject) => subject.code === 'physics');

const reference = physics?.courses
  .flatMap((course) => course.chapters)
  .flatMap((chapter) => chapter.topics)
  .flatMap((topic) => topic.lessons)
  .find((lesson) => lesson.key === 'coulomb-reference');

if (!reference) throw new Error('The original Physics reference lesson was not found.');

const original = reference.document.blocks;

reference.document = DocumentSchema.parse({
  schemaVersion: 2,
  blocks: [
    {
      id: 'why-fields',
      type: 'heading',
      data: { level: 2, text: 'Why a description of space helps us understand forces' },
    },

    paragraph(
      'everyday-start',
      'Begin with a question rather than a formula. If a charged object is brought near another charged object, the second object may accelerate even though the objects are not touching. A force description tells us how the second object moves. A field description asks a different but closely related question: what influence has the source established at each possible location around it?',
    ),

    paragraph(
      'source-versus-test',
      'This distinction separates the source from the object used to investigate it. Suppose one source charge remains fixed while we try several small positive test charges at the same point. A larger test charge experiences a larger electric force. That does not mean that the source has produced a different field each time. Dividing the measured force by the test charge lets us describe the source’s influence independently of that particular probe.',
    ),

    paragraph(
      'test-charge-meaning',
      'The word “test” therefore expresses an idealization. The probe should be small enough that its presence does not appreciably rearrange the source charges. In a careful definition, the electric field is associated with the limiting force per unit positive test charge as the disturbance caused by the probe becomes negligible. The field is not created by the act of measuring it.',
    ),

    paragraph(
      'vector-foundation',
      'We must also retain direction. A field value is not merely a number written beside a point. It is a vector: it identifies both the strength of the influence and the direction of force on a positive test charge. A negative charge at that point experiences force opposite to the field direction. The field itself does not reverse simply because we choose a negative probe.',
    ),

    {
      id: 'field-quantity',
      type: 'quantity',
      tags: ['learn', 'concept', 'exam'],
      data: {
        name: 'Electric field',
        symbol: '\\vec E',
        quantityType: 'vector',
        meaning: rich('The electric force per unit positive test charge at a specified point, with the probe’s disturbance made negligible.'),
        siUnit: 'N C⁻¹',
        dimensions: 'M L T⁻³ I⁻¹',
        conditions: ['The source arrangement and observation point must be specified.'],
      },
    },

    paragraph(
      'static-model',
      'For the rest of this section, we use electrostatics: the source charges are stationary and the field pattern is time-independent. This model is not a claim that changes in electromagnetic influence propagate instantaneously. It is a description of a static arrangement after transient changes are no longer the subject of the problem.',
    ),

    ...original.filter((block) => block.id !== 'coulomb-context'),

    {
      id: 'reading-vectors',
      type: 'heading',
      data: { level: 2, text: 'Reading a field diagram without being misled by it' },
    },

    paragraph(
      'diagram-contract',
      'A diagram is a representation with conventions, not the field itself. An arrow’s direction can encode the direction of the field, while its length may encode magnitude—or may be normalized so that weak and strong regions are both visible. Before drawing a conclusion, check the diagram’s convention. In the interactive view used here, arrow lengths are normalized; the numerical panel carries quantitative information.',
    ),

    paragraph(
      'superposition-meaning',
      'With two source charges, each source contributes a field vector at the observation point. The resultant is their vector sum. This does not mean that field magnitudes should always be added as positive numbers. Contributions pointing in the same direction reinforce one another; opposite contributions may partially or completely cancel. In a general arrangement, components must be added along consistent coordinate directions.',
    ),

    paragraph(
      'cancellation-example',
      'Consider the midpoint between two equal positive charges. The contribution from the left charge points to the right, while the contribution from the right charge points to the left. Their magnitudes are equal, so the resultant electric field is zero at that midpoint. The individual contributions have not disappeared; their vector sum is zero there. Moving away from the midpoint usually destroys that exact cancellation.',
    ),

    paragraph(
      'opposite-charge-example',
      'Now reverse the sign of one source while keeping its magnitude and location fixed. Between the charges, the contribution away from the positive source and the contribution toward the negative source point in the same direction. The fields reinforce rather than cancel. This comparison is a useful reason to think with vectors before substituting numbers.',
    ),

    {
      id: 'inspect-field',
      type: 'diagram2d',
      tags: ['learn', 'concept'],
      data: {
        diagramId: 'electric-field-2d',
        title: 'Compare equal and opposite source arrangements',
        caption: 'First set two equal positive charges. Then reverse one charge. Watch the direction pattern between them.',
        labels: ['Source positions', 'Charge signs', 'Resultant field direction'],
      },
    },

    paragraph(
      'third-dimension',
      'The flat diagram samples a plane through the source charges. Space is not restricted to that plane. The three-dimensional view lets you rotate the same static model and inspect directions above and below it. It uses the same field calculation as the two-dimensional diagram, so changing the viewpoint changes the representation, not the underlying law.',
    ),

    {
      id: 'inspect-field-three',
      type: 'visualizationReference',
      tags: ['learn', 'concept'],
      data: {
        resourceId: 'electric-field-3d',
        title: 'Inspect the spatial field',
        description: 'Rotate the scene, inspect a source, and compare the live values with the equation in the text.',
        visualizationFamily: 'physics',
      },
    },

    paragraph(
      'model-limits',
      'Finally, recognize where this simple model ends. Treating a small charged body as a point may be reasonable when the observation distance is large compared with its size. Close to an extended object, charge distribution and geometry matter. A material medium may also alter the relation between sources and field. The point-charge equation is a powerful model when its conditions apply, not permission to ignore those conditions.',
    ),

    {
      id: 'reasoned-answer',
      type: 'examAnswerGuidance',
      tags: ['exam'],
      requires: ['field-quantity'],
      data: {
        questionType: 'Explain how electric field differs from electric force',
        expectedReasoning: rich('Distinguish the source-dependent field at a point from the force on a particular charge placed there.'),
        keyPoints: [
          rich('Electric field is a vector quantity associated with a position and source arrangement.'),
          rich('The force depends on both the field and the charge placed at the point.'),
          rich('The sign of the placed charge affects force direction.'),
        ],
        suggestedStructure: [
          rich('Define the two quantities and their units.'),
          rich('Write the vector relation between them.'),
          rich('Explain the role of a positive or negative test charge.'),
        ],
        commonMistake: rich('Do not say that field direction changes whenever a negative test charge is introduced.'),
        basis: 'original-guidance',
      },
    },
  ],
});

for (const block of reference.document.blocks) {
  if (block.type === 'formula' && block.id === 'force-law') {
    block.tags = ['learn', 'concept', 'exam'];
    block.data.derivationBlockId = 'field-derivation';
  }

  if (block.type === 'derivation' && block.id === 'field-derivation') {
    block.tags = ['learn', 'concept', 'exam'];
    block.data.startingConditions = rich(
      'A stationary point source Q is in vacuum. A small positive probe q₀ is at a distance r greater than zero. We first derive a magnitude relation, then interpret direction.',
    );

    block.data.assumptions = [
      'The point-source electrostatic model applies.',
      'The positive test charge does not appreciably disturb the source.',
      'The observation point does not coincide with the source.',
    ];

    block.data.interpretation = rich(
      'The probe charge cancels because field describes the source’s influence per unit positive charge. For a positive source the field points radially outward; for a negative source it points inward.',
    );

    block.data.examNote = 'Explain the cancellation and retain the conditions. This is not a fundamental derivation of Coulomb’s law.';
  }
}

upgraded.subjects.push({
  code: 'mathematics',
  title: 'Mathematics',
  slug: 'mathematics',
  position: 2,
  rules: [
    { combinationCode: 'pcm', role: 'required' },
    { combinationCode: 'pcmb', role: 'required' },
  ],
  courses: [],
  chapters: [{
    key: 'function-transformations',
    title: 'Understanding a sinusoidal family',
    slug: 'function-transformations',
    position: 0,
    description: 'Original demonstration, not a verified syllabus placement.',
    topics: [{
      key: 'sinusoidal-parameters',
      title: 'Amplitude, period and phase',
      slug: 'sinusoidal-parameters',
      position: 0,
      lessons: [{
        key: 'sinusoidal-family',
        title: 'How parameters change a sine graph',
        slug: 'sinusoidal-family',
        position: 0,
        lessonType: 'concept',
        estimatedMinutes: 7,
        contentVersion: 1,
        authorSource: 'Original AI-assisted development sample; not human-reviewed',
        document: DocumentSchema.parse({
          schemaVersion: 2,
          blocks: [
            { id: 'sine-intro', type: 'heading', data: { level: 2, text: 'Begin with a repeating pattern' } },

            paragraph(
              'sine-motivation',
              'The sine function provides a useful model of smooth repetition. Rather than memorizing a different graph for every expression, we can understand how a small set of parameters transforms one familiar graph. Each parameter has a distinct role, and changing one at a time makes that role easier to see.',
            ),

            {
              id: 'sine-formula',
              type: 'formula',
              data: {
                name: 'A sinusoidal family',
                latex: 'y=A\\sin(\\omega x+\\phi)',
                alternative: 'y equals A times sine of omega x plus phi.',
                variables: [
                  { symbol: 'A', meaning: 'Vertical scale; amplitude is the absolute value of A.' },
                  { symbol: 'ω', meaning: 'Horizontal angular coefficient.' },
                  { symbol: 'φ', meaning: 'Phase constant in radians.' },
                ],
                conditions: ['The interactive example restricts A to non-negative values and ω to positive values.'],
              },
            },

            paragraph(
              'sine-period-reasoning',
              'A complete cycle occurs when the argument of sine increases by 2π. If x increases by T, the argument increases by ωT. Therefore a positive angular coefficient gives ωT = 2π, and the period is 2π/ω. A larger positive coefficient compresses the pattern horizontally because a smaller increase in x now completes the same cycle.',
            ),

            {
              id: 'sine-proof',
              type: 'proof',
              data: {
                title: 'Period for a positive angular coefficient',
                statement: rich('Find the horizontal interval that repeats the function.'),
                given: rich('The coefficient ω is positive and sine repeats after an argument increase of 2π.'),
                toProve: rich('The period is 2π/ω.'),
                steps: [
                  { id: 'argument-change', latex: '\\Delta(\\omega x+\\phi)=\\omega T', reason: rich('The phase constant does not change when x increases by T.') },
                  { id: 'one-cycle', latex: '\\omega T=2\\pi', reason: rich('Set the argument increase equal to one full sine cycle.') },
                  { id: 'isolate-period', latex: 'T=\\frac{2\\pi}{\\omega}', reason: rich('Divide by the positive, nonzero coefficient.') },
                ],
                conclusion: rich('Increasing ω decreases the period. The phase constant changes position, not period.'),
              },
            },

            {
              id: 'sine-visual',
              type: 'graphReference',
              tags: ['learn', 'concept'],
              data: {
                visualizationId: 'sine-graph',
                equation: 'y=A\\sin(\\omega x+\\phi)',
                xRange: [-6, 6],
                yRange: [-3.5, 3.5],
                parameters: { amplitude: 1, omega: 1, phase: 0, span: 6 },
                caption: 'Change one parameter at a time. Compare the solid curve with the dashed reference sin(x).',
              },
            },
          ],
        }),
      }],
    }],
  }],
});

const english = upgraded.subjects.find((subject) => subject.code === 'english');
const englishLesson = english?.chapters[0]?.topics[0]?.lessons[0];

if (englishLesson) {
  englishLesson.document = DocumentSchema.parse({
    schemaVersion: 2,
    blocks: [
      ...englishLesson.document.blocks,
      {
        id: 'personification-analysis',
        type: 'literaryDevice',
        data: {
          device: 'Personification',
          sectionReference: 'Original demonstration line: the evening gathers its quiet',
          effect: rich('Giving evening an action turns a change in atmosphere into something the reader can imagine as a gentle movement.'),
          interpretation: rich('A defensible interpretation connects the action to the calm mood of the lines. It should not claim a single compulsory meaning or invent the author’s intention.'),
        },
      },
      {
        id: 'imagery-vocabulary',
        type: 'vocabulary',
        data: {
          entries: [{
            word: 'connotation',
            meaning: rich('An association carried by a word in addition to its direct meaning.'),
            context: rich('Words associated with gathering and quiet can suggest calmness in this original example.'),
            simpleExplanation: rich('Ask what the word makes you think or feel, then support that observation with the actual language.'),
          }],
        },
      },
    ],
  });
}

const finalManifest = AcademicImportSchema.parse(upgraded);
process.stdout.write(JSON.stringify(finalManifest, null, 2));
