export type BoardCode = 'cbse' | 'cisce';
export type DepthLevel = 'foundation' | 'board' | 'advanced';
export type BlockType = 'overview' | 'learning_objectives' | 'prerequisites' | 'introduction' | 'concept' | 'definition' | 'explanation' | 'derivation' | 'proof' | 'law' | 'principle' | 'theorem' | 'formula' | 'application' | 'worked_example' | 'common_mistake' | 'misconception' | 'exam_note' | 'key_points' | 'summary' | 'quick_revision' | 'detailed_revision' | 'practice' | 'comparison' | 'note' | 'list' | 'table';

export interface ContentBlock {
  block_key: string;
  position: number;
  block_type: BlockType;
  depth_level: DepthLevel;
  heading?: string;
  body: string;
  metadata?: Record<string, unknown>;
  visual_slot_key?: string;
}

export interface KeyTerm {
  block_key?: string;
  term: string;
  definition: string;
  position: number;
  metadata?: Record<string, unknown>;
}

export interface FormulaVariable {
  symbol: string;
  meaning: string;
  unit?: string | null;
}

export interface Formula {
  block_key?: string;
  formula_key: string;
  position: number;
  kind: 'formula' | 'theorem' | 'law' | 'principle' | 'identity' | 'rule';
  name: string;
  statement: string;
  expression_latex?: string;
  derivation?: string;
  conditions?: string;
  variables?: FormulaVariable[];
  units_notes?: string;
  common_mistakes?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkedExample {
  block_key?: string;
  example_key: string;
  position: number;
  title?: string;
  problem_statement: string;
  given_data?: string;
  approach?: string;
  solution: string;
  final_answer?: string;
  explanation?: string;
  depth_level: DepthLevel;
  difficulty: 'easy' | 'medium' | 'hard' | 'advanced';
  metadata?: Record<string, unknown>;
}

export type QuestionType = 'mcq' | 'true_false' | 'fill_blank' | 'match' | 'very_short' | 'short_answer' | 'long_answer' | 'numerical' | 'assertion_reason' | 'case_based' | 'competency' | 'hots' | 'proof' | 'derivation';

export interface Exercise {
  block_key?: string;
  question_key: string;
  position: number;
  question_type: QuestionType;
  question_text: string;
  options?: Array<{ key: string; text: string }>;
  answer?: unknown;
  solution?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'advanced';
  marks?: number;
  competency_tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface SourceReference {
  source_key: string;
  source_name: string;
  source_url: string;
  source_role: 'syllabus' | 'curriculum' | 'textbook_reference' | 'oer' | 'reference' | 'fact_check' | 'validation';
  authority_level: 'official' | 'primary' | 'secondary' | 'supplementary';
  license_code?: string;
  rights_status: 'metadata_only' | 'reference_only' | 'adaptation_allowed' | 'commercial_reuse_allowed' | 'permission_required';
  source_document?: string;
  source_publication_date?: string;
  metadata?: Record<string, unknown>;
}

export interface TopicDefinition {
  title: string;
  slug: string;
  position: number;
}

export interface LessonDefinition {
  title: string;
  slug: string;
  position: number;
  lesson_type?: string;
  estimated_minutes?: number;
}

export interface LessonPayload {
  topic: TopicDefinition;
  lesson: LessonDefinition;
  blocks: ContentBlock[];
  key_terms?: KeyTerm[];
  formulas?: Formula[];
  examples?: WorkedExample[];
  exercises?: Exercise[];
  sources: SourceReference[];
}

export interface ChapterDefinition {
  chapter_number: string;
  title: string;
  slug: string;
  position: number;
  description?: string;
  lessons: LessonPayload[];
}

export interface SubjectDefinition {
  code: string;
  title: string;
  slug: string;
  position: number;
  chapters: ChapterDefinition[];
}

export interface CurriculumPackage {
  board_code: BoardCode;
  track_code: string;
  track_title: string;
  minimum_grade: number;
  maximum_grade: number;
  grade_level: number;
  academic_year: string;
  source_name: string;
  source_url?: string;
  source_document?: string;
  syllabus_verified: boolean;
  subjects: SubjectDefinition[];
}
