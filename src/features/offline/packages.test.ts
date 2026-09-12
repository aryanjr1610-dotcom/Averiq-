import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curriculumRepository } from '@/features/curriculum/repository';
import { offlineDb, STORES } from './db';
import { offlinePackages } from './packages';

vi.mock('@/features/curriculum/repository', () => ({ curriculumRepository: { getChapter: vi.fn(), getOutline: vi.fn(), getReader: vi.fn(), getLatestContent: vi.fn() } }));
vi.mock('./db', () => ({
  offlineAvailable: () => true, isQuotaError: () => false, formatBytes: () => '',
  STORES: { packages: 'packages', content: 'content' },
  offlineDb: { put: vi.fn(), get: vi.fn() },
}));
const api = vi.mocked(curriculumRepository);

describe('chapter download compatibility', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getChapter.mockResolvedValue({ id: 'chapter', title: 'Motion' } as never);
    api.getOutline.mockResolvedValue([{ lessons: [{ id: 'lesson', title: 'Speed' }] }] as never);
    api.getReader.mockResolvedValue({ subject: { code: 'physics' }, placement: { id: 'placement' }, release: { id: 'release' }, course: null } as never);
  });
  it('stores current published content in the existing offline document format', async () => {
    const content = { schemaVersion: 2, blocks: [] };
    api.getLatestContent.mockResolvedValue({ id: 'version-full-id', content } as never);
    const result = await offlinePackages.downloadChapter('chapter');
    expect(result).toMatchObject({ title: 'Motion', status: 'ready', version: '0|version-full-id' });
    expect(api.getLatestContent).toHaveBeenCalledWith('lesson');
    expect(offlineDb.put).toHaveBeenCalledWith(STORES.content, expect.objectContaining({ entityId: 'lesson', payload: expect.objectContaining({ title: 'Speed', document: content }) }));
    expect(offlineDb.put).toHaveBeenCalledWith(STORES.content, expect.objectContaining({ kind: 'chapter-context', payload: expect.objectContaining({ subject: { code: 'physics' } }) }));
  });
  it('does not mark an inaccessible or partially fetched chapter as ready', async () => {
    api.getOutline.mockResolvedValue([{ lessons: [{ id: 'one' }, { id: 'two' }] }] as never);
    api.getLatestContent.mockResolvedValueOnce({ id: 'version', content: {} } as never).mockRejectedValueOnce(new Error('Access denied'));
    await expect(offlinePackages.downloadChapter('chapter')).rejects.toThrow('Access denied');
    expect(offlineDb.put).not.toHaveBeenCalledWith(STORES.content, expect.anything());
    expect(offlineDb.put).toHaveBeenLastCalledWith(STORES.packages, expect.objectContaining({ status: 'failed' }));
  });
  it('rejects empty chapters without writing content', async () => {
    api.getOutline.mockResolvedValue([]);
    await expect(offlinePackages.downloadChapter('chapter')).rejects.toThrow('no lessons');
    expect(api.getLatestContent).not.toHaveBeenCalled();
  });
  it('does not restore a package whose download failed midway', async () => {
    vi.mocked(offlineDb.get).mockResolvedValueOnce({ packageId: 'chapter:chapter', payload: {} }).mockResolvedValueOnce({ status: 'failed' });
    expect(await offlinePackages.readReader('lesson')).toBeNull();
  });
});
