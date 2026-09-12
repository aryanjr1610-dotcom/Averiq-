import { z } from 'zod';
import { ChapterSchema, CourseSchema, LessonSchema, PlacementSchema, ReleaseSchema, SubjectSchema, TopicSchema, VersionSchema, type ReaderBundle } from '@/features/curriculum/model';
import { DocumentEnvelope } from '@/features/learning/content/schema';

const ContextSchema = z.object({
  chapter: ChapterSchema, subject: SubjectSchema, placement: PlacementSchema,
  release: ReleaseSchema, course: CourseSchema.nullable(),
  outline: z.array(z.object({ topic: TopicSchema, lessons: z.array(LessonSchema) })),
});

/** One context per chapter package, not a duplicate outline in every lesson. */
export function readerCacheContext(bundle: ReaderBundle) {
  return { chapter: bundle.chapter, subject: bundle.subject, placement: bundle.placement, release: bundle.release, course: bundle.course, outline: bundle.outline };
}

export function restoreReader(context: unknown, lessonId: string, versionMetadata: unknown, document: unknown): ReaderBundle | null {
  const parsed = ContextSchema.safeParse(context);
  if (!parsed.success || !DocumentEnvelope.safeParse(document).success) return null;
  const metadata = versionMetadata && typeof versionMetadata === 'object' ? versionMetadata : {};
  const version = VersionSchema.safeParse({ ...metadata, content: document });
  if (!version.success || version.data.lesson_id !== lessonId || version.data.status !== 'published') return null;
  const value = parsed.data;
  const entry = value.outline.find((item) => item.lessons.some((lesson) => lesson.id === lessonId));
  const lesson = entry?.lessons.find((item) => item.id === lessonId);
  if (!entry || !lesson || lesson.topic_id !== entry.topic.id || entry.topic.chapter_id !== value.chapter.id ||
      value.chapter.curriculum_subject_id !== value.placement.id || value.placement.subject_id !== value.subject.id ||
      value.placement.release_id !== value.release.id) return null;
  return { ...value, lesson, topic: entry.topic, version: version.data };
}
