import { describe, expect, it } from 'vitest';
import { readerCacheContext, restoreReader } from './reader-cache';
import type { ReaderBundle } from '@/features/curriculum/model';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const identity = (n: number) => ({ id: uuid(n), created_at: '2026-09-09', updated_at: '2026-09-09' });
const ordered = (n: number, title: string) => ({ ...identity(n), title, slug: title.toLowerCase(), position: 1, status: 'published' as const });
const lesson = { ...ordered(1, 'Imagery'), topic_id: uuid(2), lesson_type: 'concept', estimated_minutes: 5 };
const topic = { ...ordered(2, 'Poetry'), chapter_id: uuid(3) };
const document = { schemaVersion: 2, blocks: [{ id: 'intro', type: 'paragraph', data: { content: [{ type: 'text', text: 'An authored explanation.' }] } }] };
const bundle: ReaderBundle = {
  lesson, topic,
  chapter: { ...ordered(3, 'Language'), curriculum_subject_id: uuid(4), course_id: null, chapter_number: '1', description: '', estimated_minutes: 5 },
  placement: { ...ordered(4, 'English'), subject_id: uuid(5), release_id: uuid(6) },
  subject: { ...identity(5), title: 'English', code: 'english', status: 'active' },
  release: { ...identity(6), import_key: 'test', academic_year_id: uuid(7), track_id: uuid(8), grade_level: 10, revision: 1, data_kind: 'official', status: 'published', verification_status: 'verified', source_name: 'Test fixture', source_url: null },
  course: null,
  outline: [{ topic, lessons: [lesson] }],
  version: { ...identity(9), lesson_id: lesson.id, version: 3, status: 'published', content_schema_version: 2, content: document, author_source: 'Test fixture', review_status: 'reviewed', accuracy_status: 'verified', alignment_status: 'verified', rights_status: 'original' },
};

describe('downloaded reader context', () => {
  it('round-trips real subject, chapter, outline and version without substituting Physics', () => {
    expect(restoreReader(readerCacheContext(bundle), lesson.id, { ...bundle.version, content: undefined }, document)).toEqual(bundle);
  });
  it('rejects legacy documents that lack their academic context', () => {
    expect(restoreReader({}, lesson.id, bundle.version, document)).toBeNull();
  });
  it('rejects mismatched lesson/version and chapter/placement combinations', () => {
    expect(restoreReader(readerCacheContext(bundle), uuid(10), bundle.version, document)).toBeNull();
    expect(restoreReader({ ...readerCacheContext(bundle), placement: { ...bundle.placement, id: uuid(10) } }, lesson.id, bundle.version, document)).toBeNull();
  });
  it('never restores a draft version or an unsupported document envelope', () => {
    expect(restoreReader(readerCacheContext(bundle), lesson.id, { ...bundle.version, status: 'draft' }, document)).toBeNull();
    expect(restoreReader(readerCacheContext(bundle), lesson.id, bundle.version, { schemaVersion: 99, blocks: [] })).toBeNull();
  });
});
