import { z } from 'zod';

export const Status = z.enum(['draft', 'review', 'published', 'archived']);

const Identity = {
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
};

const Ordered = {
  ...Identity,
  title: z.string(),
  slug: z.string(),
  position: z.number().int(),
  status: Status,
};

export const AcademicYearSchema = z.object({
  ...Identity,
  code: z.string(),
  label: z.string(),
  start_year: z.number(),
  end_year: z.number(),
  status: z.enum(['active', 'archived']),
});

export const BoardSchema = z.object({
  ...Identity,
  code: z.string(),
  title: z.string(),
  status: z.enum(['active', 'archived']),
});

export const TrackSchema = z.object({
  ...Identity,
  board_id: z.string().uuid().nullable(),
  code: z.string(),
  title: z.string(),
  learning_context: z.enum(['school', 'competitive']),
  minimum_grade: z.number().nullable(),
  maximum_grade: z.number().nullable(),
  status: z.enum(['active', 'archived']),
});

export const StreamSchema = z.object({
  ...Identity,
  code: z.string(),
  title: z.string(),
});

export const SubjectSchema = z.object({
  ...Identity,
  code: z.string(),
  title: z.string(),
  status: z.enum(['active', 'archived']),
});

export const ReleaseSchema = z.object({
  ...Identity,
  import_key: z.string(),
  academic_year_id: z.string().uuid(),
  track_id: z.string().uuid(),
  grade_level: z.number().nullable(),
  revision: z.number(),
  data_kind: z.enum(['sample', 'official']),
  status: Status,
  verification_status: z.string(),
  source_name: z.string(),
  source_url: z.string().nullable(),
});

export const PlacementSchema = z.object({
  ...Ordered,
  release_id: z.string().uuid(),
  subject_id: z.string().uuid(),
});

export const CourseSchema = z.object({
  ...Ordered,
  curriculum_subject_id: z.string().uuid(),
});

export const ChapterSchema = z.object({
  ...Ordered,
  curriculum_subject_id: z.string().uuid(),
  course_id: z.string().uuid().nullable(),
  chapter_number: z.string().nullable(),
  description: z.string(),
  estimated_minutes: z.number().nullable(),
});

export const TopicSchema = z.object({
  ...Ordered,
  chapter_id: z.string().uuid(),
});

export const LessonSchema = z.object({
  ...Ordered,
  topic_id: z.string().uuid(),
  lesson_type: z.string(),
  estimated_minutes: z.number().nullable(),
});

export const VersionSchema = z.object({
  ...Identity,
  lesson_id: z.string().uuid(),
  version: z.number(),
  status: Status,
  content_schema_version: z.number(),
  content: z.unknown(),
  author_source: z.string(),
  review_status: z.string(),
  accuracy_status: z.string(),
  alignment_status: z.string(),
  rights_status: z.string(),
});

export const ResolutionSchema = z.object({
  status: z.enum([
    'ready', 'partial', 'profile_required',
    'unavailable', 'mapping_required', 'ambiguous',
  ]),
  release_id: z.string().uuid().nullable(),
  unmapped_subject_keys: z.array(z.string()),
  unavailable_subject_keys: z.array(z.string()),
  needs_path_mapping: z.boolean(),
  subjects: z.array(PlacementSchema),
});

export const AssetSchema = z.object({
  id: z.string().uuid(),
  bucket: z.string(),
  object_path: z.string(),
  alt_text: z.string(),
  credit: z.string(),
  license_reference: z.string(),
});

export type AcademicYear = z.infer<typeof AcademicYearSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type CurriculumTrack = z.infer<typeof TrackSchema>;
export type Stream = z.infer<typeof StreamSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
export type CurriculumSubject = z.infer<typeof PlacementSchema>;
export type Course = z.infer<typeof CourseSchema>;
export type Chapter = z.infer<typeof ChapterSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Lesson = z.infer<typeof LessonSchema>;
export type LessonVersion = z.infer<typeof VersionSchema>;
export type CurriculumResolution = z.infer<typeof ResolutionSchema>;

export type ReaderBundle = {
  lesson: Lesson;
  version: LessonVersion;
  topic: Topic;
  chapter: Chapter;
  subject: Subject;
  placement: CurriculumSubject;
  release: z.infer<typeof ReleaseSchema>;
  course: Course | null;
  outline: Array<{ topic: Topic; lessons: Lesson[] }>;
};
