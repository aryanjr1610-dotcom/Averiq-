import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import {
  normalizedResourcesToDocument,
  parseNormalizedResources,
  type NormalizedStudyResources,
} from './normalized-content';
import {
  ensureCurriculumVisual,
  type CurriculumVisualSeed,
} from '@/features/visuals/curriculum';

import {
  AcademicYearSchema,
  AssetSchema,
  BoardSchema,
  ChapterSchema,
  CourseSchema,
  LessonSchema,
  PlacementSchema,
  ReleaseSchema,
  ResolutionSchema,
  SubjectSchema,
  TopicSchema,
  TrackSchema,
  VersionSchema,
} from './model';

import type { ReaderBundle } from './model';

type Table =
  | 'academic_years'
  | 'education_boards'
  | 'curriculum_tracks'
  | 'curriculum_releases'
  | 'curriculum_subjects'
  | 'subjects'
  | 'courses'
  | 'chapters'
  | 'topics'
  | 'lessons'
  | 'lesson_versions';

type Filters = Record<string, string | string[]>;

export class AcademicUnavailableError extends Error {}

async function one<T>(
  table: Table,
  schema: z.ZodType<T>,
  id: string,
): Promise<T> {
  const { data, error } = await getSupabase()
    .from(table)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    throw new AcademicUnavailableError(
      'This academic resource is unavailable or you do not have access.',
    );
  }

  return schema.parse(data);
}

async function list<T>(
  table: Table,
  schema: z.ZodType<T>,
  filters: Filters = {},
  order = 'position',
  projection = '*',
): Promise<T[]> {
  const result: T[] = [];
  const pageSize = 200;

  for (let start = 0; start < 10000; start += pageSize) {
    let query = getSupabase().from(table).select(projection);

    for (const [column, value] of Object.entries(filters)) {
      query = Array.isArray(value)
        ? query.in(column, value)
        : query.eq(column, value);
    }

    const { data, error } = await query
      .order(order)
      .order('id')
      .range(start, start + pageSize - 1);

    if (error) throw error;

    const rows = z.array(schema).parse(data);
    result.push(...rows);

    if (rows.length < pageSize) return result;
  }

  throw new AcademicUnavailableError(
    'This collection exceeds the development retrieval limit.',
  );
}

const lookupCache = new Map<string, {
  expiresAt: number;
  value: unknown;
}>();

async function cachedLookup<T>(
  key: string,
  load: () => Promise<T>,
): Promise<T> {
  const cached = lookupCache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const value = await load();

  lookupCache.set(key, {
    expiresAt: Date.now() + 60_000,
    value,
  });

  return value;
}

async function normalizedResources(versionId: string): Promise<NormalizedStudyResources> {
  const { data, error } = await getSupabase()
    .from('lesson_version_content_v3')
    .select('version_id,lesson_id,blocks,key_terms,formulas,examples,exercises,sources')
    .eq('version_id', versionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new AcademicUnavailableError('Normalized lesson content is unavailable.');
  return parseNormalizedResources(data as Record<string, unknown>);
}

function usesNormalizedStorage(content: unknown, schemaVersion: number): boolean {
  if (schemaVersion >= 3) return true;
  if (typeof content !== 'object' || content === null) return false;
  return (content as Record<string, unknown>).storage === 'normalized_v3';
}

async function visualSeedForLesson(lessonId: string): Promise<CurriculumVisualSeed> {
  return cachedLookup(`visual-seed:${lessonId}`, async () => {
    const lesson = await one('lessons', LessonSchema, lessonId);
    const topic = await one('topics', TopicSchema, lesson.topic_id);
    const chapter = await one('chapters', ChapterSchema, topic.chapter_id);
    const placement = await one(
      'curriculum_subjects',
      PlacementSchema,
      chapter.curriculum_subject_id,
    );
    const subject = await one('subjects', SubjectSchema, placement.subject_id);

    return {
      subjectCode: subject.code,
      lessonTitle: lesson.title,
      topicTitle: topic.title,
      chapterTitle: chapter.title,
    };
  });
}

export const curriculumRepository = {
  clearCache() {
    lookupCache.clear();
  },

  async isReviewer() {
    const { data, error } = await getSupabase().rpc('academic_is_reviewer');
    if (error) throw error;
    return data === true;
  },

  async requireReviewer() {
    if (!await curriculumRepository.isReviewer()) {
      throw new AcademicUnavailableError(
        'An academic reviewer role is required to preview unpublished material.',
      );
    }
  },

  async resolveStudent() {
    const { data, error } = await getSupabase().rpc('resolve_my_curriculum');
    if (error) throw error;
    return ResolutionSchema.parse(data);
  },

  async resolveMyCurriculum() {
    return curriculumRepository.resolveStudent();
  },

  async getAvailableCurriculum() {
    return list(
      'curriculum_releases',
      ReleaseSchema,
      { status: 'published', verification_status: 'verified', data_kind: 'official' },
      'revision',
    );
  },

  getYears: () => cachedLookup(
    'years',
    () => list('academic_years', AcademicYearSchema, {}, 'start_year'),
  ),

  getBoards: () => cachedLookup(
    'boards',
    () => list('education_boards', BoardSchema, {}, 'code'),
  ),

  getTracks: () => cachedLookup(
    'tracks',
    () => list('curriculum_tracks', TrackSchema, {}, 'code'),
  ),

  getSubject: (id: string) => one('subjects', SubjectSchema, id),

  getBooksForSubject: (id: string) =>
    list('courses', CourseSchema, { curriculum_subject_id: id }),

  getChapters: (id: string) =>
    list('chapters', ChapterSchema, { curriculum_subject_id: id }),

  getChapter: (id: string) => one('chapters', ChapterSchema, id),

  getTopics: (id: string) =>
    list('topics', TopicSchema, { chapter_id: id }),

  getTopic: (id: string) => one('topics', TopicSchema, id),

  getLessonMetadata: (id: string) => one('lessons', LessonSchema, id),

  async getReviewReleases() {
    await curriculumRepository.requireReviewer();
    return list('curriculum_releases', ReleaseSchema, {}, 'revision');
  },

  async getReviewSubjects(releaseId: string) {
    await curriculumRepository.requireReviewer();
    return list('curriculum_subjects', PlacementSchema, { release_id: releaseId });
  },

  async getOutline(chapterId: string, preview = false) {
    const topics = await list(
      'topics',
      TopicSchema,
      {
        chapter_id: chapterId,
        ...(preview ? {} : { status: 'published' }),
      },
    );

    if (!topics.length) return [];

    const lessons = await list(
      'lessons',
      LessonSchema,
      {
        topic_id: topics.map((topic) => topic.id),
        ...(preview ? {} : { status: 'published' }),
      },
    );

    if (!lessons.length) {
      return topics.map((topic) => ({ topic, lessons: [] }));
    }

    const versions = await list(
      'lesson_versions',
      z.object({ lesson_id: z.string().uuid() }),
      {
        lesson_id: lessons.map((lesson) => lesson.id),
        ...(preview ? {} : { status: 'published' }),
      },
      'version',
      'lesson_id',
    );

    const available = new Set(versions.map((version) => version.lesson_id));

    return topics.map((topic) => ({
      topic,
      lessons: lessons
        .filter((lesson) =>
          lesson.topic_id === topic.id && available.has(lesson.id),
        )
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
    }));
  },

  async getLatestContent(
    lessonId: string,
    preview = false,
    visualSeed?: CurriculumVisualSeed,
  ) {
    if (preview) {
      await curriculumRepository.requireReviewer();
    } else {
      const access = await getSupabase().rpc(
        'academic_can_read_lesson',
        { p_id: lessonId },
      );

      if (access.error) throw access.error;

      if (access.data !== true) {
        throw new AcademicUnavailableError('This lesson is not available for your profile.');
      }
    }

    let query = getSupabase()
      .from('lesson_versions')
      .select('*')
      .eq('lesson_id', lessonId);

    if (!preview) query = query.eq('status', 'published');

    const { data, error } = await query
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AcademicUnavailableError('No readable content version is available.');

    const version = VersionSchema.parse(data);
    let content: unknown = version.content;

    if (usesNormalizedStorage(version.content, version.content_schema_version)) {
      const resources = await normalizedResources(version.id);
      content = normalizedResourcesToDocument(resources);
    }

    const seed = visualSeed ?? await visualSeedForLesson(lessonId);

    return {
      ...version,
      content: ensureCurriculumVisual(content, seed),
    };
  },

  getStudyResources(versionId: string) {
    return normalizedResources(versionId);
  },

  async getReader(lessonId: string, preview = false): Promise<ReaderBundle> {
    if (preview) {
      await curriculumRepository.requireReviewer();
    } else {
      const { data, error } = await getSupabase().rpc(
        'academic_can_read_lesson',
        { p_id: lessonId },
      );

      if (error) throw error;

      if (data !== true) {
        throw new AcademicUnavailableError(
          'This lesson is not published for your current academic profile.',
        );
      }
    }

    const lesson = await one('lessons', LessonSchema, lessonId);
    const topic = await one('topics', TopicSchema, lesson.topic_id);
    const chapter = await one('chapters', ChapterSchema, topic.chapter_id);
    const placement = await one(
      'curriculum_subjects',
      PlacementSchema,
      chapter.curriculum_subject_id,
    );

    const [subject, release, course, outline] = await Promise.all([
      one('subjects', SubjectSchema, placement.subject_id),
      one('curriculum_releases', ReleaseSchema, placement.release_id),
      chapter.course_id
        ? one('courses', CourseSchema, chapter.course_id)
        : Promise.resolve(null),
      curriculumRepository.getOutline(chapter.id, preview),
    ]);

    const version = await curriculumRepository.getLatestContent(
      lessonId,
      preview,
      {
        subjectCode: subject.code,
        lessonTitle: lesson.title,
        topicTitle: topic.title,
        chapterTitle: chapter.title,
      },
    );

    return {
      lesson,
      version,
      topic,
      chapter,
      subject,
      placement,
      release,
      course,
      outline,
    };
  },

  async getAsset(assetId: string) {
    const { data, error } = await getSupabase()
      .from('content_assets')
      .select('id,bucket,object_path,alt_text,credit,license_reference')
      .eq('id', assetId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AcademicUnavailableError('Asset unavailable.');

    const asset = AssetSchema.parse(data);

    const signed = await getSupabase()
      .storage
      .from(asset.bucket)
      .createSignedUrl(asset.object_path, 120);

    if (signed.error) throw signed.error;

    return {
      ...asset,
      url: signed.data.signedUrl,
    };
  },
};
