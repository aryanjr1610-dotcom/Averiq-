import { supabaseAdmin } from './supabaseAdmin';
import type { CurriculumPackage, SubjectDefinition, ChapterDefinition, LessonPayload } from './types';
import { lessonPayloadSchema } from './schema';

export async function ensureRelease(curriculum: CurriculumPackage): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('ensure_curriculum_release_v1', {
    p_board_code: curriculum.board_code,
    p_track_code: curriculum.track_code,
    p_track_title: curriculum.track_title,
    p_minimum_grade: curriculum.minimum_grade,
    p_maximum_grade: curriculum.maximum_grade,
    p_grade_level: curriculum.grade_level,
    p_academic_year_code: curriculum.academic_year,
    p_source_name: curriculum.source_name,
    p_source_url: curriculum.source_url ?? null,
    p_source_document: curriculum.source_document ?? null,
    p_verified: curriculum.syllabus_verified,
  });
  if (error) {
    throw new Error(`ensureRelease failed: ${error.message}`);
  }
  return data as string;
}

export async function ensureSubject(releaseId: string, subject: SubjectDefinition): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('ensure_curriculum_subject_v1', {
    p_release_id: releaseId,
    p_subject_code: subject.code,
    p_subject_title: subject.title,
    p_subject_slug: subject.slug,
    p_position: subject.position,
  });
  if (error) {
    throw new Error(`ensureSubject failed: ${error.message}`);
  }
  return data as string;
}

export async function ensureChapter(curriculumSubjectId: string, chapter: ChapterDefinition): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('ensure_chapter_v1', {
    p_curriculum_subject_id: curriculumSubjectId,
    p_title: chapter.title,
    p_slug: chapter.slug,
    p_chapter_number: chapter.chapter_number,
    p_position: chapter.position,
    p_description: chapter.description ?? '',
  });
  if (error) {
    throw new Error(`ensureChapter failed: ${error.message}`);
  }
  return data as string;
}

export async function ingestLesson(chapterId: string, payload: LessonPayload, jobKey: string) {
  const validated = lessonPayloadSchema.parse(payload);
  const { data, error } = await supabaseAdmin.rpc('ingest_lesson_content_v3', {
    p_chapter_id: chapterId,
    p_payload: validated,
    p_job_key: jobKey,
  });
  if (error) {
    throw new Error(`ingestLesson failed: ${error.message}`);
  }
  return data as {
    topic_id: string;
    lesson_id: string;
    version_id: string;
    version: number;
    payload_hash: string;
    counts: { blocks: number; key_terms: number; formulas: number; examples: number; exercises: number; sources: number; };
  };
}

export async function markValidation(versionId: string, checkKey: string, status: 'pending' | 'passed' | 'failed' | 'warning', score?: number, details: Record<string, unknown> = {}) {
  const { error } = await supabaseAdmin.rpc('set_lesson_validation_v1', {
    p_version_id: versionId,
    p_check_key: checkKey,
    p_status: status,
    p_score: score ?? null,
    p_details: details,
  });
  if (error) {
    throw new Error(`markValidation failed: ${error.message}`);
  }
}

export async function publishVersion(versionId: string) {
  const { data, error } = await supabaseAdmin.rpc('publish_lesson_version_v3', {
    p_version_id: versionId,
  });
  if (error) {
    throw new Error(`publishVersion failed: ${error.message}`);
  }
  return data;
}
