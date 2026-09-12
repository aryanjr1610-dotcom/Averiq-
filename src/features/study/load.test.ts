import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curriculumRepository } from '@/features/curriculum/repository';
import { loadStudyCatalog, loadStudyContent } from './load';

vi.mock('@/features/curriculum/repository', () => ({ curriculumRepository: {
  resolveMyCurriculum: vi.fn(), getChapters: vi.fn(), getChapter: vi.fn(), getTopic: vi.fn(), getSubject: vi.fn(), getOutline: vi.fn(), getLatestContent: vi.fn(),
} }));
const api = vi.mocked(curriculumRepository);
const valid = { schemaVersion: 2, blocks: [{ id: 'note', type: 'summary', data: { title: 'Summary', content: [{ type: 'text', text: 'A published explanation.' }] } }] };

describe('chapter study loading', () => {
  beforeEach(() => vi.resetAllMocks());
  it('does not load arbitrary subjects from URL parameters', async () => {
    api.resolveMyCurriculum.mockResolvedValue({ subjects: [{ id: 'mine', subject_id: 'physics' }] } as never);
    expect(await loadStudyCatalog('someone-else', null)).toMatchObject({ chapters: [] });
    expect(api.getChapters).not.toHaveBeenCalled();
  });
  it('only selects a published chapter belonging to the resolved subject', async () => {
    api.resolveMyCurriculum.mockResolvedValue({ subjects: [{ id: 'mine', subject_id: 'physics' }] } as never);
    api.getChapters.mockResolvedValue([{ id: 'published', status: 'published' }, { id: 'draft', status: 'draft' }] as never);
    api.getSubject.mockResolvedValue({ code: 'physics' } as never);
    expect(await loadStudyCatalog('mine', 'draft')).toMatchObject({ chapter: undefined, chapters: [{ id: 'published' }] });
  });
  it('keeps successful lessons in order and reports inaccessible or invalid documents', async () => {
    api.getOutline.mockResolvedValue([{ lessons: [{ id: 'one' }, { id: 'two' }, { id: 'three' }] }] as never);
    api.getLatestContent.mockImplementation(async (id) => {
      if (id === 'two') throw new Error('Access denied');
      return { content: id === 'three' ? { schemaVersion: 900, blocks: [] } : valid } as never;
    });
    const result = await loadStudyContent('chapter');
    expect(result.lessons.map((item) => item.lesson.id)).toEqual(['one']);
    expect(result.unavailable).toBe(2);
    expect(api.getLatestContent).toHaveBeenCalledWith('one');
  });
  it('resolves existing progress topic links to their curriculum chapter', async () => {
    api.resolveMyCurriculum.mockResolvedValue({ subjects: [{ id: 'mine', subject_id: 'physics' }] } as never);
    api.getTopic.mockResolvedValue({ id: 'topic', chapter_id: 'chapter', status: 'published' } as never);
    api.getChapter.mockResolvedValue({ id: 'chapter', curriculum_subject_id: 'mine', status: 'published' } as never);
    api.getChapters.mockResolvedValue([{ id: 'chapter', status: 'published' }] as never);
    api.getSubject.mockResolvedValue({ code: 'physics' } as never);
    expect(await loadStudyCatalog(null, null, 'topic')).toMatchObject({ placement: { id: 'mine' }, chapter: { id: 'chapter' }, topic: { id: 'topic' } });
  });
  it('never substitutes another chapter for a mismatched topic deep link', async () => {
    api.resolveMyCurriculum.mockResolvedValue({ subjects: [{ id: 'mine', subject_id: 'physics' }] } as never);
    api.getTopic.mockResolvedValue({ id: 'topic', chapter_id: 'chapter', status: 'published' } as never);
    api.getChapter.mockResolvedValue({ id: 'chapter', curriculum_subject_id: 'mine', status: 'published' } as never);
    expect(await loadStudyCatalog('mine', 'other-chapter', 'topic')).toMatchObject({ chapters: [] });
    expect(api.getLatestContent).not.toHaveBeenCalled();
  });
  it('loads only the requested topic when opened from progress', async () => {
    api.getOutline.mockResolvedValue([{ topic: { id: 'chosen' }, lessons: [{ id: 'one' }] }, { topic: { id: 'other' }, lessons: [{ id: 'two' }] }] as never);
    api.getLatestContent.mockResolvedValue({ content: valid } as never);
    expect((await loadStudyContent('chapter', () => true, 'chosen')).lessons).toHaveLength(1);
    expect(api.getLatestContent).toHaveBeenCalledExactlyOnceWith('one');
  });
  it('bounds parallel requests and stops scheduling after navigation', async () => {
    api.getOutline.mockResolvedValue([{ lessons: Array.from({ length: 9 }, (_, id) => ({ id: String(id) })) }] as never);
    let active = true;
    let running = 0;
    let maximum = 0;
    api.getLatestContent.mockImplementation(async () => {
      running++;
      maximum = Math.max(maximum, running);
      await Promise.resolve();
      running--;
      active = false;
      return { content: valid } as never;
    });
    await loadStudyContent('chapter', () => active);
    expect(maximum).toBeLessThanOrEqual(4);
    expect(api.getLatestContent).toHaveBeenCalledTimes(4);
  });
});
