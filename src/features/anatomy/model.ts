export type AnatomyLayer = 'surface' | 'skeletal' | 'muscular' | 'organs' | 'nervous' | 'circulatory'
export const ANATOMY_LAYERS: AnatomyLayer[] = ['surface', 'skeletal', 'muscular', 'organs', 'nervous', 'circulatory']

export type AnatomyViewPreset = 'default' | 'front' | 'back' | 'side' | 'top' | 'focused'

export type CurriculumRef = {
  subjectId?: string
  chapterId?: string
  topicId?: string
  lessonId?: string
  examKey?: string
  label?: string
}

export type AnatomyStructure = {
  slug: string
  name: string
  objectKey: string
  location: string
  structure: string
  function: string
  flowRole: string
  layer: AnatomyLayer
  essential: boolean
  curriculum?: CurriculumRef
}

export type AnatomyProcessStep = {
  key: string
  title: string
  description: string
  highlight: string[]
  cameraPreset?: AnatomyViewPreset
}

export type AnatomyProcess = {
  slug: string
  name: string
  summary: string
  stepDurationMs: number
  steps: AnatomyProcessStep[]
}

export type AnatomyOrgan = {
  slug: string
  name: string
  summary: string
  visualizationId?: string
  structures: AnatomyStructure[]
  processes: AnatomyProcess[]
  curriculum?: CurriculumRef
}

export type AnatomySystem = {
  slug: string
  name: string
  summary: string
  organs: AnatomyOrgan[]
  curriculum?: CurriculumRef
}

export type AnatomyAssetCredit = {
  source: string
  license: string
  credit: string
  reviewStatus: 'unreviewed' | 'reviewed' | 'rejected'
  accuracyStatus: 'unverified' | 'educationally-accurate' | 'needs-work'
}

/** Systems the engine supports. Only the populated ones expose organs. */
export const SUPPORTED_SYSTEMS: Array<{ slug: string; name: string; summary: string }> = [
  { slug: 'circulatory', name: 'Circulatory system', summary: 'Heart, blood vessels and the transport of blood.' },
  { slug: 'nervous', name: 'Nervous system', summary: 'Brain, spinal cord and nerve signalling.' },
  { slug: 'respiratory', name: 'Respiratory system', summary: 'Airways, lungs and gas exchange.' },
  { slug: 'digestive', name: 'Digestive system', summary: 'Ingestion, digestion, absorption and egestion.' },
  { slug: 'skeletal', name: 'Skeletal system', summary: 'Bones, joints and support.' },
  { slug: 'muscular', name: 'Muscular system', summary: 'Muscle types and movement.' },
  { slug: 'endocrine', name: 'Endocrine system', summary: 'Hormones and chemical coordination.' },
  { slug: 'urinary', name: 'Excretory system', summary: 'Kidneys, filtration and osmoregulation.' },
  { slug: 'lymphatic', name: 'Lymphatic and immune system', summary: 'Lymph, defence and immunity.' },
  { slug: 'reproductive', name: 'Reproductive system', summary: 'Reproductive organs and processes.' },
]

const heart: AnatomyOrgan = {
  slug: 'heart',
  name: 'Heart',
  summary:
    'A four-chambered muscular pump that keeps pulmonary and systemic circulation separate, so oxygenated and deoxygenated blood never mix in a healthy adult heart.',
  visualizationId: 'anatomy-heart-3d',
  structures: [
    {
      slug: 'right-atrium', name: 'Right atrium', objectKey: 'ra', layer: 'circulatory', essential: true,
      location: 'Upper right chamber, receiving the great veins.',
      structure: 'Thin-walled chamber; receives the superior and inferior vena cava.',
      function: 'Collects deoxygenated blood returning from the body and passes it to the right ventricle.',
      flowRole: 'Step 1 of pulmonary circulation: body → right atrium.',
    },
    {
      slug: 'right-ventricle', name: 'Right ventricle', objectKey: 'rv', layer: 'circulatory', essential: true,
      location: 'Lower right chamber.',
      structure: 'Moderately thick muscular wall — enough pressure for the short pulmonary route.',
      function: 'Pumps deoxygenated blood into the pulmonary artery towards the lungs.',
      flowRole: 'Step 2: right atrium → right ventricle → pulmonary artery.',
    },
    {
      slug: 'left-atrium', name: 'Left atrium', objectKey: 'la', layer: 'circulatory', essential: true,
      location: 'Upper left chamber.',
      structure: 'Thin-walled chamber receiving the pulmonary veins.',
      function: 'Receives oxygenated blood from the lungs and passes it to the left ventricle.',
      flowRole: 'Step 4: lungs → pulmonary veins → left atrium.',
    },
    {
      slug: 'left-ventricle', name: 'Left ventricle', objectKey: 'lv', layer: 'circulatory', essential: true,
      location: 'Lower left chamber.',
      structure: 'Thickest myocardium in the heart, because it drives the whole systemic circuit.',
      function: 'Pumps oxygenated blood into the aorta and onwards to the entire body.',
      flowRole: 'Step 5: left atrium → left ventricle → aorta → body.',
    },
    {
      slug: 'tricuspid-valve', name: 'Tricuspid valve', objectKey: 'tricuspid', layer: 'circulatory', essential: true,
      location: 'Between right atrium and right ventricle.',
      structure: 'Three cusps anchored by chordae tendineae.',
      function: 'Prevents backflow into the right atrium during ventricular contraction.',
      flowRole: 'One-way gate on the right side.',
    },
    {
      slug: 'bicuspid-valve', name: 'Bicuspid (mitral) valve', objectKey: 'mitral', layer: 'circulatory', essential: true,
      location: 'Between left atrium and left ventricle.',
      structure: 'Two cusps, also anchored by chordae tendineae.',
      function: 'Prevents backflow into the left atrium during ventricular contraction.',
      flowRole: 'One-way gate on the left side.',
    },
    {
      slug: 'aorta', name: 'Aorta', objectKey: 'aorta', layer: 'circulatory', essential: true,
      location: 'Leaves the left ventricle and arches over the heart.',
      structure: 'Largest artery; thick elastic wall that stores pressure energy.',
      function: 'Carries oxygenated blood to systemic circulation.',
      flowRole: 'Exit of systemic circulation.',
    },
    {
      slug: 'pulmonary-artery', name: 'Pulmonary artery', objectKey: 'pa', layer: 'circulatory', essential: true,
      location: 'Leaves the right ventricle, divides towards both lungs.',
      structure: 'The only artery carrying deoxygenated blood in an adult.',
      function: 'Carries deoxygenated blood to the lungs for gas exchange.',
      flowRole: 'Step 3: right ventricle → lungs.',
    },
    {
      slug: 'pulmonary-veins', name: 'Pulmonary veins', objectKey: 'pv', layer: 'circulatory', essential: true,
      location: 'Enter the left atrium from both lungs.',
      structure: 'The only veins carrying oxygenated blood in an adult.',
      function: 'Return oxygenated blood from the lungs to the heart.',
      flowRole: 'Step 4 inflow.',
    },
    {
      slug: 'vena-cava', name: 'Superior and inferior vena cava', objectKey: 'vc', layer: 'circulatory', essential: true,
      location: 'Enter the right atrium from above and below.',
      structure: 'Two large veins with thin walls and low pressure.',
      function: 'Return deoxygenated blood from the upper and lower body.',
      flowRole: 'Entry of pulmonary circulation.',
    },
  ],
  processes: [
    {
      slug: 'double-circulation',
      name: 'Double circulation (blood flow)',
      summary: 'Blood passes through the heart twice per complete circuit — once for the lungs, once for the body.',
      stepDurationMs: 2800,
      steps: [
        { key: 'body-in', title: 'Body → vena cava', description: 'Deoxygenated blood from the body returns through the superior and inferior vena cava.', highlight: ['vc'], cameraPreset: 'front' },
        { key: 'ra', title: 'Right atrium', description: 'The right atrium fills, then contracts, pushing blood through the tricuspid valve.', highlight: ['ra', 'tricuspid'] },
        { key: 'rv', title: 'Right ventricle', description: 'The right ventricle contracts and drives blood into the pulmonary artery.', highlight: ['rv', 'pa'] },
        { key: 'lungs', title: 'Lungs', description: 'In the pulmonary capillaries carbon dioxide leaves and oxygen enters the blood.', highlight: ['pa', 'pv'], cameraPreset: 'side' },
        { key: 'la', title: 'Left atrium', description: 'Oxygenated blood returns via the pulmonary veins and fills the left atrium.', highlight: ['pv', 'la', 'mitral'] },
        { key: 'lv', title: 'Left ventricle', description: 'The thick-walled left ventricle contracts hardest, sending blood into the aorta.', highlight: ['lv', 'aorta'] },
        { key: 'body-out', title: 'Aorta → body', description: 'The aorta distributes oxygenated blood to the whole body, completing the circuit.', highlight: ['aorta'], cameraPreset: 'default' },
      ],
    },
  ],
}

const brain: AnatomyOrgan = {
  slug: 'brain',
  name: 'Brain',
  summary: 'The control centre of the nervous system, organised into cerebrum, cerebellum and brainstem.',
  structures: [
    {
      slug: 'cerebrum', name: 'Cerebrum', objectKey: 'cerebrum', layer: 'nervous', essential: true,
      location: 'Largest, uppermost part of the brain.',
      structure: 'Two hemispheres with a folded cortex, divided into lobes.',
      function: 'Voluntary action, sensation, memory, reasoning and language.',
      flowRole: '',
    },
    {
      slug: 'cerebellum', name: 'Cerebellum', objectKey: 'cerebellum', layer: 'nervous', essential: true,
      location: 'Below and behind the cerebrum.',
      structure: 'Densely folded tissue with fine parallel folia.',
      function: 'Coordination, posture and balance.',
      flowRole: '',
    },
    {
      slug: 'brainstem', name: 'Brainstem', objectKey: 'brainstem', layer: 'nervous', essential: true,
      location: 'Connects the brain to the spinal cord.',
      structure: 'Midbrain, pons and medulla oblongata.',
      function: 'Controls involuntary vital activities such as breathing and heart rate.',
      flowRole: '',
    },
  ],
  processes: [],
}

export const ANATOMY_SAMPLE: AnatomySystem[] = [
  { slug: 'circulatory', name: 'Circulatory system', summary: 'Heart, blood vessels and the transport of blood.', organs: [heart] },
  { slug: 'nervous', name: 'Nervous system', summary: 'Brain, spinal cord and nerve signalling.', organs: [brain] },
]

export const HEART_MODEL_CREDIT: AnatomyAssetCredit = {
  source: 'No external model bundled. The reference scene is built from geometric primitives.',
  license: 'Original Averiq scene code',
  credit: 'Averiq (AI-assisted, schematic — not a scanned anatomical model)',
  reviewStatus: 'unreviewed',
  accuracyStatus: 'unverified',
}
