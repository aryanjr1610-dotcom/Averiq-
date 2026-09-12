import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AcademicUnavailableError, curriculumRepository } from '@/features/curriculum/repository';
import { offlinePackages } from '@/features/offline/packages';
import { loadReader, loadReaderVersion } from './load-reader';

vi.mock('@/features/curriculum/repository', () => ({ AcademicUnavailableError: class extends Error {}, curriculumRepository: { getReader: vi.fn(), getOutline: vi.fn(), getLatestContent: vi.fn(), requireReviewer: vi.fn() } }));
vi.mock('@/features/offline/packages', () => ({ offlinePackages: { readReader: vi.fn(), readChapterReader: vi.fn() } }));
const api = vi.mocked(curriculumRepository);
const offline = vi.mocked(offlinePackages);

describe('reader connectivity', () => {
  beforeEach(() => vi.resetAllMocks());
  it('opens a downloaded chapter without first requesting its online outline', async () => {
    const bundle = { subject: { code: 'english' }, chapter: { id: 'chapter' } };
    offline.readChapterReader.mockResolvedValue(bundle as never);
    expect(await loadReader({ chapterId: 'chapter', offline: true })).toEqual({ bundle, offlineCopy: true });
    expect(api.getOutline).not.toHaveBeenCalled();
  });
  it('uses cached versions for subsequent sections of a downloaded chapter', async () => {
    offline.readReader.mockResolvedValue({ version: { id: 'saved-version' } } as never);
    expect(await loadReaderVersion('lesson', false, true)).toEqual({ id: 'saved-version' });
    expect(api.getLatestContent).not.toHaveBeenCalled();
  });
  it('offers recovery instead of building an incomplete reader from a legacy download', async () => {
    offline.readReader.mockResolvedValue(null);
    await expect(loadReader({ lessonId: 'lesson', offline: true })).rejects.toThrow('download this chapter again');
  });
  it('does not replace explicit academic access denials with cached content', async () => {
    api.getReader.mockRejectedValue(new AcademicUnavailableError('Unavailable for your profile'));
    await expect(loadReader({ lessonId: 'lesson' })).rejects.toThrow('Unavailable for your profile');
    expect(offline.readReader).not.toHaveBeenCalled();
  });
  it('does not substitute published cache content for reviewer previews', async () => {
    api.getReader.mockRejectedValue(new Error('Network unavailable'));
    await expect(loadReader({ lessonId: 'lesson', preview: true })).rejects.toThrow('Network unavailable');
    expect(offline.readReader).not.toHaveBeenCalled();
  });
  it('recovers a network failure with a complete cached lesson', async () => {
    api.getReader.mockRejectedValue(new Error('Network unavailable'));
    offline.readReader.mockResolvedValue({ lesson: { id: 'lesson' } } as never);
    expect(await loadReader({ lessonId: 'lesson' })).toMatchObject({ offlineCopy: true, bundle: { lesson: { id: 'lesson' } } });
  });
});
